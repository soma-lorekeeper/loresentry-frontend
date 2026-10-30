import { Extension, type Editor, type JSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState } from "@tiptap/pm/state";

import type { DocumentBody } from "@/domain/document-body";

/**
 * 중요 설정. 설정 문서에서 작가가 고른 문단으로, 설정 오류 점검이 꼭 지킬 사실로 읽는다.
 *
 * <p>본문 JSON 의 **최상위** 문단·제목에 `attrs.core: true` 로 담는다. 서버(content)도 최상위 블록만
 * 중요 설정으로 보므로 목록·인용 안의 문단에는 달지 않는다. 풀 때는 `false` 를 적지 않고 속성을
 * 지운다 — 표시하지 않은 문단은 이 기능이 생기기 전과 같은 모양이어야 버전 비교와 병합이 그 문단을
 * 바뀐 것으로 보지 않는다.
 */
const CORE_TYPES = new Set(["paragraph", "heading"]);

export const CoreSetting = Extension.create({
  name: "coreSetting",

  addGlobalAttributes() {
    return [
      {
        types: [...CORE_TYPES],
        attributes: {
          core: {
            default: null,
            keepOnSplit: false,
            parseHTML: (element) =>
              element.getAttribute("data-core") === "true" ? true : null,
            renderHTML: (attributes) =>
              attributes.core === true ? { "data-core": "true" } : {},
          },
        },
      },
    ];
  },
});

export function isCoreBlock(node: JSONContent): boolean {
  return CORE_TYPES.has(node.type ?? "") && node.attrs?.core === true;
}

export function coreBlockCount(body: DocumentBody): number {
  return (body.doc.content ?? []).filter(isCoreBlock).length;
}

/**
 * 고른 범위가 닿는 최상위 블록. 모두 문단·제목이어야 표시할 수 있다 — 목록·인용 안을 골랐거나
 * 그런 블록이 끼어 있으면 null 이다.
 */
export function coreTargetsOf(state: EditorState): {
  positions: number[];
  marked: boolean;
} | null {
  const { doc, selection } = state;
  const $from = selection.$from;
  const $to = selection.$to;
  if ($from.depth > 1 || $to.depth > 1) return null;
  const first = $from.index(0);
  let last = $to.index(0);
  if (last > first && $to.parentOffset === 0 && !selection.empty) last -= 1;
  if (last >= doc.childCount) last = doc.childCount - 1;

  const positions: number[] = [];
  let marked = true;
  let offset = 0;
  for (let index = 0; index < doc.childCount; index += 1) {
    const child: ProseMirrorNode = doc.child(index);
    if (index >= first && index <= last) {
      if (!CORE_TYPES.has(child.type.name)) return null;
      positions.push(offset);
      if (child.attrs.core !== true) marked = false;
    }
    offset += child.nodeSize;
  }
  return positions.length ? { positions, marked } : null;
}

/** 고른 문단들을 모두 표시하거나, 이미 모두 표시돼 있으면 모두 푼다 */
export function toggleCore(editor: Editor): boolean {
  const targets = coreTargetsOf(editor.state);
  if (!targets || !editor.isEditable) return false;
  const value = targets.marked ? null : true;
  return editor
    .chain()
    .command(({ tr, dispatch }) => {
      if (dispatch) {
        for (const position of targets.positions)
          tr.setNodeAttribute(position, "core", value);
      }
      return true;
    })
    .run();
}

/**
 * 저장할 본문에서 중요 설정 표시를 고른다. 최상위 문단·제목의 `true` 만 남기고, 그 밖의 자리(목록
 * 안, 붙여 넣은 HTML 의 흔적)와 비어 있는 값은 지운다.
 */
export function normalizeCore(doc: JSONContent): JSONContent {
  if (!doc.content) return doc;
  return {
    ...doc,
    content: doc.content.map((block) =>
      withoutCore(block, CORE_TYPES.has(block.type ?? "")),
    ),
  };
}

function withoutCore(node: JSONContent, topLevel: boolean): JSONContent {
  let next = node;
  if (node.attrs && "core" in node.attrs) {
    const keep = topLevel && node.attrs.core === true;
    if (!keep) {
      const attrs = Object.fromEntries(
        Object.entries(node.attrs).filter(([key]) => key !== "core"),
      );
      next = { ...node };
      if (Object.keys(attrs).length > 0) next.attrs = attrs;
      else delete next.attrs;
    }
  }
  if (next.content) {
    next = {
      ...next,
      content: next.content.map((child) => withoutCore(child, false)),
    };
  }
  return next;
}
