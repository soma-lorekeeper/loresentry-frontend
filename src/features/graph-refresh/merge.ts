/**
 * 병합 상태 — 화살표를 눌러 값을 반대편으로 밀고, 두 쪽이 같아지면 끝난다.
 *
 * 실험 레포(graph-visualization/src/diff/merge.ts)의 설계를 그대로 따르되, 문서 모양을
 * 서비스의 DocumentDraft(제목·Markdown 본문·속성 목록)로 바꿨다.
 *
 * **git merge 와 같은 일만 한다.** 값을 밀어 넣을 뿐 어느 쪽이 옳은지는 판단하지
 * 않는다. 공통 조상이 없으므로 '충돌'이라는 개념도 없다 — 모든 줄은 그냥 "다른 줄"이고,
 * 사람이 한 줄씩 골라 양쪽을 같게 만들면 그것이 완료다.
 *
 * 양쪽 모두 직접 고칠 수 있다(TABLE_AND_LOGIC §7.5). 우측 AI안이 우선권을 갖지 않는다 —
 * 고친 쪽 문서 전체가 바뀌고, 화면은 그 값으로 다시 견준다.
 *
 * 서버 가정(DOCUMENT_EDITING_PROPOSAL §4.3, 미확정): 확정하면 왼쪽(현재 버전) 최종값을
 * 문서별로 모아 apply 에 넘긴다. 왼쪽에서 사라진 문서는 null(삭제)로 보낸다.
 */

import {
  blockToPlainText,
  bodyBlocks,
  bodyFromBlocks,
  bodyFromPlainText,
  emptyBody,
  type DocumentBody,
} from "@/domain/document-body";
import type { DocumentDraft, DocumentProperty } from "@/domain/models";

import { applyHunk, lineDiff, type Hunk } from "../diff/line-diff";

/** 좌·우 어느 쪽인가. 왼쪽이 현재 버전, 오른쪽이 재추출 결과다 */
export type SideName = "left" | "right";

/** 값을 미는 방향. `>>` 는 왼쪽 값을 오른쪽에 넣는다 */
export type Direction = "<<" | ">>";

export interface MergeState {
  left: ReadonlyMap<string, DocumentDraft>;
  right: ReadonlyMap<string, DocumentDraft>;
}

export interface MergeInput {
  fileId: string;
  current: DocumentDraft | null;
  proposed: DocumentDraft | null;
}

export function initMerge(inputs: readonly MergeInput[]): MergeState {
  const left = new Map<string, DocumentDraft>();
  const right = new Map<string, DocumentDraft>();
  for (const input of inputs) {
    if (input.current) left.set(input.fileId, input.current);
    if (input.proposed) right.set(input.fileId, input.proposed);
  }
  return { left, right };
}

/** 미는 방향에서 가져올 쪽과 받을 쪽 */
function ends(direction: Direction): { from: SideName; to: SideName } {
  return direction === ">>"
    ? { from: "left", to: "right" }
    : { from: "right", to: "left" };
}

/** 한쪽 지도만 갈아 끼운 새 상태 */
function replace(
  state: MergeState,
  side: SideName,
  docs: Map<string, DocumentDraft>,
): MergeState {
  return side === "left" ? { ...state, left: docs } : { ...state, right: docs };
}

/**
 * 받는 쪽에 문서가 아직 없을 때 세우는 빈 문서.
 *
 * 신원(제목)만 상대에게서 가져오고 나머지는 비운다 — 한쪽에만 있는 문서도 **다른
 * 문서와 똑같이 한 줄씩 골라 받을 수 있어야** 하기 때문이다.
 */
function blank(source: DocumentDraft): DocumentDraft {
  return { title: source.title, body: emptyBody(), properties: [] };
}

/** 본문을 견줄 때의 줄. 최상위 블록 하나가 한 줄이다 */
export function bodyLines(body: DocumentBody) {
  return bodyBlocks(body).map(blockToPlainText).join("\n");
}

/**
 * 줄 편집 결과를 다시 본문으로.
 *
 * 손대지 않은 블록은 **원래 블록 그대로** 남긴다. 한 문단을 고쳤다고 제목·목록·굵은 글씨까지
 * 평문으로 풀리면 안 된다. 바뀐 줄만 새 문단이 된다 — 줄 단위 편집으로는 서식을 알 수 없다.
 * 여러 줄을 차지하는 블록(목록, 줄바꿈이 든 문단)은 그 줄이 모두 그대로일 때만 살아남는다.
 */
function fromBodyLines(original: DocumentBody, text: string): DocumentBody {
  const blocks = bodyBlocks(original);
  const before = bodyLines(original);
  if (before === "") return bodyFromPlainText(text);

  /** 원래 글의 줄마다, 그 줄이 시작하는 블록과 블록이 차지하는 줄 수. 블록 첫 줄에만 있다 */
  const starts = new Map<
    number,
    { block: (typeof blocks)[number]; span: number }
  >();
  let line = 0;
  for (const block of blocks) {
    const span = blockToPlainText(block).split("\n").length;
    starts.set(line, { block, span });
    line += span;
  }

  const out: typeof blocks = [];
  const paragraph = (value: string) =>
    value.length === 0
      ? { type: "paragraph" }
      : { type: "paragraph", content: [{ type: "text", text: value }] };

  for (const hunk of lineDiff(before, text)) {
    if (!hunk.same) {
      out.push(...hunk.rightLines.map(paragraph));
      continue;
    }
    const end = hunk.leftStart + hunk.leftLines.length;
    for (let at = hunk.leftStart; at < end;) {
      const start = starts.get(at);
      if (start && at + start.span <= end) {
        out.push(start.block);
        at += start.span;
      } else {
        out.push(paragraph(hunk.leftLines[at - hunk.leftStart]));
        at += 1;
      }
    }
  }
  return bodyFromBlocks(out);
}

function sameProperty(
  a: DocumentProperty | undefined,
  b: DocumentProperty | undefined,
) {
  // 비어 있는 값은 없는 값과 같다. 한쪽에만 있던 관계의 대상을 모두 빼거나 설명을 지우면,
  // 화면에서는 두 쪽이 똑같이 비어 보이는데 '다르다'가 남아 끝낼 수 없게 된다.
  if (!a || !b) {
    const only = a ?? b;
    return (
      !only ||
      (only.kind === "text" ? only.value === "" : only.targetIds.length === 0)
    );
  }
  if (a.kind === "text" && b.kind === "text") return a.value === b.value;
  if (a.kind === "relation" && b.kind === "relation")
    return (
      a.targetIds.length === b.targetIds.length &&
      a.targetIds.every((id) => b.targetIds.includes(id))
    );
  return false;
}

/** 속성 줄의 차이. **화살표가 붙는 단위다** */
export interface PropertyRow {
  key: string;
  label: string;
  left: DocumentProperty | undefined;
  right: DocumentProperty | undefined;
  same: boolean;
}

export function propertyRows(
  left: DocumentDraft | undefined,
  right: DocumentDraft | undefined,
): PropertyRow[] {
  const leftProps = left?.properties ?? [];
  const rightProps = right?.properties ?? [];
  const keys = [
    ...leftProps.map((p) => p.key),
    ...rightProps
      .map((p) => p.key)
      .filter((key) => !leftProps.some((p) => p.key === key)),
  ];
  return keys.map((key) => {
    const a = leftProps.find((p) => p.key === key);
    const b = rightProps.find((p) => p.key === key);
    return {
      key,
      label: (a ?? b)?.label ?? key,
      left: a,
      right: b,
      same: sameProperty(a, b),
    };
  });
}

export function bodyHunks(
  left: DocumentDraft | undefined,
  right: DocumentDraft | undefined,
): Hunk[] {
  return lineDiff(
    bodyLines(left?.body ?? emptyBody()),
    bodyLines(right?.body ?? emptyBody()),
  );
}

/**
 * 속성 줄 하나를 통째로 반대편으로 민다.
 *
 * 관계는 줄 단위다 — 달라진 대상이 여럿이어도 한 번에 간다. 보내는 쪽에 그 속성이
 * 없으면 받는 쪽에서도 지운다.
 */
export function pushProperty(
  state: MergeState,
  docId: string,
  key: string,
  direction: Direction,
): MergeState {
  const { from, to } = ends(direction);
  const source = state[from].get(docId);
  if (!source) return state;

  const target = state[to].get(docId) ?? blank(source);
  const value = source.properties.find((p) => p.key === key);
  const others = target.properties.filter((p) => p.key !== key);
  const index = target.properties.findIndex((p) => p.key === key);
  const properties = value
    ? index >= 0
      ? target.properties.map((p) => (p.key === key ? value : p))
      : [...others, value]
    : others;

  const docs = new Map(state[to]);
  docs.set(docId, { ...target, properties });
  return replace(state, to, docs);
}

/**
 * 문서를 통째로 민다. 생성·삭제된 문서를 받거나 버릴 때 쓴다.
 *
 * **받기와 버리기가 같은 화살표의 두 방향이다.** 오른쪽에만 있는 문서를 `<<` 로 밀면
 * 왼쪽에 생기고(받기), `>>` 로 밀면 오른쪽에서 사라진다(버리기).
 */
export function pushDocument(
  state: MergeState,
  docId: string,
  direction: Direction,
): MergeState {
  const { from, to } = ends(direction);
  const source = state[from].get(docId);

  const docs = new Map(state[to]);
  if (source) docs.set(docId, source);
  else docs.delete(docId);
  return replace(state, to, docs);
}

/**
 * 본문의 **덩어리 하나**만 반대편에 맞춘다.
 *
 * 줄 번호가 아니라 덩어리를 그대로 받는 것은 반영하고 나면 뒤쪽 줄 번호가 밀리기
 * 때문이다 — 화면은 매번 새로 견주므로 그때의 덩어리를 넘기면 된다.
 */
export function pushBodyHunk(
  state: MergeState,
  docId: string,
  hunk: Hunk,
  direction: Direction,
): MergeState {
  const { from, to } = ends(direction);
  const source = state[from].get(docId);
  if (!source) return state;

  const target = state[to].get(docId) ?? blank(source);
  const start = to === "left" ? hunk.leftStart : hunk.rightStart;
  const removed = (to === "left" ? hunk.leftLines : hunk.rightLines).length;
  const lines = from === "left" ? hunk.leftLines : hunk.rightLines;

  const docs = new Map(state[to]);
  docs.set(docId, {
    ...target,
    body: fromBodyLines(
      target.body,
      applyHunk(bodyLines(target.body), start, removed, lines),
    ),
  });
  return replace(state, to, docs);
}

/** 제목을 반대편으로 민다 */
export function pushTitle(
  state: MergeState,
  docId: string,
  direction: Direction,
): MergeState {
  const { from, to } = ends(direction);
  const source = state[from].get(docId);
  const target = state[to].get(docId);
  if (!source || !target) return state;
  const docs = new Map(state[to]);
  docs.set(docId, { ...target, title: source.title });
  return replace(state, to, docs);
}

/** 한쪽 문서만 고쳐 쓴다. 그쪽에 문서가 없으면 고칠 것이 없다 */
function editDoc(
  state: MergeState,
  docId: string,
  side: SideName,
  change: (doc: DocumentDraft) => DocumentDraft,
): MergeState {
  const doc = state[side].get(docId);
  if (!doc) return state;
  const docs = new Map(state[side]);
  docs.set(docId, change(doc));
  return replace(state, side, docs);
}

/** 한쪽에서 제목을 그 자리에서 고쳐 쓴다 */
export function editTitle(
  state: MergeState,
  docId: string,
  side: SideName,
  title: string,
): MergeState {
  return editDoc(state, docId, side, (doc) => ({ ...doc, title }));
}

/**
 * 한쪽에서 속성 하나를 그 자리에서 고쳐 쓴다. `undefined` 면 그 속성을 지운다.
 *
 * 그쪽에 없던 속성이면 끝에 붙인다 — 반대편에만 있던 관계에 대상을 더하는 경우다.
 */
export function editProperty(
  state: MergeState,
  docId: string,
  side: SideName,
  key: string,
  value: DocumentProperty | undefined,
): MergeState {
  return editDoc(state, docId, side, (doc) => {
    const has = doc.properties.some((p) => p.key === key);
    const properties = !value
      ? doc.properties.filter((p) => p.key !== key)
      : has
        ? doc.properties.map((p) => (p.key === key ? value : p))
        : [...doc.properties, value];
    return { ...doc, properties };
  });
}

/** 한쪽 본문 전체를 고쳐 쓴 글로 바꾼다. 손대지 않은 블록의 서식은 남는다 */
export function editBody(
  state: MergeState,
  docId: string,
  side: SideName,
  text: string,
): MergeState {
  return editDoc(state, docId, side, (doc) => ({
    ...doc,
    body: fromBodyLines(doc.body, text),
  }));
}

/** 문서 하나를 한쪽 값으로 통째로 맞춘다. 문서 막대의 "현재/신규 버전 반영" */
export function adoptDocument(
  state: MergeState,
  docId: string,
  side: SideName,
): MergeState {
  return pushDocument(state, docId, side === "left" ? ">>" : "<<");
}

/**
 * 이 문서 하나만 처음 상태로 되돌린다.
 *
 * 되돌릴 길이 없으면 막다른 곳이 생긴다 — 오른쪽에만 있던 문서를 `>>` 로 버리면
 * 양쪽 모두에서 사라져, 다시 가져올 원본이 어디에도 없다. 처음 두 벌을 들고 있다가
 * 거기서 도로 꺼내 온다.
 */
export function resetDocument(
  state: MergeState,
  docId: string,
  start: MergeState,
): MergeState {
  const left = new Map(state.left);
  const right = new Map(state.right);

  const first = start.left.get(docId);
  if (first) left.set(docId, first);
  else left.delete(docId);

  const second = start.right.get(docId);
  if (second) right.set(docId, second);
  else right.delete(docId);

  return { left, right };
}

/** 두 쪽이 아직 다른 곳의 수. 속성 줄과 본문 덩어리를 함께 센다 */
export function remainingOf(state: MergeState, docId: string): number {
  const left = state.left.get(docId);
  const right = state.right.get(docId);
  if (!left && !right) return 0;
  if (!left || !right) return 1;
  return (
    propertyRows(left, right).filter((row) => !row.same).length +
    bodyHunks(left, right).filter((hunk) => !hunk.same).length +
    (left.title === right.title ? 0 : 1)
  );
}

/**
 * 이 문서의 두 쪽이 같아졌는가.
 *
 * 화살표를 눌러서든 전체 반영으로든 같아지기만 하면 해소다 — 어떻게 같아졌는지는
 * 묻지 않는다. 양쪽에서 다 지워진 것(버린 문서)도 해소로 친다.
 */
export function isResolved(state: MergeState, docId: string): boolean {
  return remainingOf(state, docId) === 0;
}

/**
 * 확정할 값. 제안 id 를 열쇠로, 왼쪽 최종값을 담는다. 왼쪽에서 사라졌으면 null 이다.
 *
 * 서버(RefreshService.apply)는 제안 단위로 결과를 받는다 — 새로 생길 문서는 아직
 * 파일 id 가 없기 때문이다.
 */
export function resolvedDrafts(
  state: MergeState,
  proposals: readonly { id: string; fileId: string }[],
): Record<string, DocumentDraft | null> {
  return Object.fromEntries(
    proposals.map((p) => [p.id, state.left.get(p.fileId) ?? null]),
  );
}
