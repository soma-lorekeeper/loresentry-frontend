import { Editor, type JSONContent } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { createDocumentExtensions } from "./extensions";
import { alignmentOf, documentJSON, setAlignment } from "./text-align";

let editor: Editor;

/** 문단 셋(첫째는 제목)짜리 문서로 에디터를 연다. */
function open(content?: JSONContent[]) {
  editor = new Editor({
    extensions: createDocumentExtensions(),
    content: {
      type: "doc",
      content: content ?? [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "1장" }],
        },
        { type: "paragraph", content: [{ type: "text", text: "첫 문단" }] },
        { type: "paragraph", content: [{ type: "text", text: "둘째 문단" }] },
      ],
    },
  });
  return editor;
}

const aligns = () =>
  (documentJSON(editor).content ?? []).map(
    (block) => block.attrs?.textAlign ?? "left",
  );

afterEach(() => editor?.destroy());

describe("setAlignment", () => {
  it("aligns every paragraph when nothing is selected", () => {
    open();
    // 커서만 둘째 블록에 있다.
    editor.commands.setTextSelection(6);

    setAlignment(editor, "center");

    expect(aligns()).toEqual(["center", "center", "center"]);
  });

  it("aligns only the selected paragraphs when some text is selected", () => {
    open();
    // 첫 문단 안의 글자 일부만 끌어 고른다.
    editor.commands.setTextSelection({ from: 6, to: 8 });

    setAlignment(editor, "right");

    expect(aligns()).toEqual(["left", "right", "left"]);
  });

  it("reaches paragraphs inside a list", () => {
    open([
      {
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "서윤" }] },
            ],
          },
        ],
      },
    ]);

    setAlignment(editor, "justify");

    expect(JSON.stringify(documentJSON(editor))).toContain(
      '"textAlign":"justify"',
    );
  });

  it("undoes a whole-document alignment in one step", () => {
    open();
    setAlignment(editor, "center");

    editor.commands.undo();

    expect(aligns()).toEqual(["left", "left", "left"]);
  });
});

describe("alignmentOf", () => {
  it("reads the paragraph under the cursor", () => {
    open();
    editor.commands.setTextSelection({ from: 6, to: 8 });
    setAlignment(editor, "center");

    expect(alignmentOf(editor.state)).toBe("center");
    editor.commands.setTextSelection(2);
    expect(alignmentOf(editor.state)).toBe("left");
  });

  it("is null when the selection spans paragraphs aligned differently", () => {
    open();
    editor.commands.setTextSelection({ from: 6, to: 8 });
    setAlignment(editor, "center");

    editor.commands.selectAll();

    expect(alignmentOf(editor.state)).toBeNull();
  });
});

/**
 * 정렬하지 않은 문단은 이 기능이 생기기 전과 **같은 모양**으로 저장돼야 한다. 다르면 버전 비교와
 * 문단 단위 병합이 손대지 않은 문단까지 바뀐 것으로 본다(직렬화 값으로 비교하므로).
 */
describe("documentJSON", () => {
  it("writes untouched paragraphs exactly as before alignment existed", () => {
    open();

    expect(documentJSON(editor).content).toEqual([
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "1장" }],
      },
      { type: "paragraph", content: [{ type: "text", text: "첫 문단" }] },
      { type: "paragraph", content: [{ type: "text", text: "둘째 문단" }] },
    ]);
  });

  it("goes back to the original shape when alignment is set to left again", () => {
    open();
    const before = JSON.stringify(documentJSON(editor));
    setAlignment(editor, "center");
    expect(JSON.stringify(documentJSON(editor))).not.toBe(before);

    setAlignment(editor, "left");

    expect(JSON.stringify(documentJSON(editor))).toBe(before);
  });

  it("keeps a stored alignment when the document is opened again", () => {
    open([
      {
        type: "paragraph",
        attrs: { textAlign: "right" },
        content: [{ type: "text", text: "끝" }],
      },
    ]);

    expect(aligns()).toEqual(["right"]);
    expect(editor.getHTML()).toContain("text-align: right");
  });
});
