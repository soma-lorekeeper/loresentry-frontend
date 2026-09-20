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
 * 와이어프레임 결정: 덩어리 밖을 직접 고쳐 쓰는 편집은 두지 않는다. 실험 레포의
 * editSingle·editList 는 옮기지 않았다.
 *
 * 서버 가정(DOCUMENT_EDITING_PROPOSAL §4.3, 미확정): 확정하면 왼쪽(현재 버전) 최종값을
 * 문서별로 모아 apply 에 넘긴다. 왼쪽에서 사라진 문서는 null(삭제)로 보낸다.
 */

import type { DocumentDraft, DocumentProperty } from "@/domain/models";
import { paragraphsOf } from "@/features/versions/compare";

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
  return { title: source.title, bodyMd: "", properties: [] };
}

/** 본문을 견줄 때의 줄. 문단 하나가 한 줄이다 */
export function bodyLines(markdown: string) {
  return paragraphsOf(markdown).join("\n");
}

function fromBodyLines(text: string) {
  return text === "" ? "" : text.split("\n").join("\n\n");
}

function sameProperty(
  a: DocumentProperty | undefined,
  b: DocumentProperty | undefined,
) {
  if (!a || !b) return a === b;
  if (a.kind === "text" && b.kind === "text") return a.value === b.value;
  if (a.kind === "relation" && b.kind === "relation")
    return (
      a.targetIds.length === b.targetIds.length &&
      a.targetIds.every(
        (id) =>
          b.targetIds.includes(id) &&
          (a.descriptions?.[id] ?? "") === (b.descriptions?.[id] ?? ""),
      )
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
    bodyLines(left?.bodyMd ?? ""),
    bodyLines(right?.bodyMd ?? ""),
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
    bodyMd: fromBodyLines(
      applyHunk(bodyLines(target.bodyMd), start, removed, lines),
    ),
  });
  return replace(state, to, docs);
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
