import type { Editor, JSONContent } from "@tiptap/core";
import { TextAlign } from "@tiptap/extension-text-align";
import type { EditorState } from "@tiptap/pm/state";

import { withoutEmptyFormat } from "./formatted-document";

/**
 * 문단 정렬.
 *
 * <p><b>어디에 담는가.</b> 정렬은 문단마다 다를 수 있어 글꼴·크기처럼 브라우저에 두지 않고
 * **문서 본문**에 담는다. 문단(paragraph)과 제목(heading) 노드의 `textAlign` 속성이다.
 *
 * <p><b>왼쪽은 적지 않는다.</b> 왼쪽 정렬은 속성이 비어 있는 것(null)이다. 정렬을 한 번도
 * 건드리지 않은 문서는 이 기능이 생기기 전과 같은 모양으로 저장된다.
 */
export type TextAlignment = "left" | "center" | "right" | "justify";

/** 정렬 속성을 갖는 노드. 목록·인용 안의 문단도 문단이라 함께 정렬된다. */
const ALIGNABLE = new Set(["paragraph", "heading"]);

/**
 * 고를 수 있는 정렬과 그 단축키(Mod+Shift+글자). 도구 막대의 호버 설명도 이 표를 읽는다 —
 * 따로 적으면 화면에 적힌 키와 실제로 듣는 키가 어긋난다.
 */
export const TEXT_ALIGNMENTS: ReadonlyArray<{
  id: TextAlignment;
  key: string;
}> = [
  { id: "left", key: "l" },
  { id: "center", key: "e" },
  { id: "right", key: "r" },
  { id: "justify", key: "j" },
];

/**
 * 정렬을 바꾼다.
 *
 * <p>고른 글이 없으면(커서만 있으면) **문서의 모든 문단**을, 끌어서 고른 글이 있으면
 * **그 문단들만** 바꾼다. 한 번의 변경으로 묶이므로 되돌리기도 한 번이다.
 */
export function setAlignment(editor: Editor, alignment: TextAlignment) {
  const value = alignment === "left" ? null : alignment;
  return editor
    .chain()
    .focus()
    .command(({ tr, state, dispatch }) => {
      const { empty, from, to } = state.selection;
      const [start, end] = empty ? [0, state.doc.content.size] : [from, to];
      if (dispatch) {
        state.doc.nodesBetween(start, end, (node, pos) => {
          // 목록·인용 같은 묶음은 안으로 더 들어가 문단을 찾는다.
          if (!ALIGNABLE.has(node.type.name)) return true;
          if (node.attrs.textAlign !== value) {
            tr.setNodeAttribute(pos, "textAlign", value);
          }
          // 문단 안에는 글자뿐이라 더 들어갈 것이 없다.
          return false;
        });
      }
      return true;
    })
    .run();
}

/**
 * 지금 고른 범위(없으면 커서가 있는 문단)의 정렬.
 *
 * <p>범위 안의 문단들이 서로 다르게 정렬돼 있으면 `null` 이다 — 도구 막대는 그때 아무 정렬도
 * 눌린 것으로 그리지 않는다.
 */
export function alignmentOf(state: EditorState): TextAlignment | null {
  const found = new Set<TextAlignment>();
  const { from, to } = state.selection;
  state.doc.nodesBetween(from, to, (node) => {
    if (!ALIGNABLE.has(node.type.name)) return true;
    found.add((node.attrs.textAlign as TextAlignment | null) ?? "left");
    return false;
  });
  // 문단이 없는 자리(구분선만 고른 경우 등)는 왼쪽으로 본다.
  if (found.size === 0) return "left";
  return found.size === 1 ? [...found][0] : null;
}

/**
 * 에디터 확장. 속성의 읽기·쓰기(`style="text-align: …"`)는 Tiptap 의 TextAlign 을 그대로 쓰고,
 * 단축키만 {@link setAlignment} 를 부르도록 바꾼다 — 도구 막대의 단추와 같은 규칙(고른 글이
 * 없으면 문서 전체)으로 움직여야 하기 때문이다.
 */
export const DocumentTextAlign = TextAlign.extend({
  addKeyboardShortcuts() {
    return Object.fromEntries(
      TEXT_ALIGNMENTS.map(({ id, key }) => [
        `Mod-Shift-${key}`,
        () => setAlignment(this.editor, id),
      ]),
    );
  },
}).configure({
  types: [...ALIGNABLE],
  // 읽어 들일 때 받는 값. 왼쪽을 빼 두면 붙여 넣은 글의 `text-align: left` 가 빈 값으로 읽힌다 —
  // "왼쪽은 적지 않는다" 가 붙여 넣은 문단에도 지켜진다.
  alignments: ["center", "right", "justify"],
});

/**
 * 에디터의 문서를 저장할 모양으로 꺼낸다.
 *
 * <p>정렬 속성을 달아 두면 에디터는 정렬하지 않은 문단에도 `attrs: { textAlign: null }` 을 적어
 * 내놓는다. 그대로 저장하면 이 기능이 생기기 전에 쓴 문단 전부가 "바뀐 문단" 이 된다 — 버전 비교와
 * 문단 단위 병합은 블록을 직렬화한 값으로 비교하기 때문이다(domain/document-body.ts 의
 * `sameBlock`). 그래서 비어 있는 정렬은 적지 않는다.
 */
export function documentJSON(editor: Editor): JSONContent {
  return withoutEmptyFormat(withoutEmptyAlign(editor.getJSON()));
}

function withoutEmptyAlign(node: JSONContent): JSONContent {
  let next = node;
  if (node.attrs && "textAlign" in node.attrs && node.attrs.textAlign == null) {
    const attrs = Object.fromEntries(
      Object.entries(node.attrs).filter(([key]) => key !== "textAlign"),
    );
    next = { ...node };
    // 문단은 정렬 말고는 속성이 없다. 빈 `attrs` 를 남기면 그것도 예전 모양과 달라진다.
    if (Object.keys(attrs).length > 0) next.attrs = attrs;
    else delete next.attrs;
  }
  if (next.content) {
    next = { ...next, content: next.content.map(withoutEmptyAlign) };
  }
  return next;
}
