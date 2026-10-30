import type { Editor } from "@tiptap/core";

/** 본문 요소 → 그 에디터. 본문 밖에서 뜨는 선택 막대가 고른 글의 문서에 명령을 보낼 때 쓴다 */
const editors = new WeakMap<Element, Editor>();

export function registerEditor(editor: Editor) {
  const dom = editor.view.dom;
  editors.set(dom, editor);
  return () => {
    if (editors.get(dom) === editor) editors.delete(dom);
  };
}

export function editorOf(element: Element | null | undefined): Editor | null {
  return (element && editors.get(element)) ?? null;
}
