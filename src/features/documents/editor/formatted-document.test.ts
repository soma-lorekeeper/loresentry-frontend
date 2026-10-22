import { Editor, type JSONContent } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { createDocumentExtensions } from "./extensions";
import { replaceDocument, setDocumentFormat } from "./formatted-document";
import { documentJSON } from "./text-align";

let editor: Editor;

const paragraph = (text: string): JSONContent => ({
  type: "paragraph",
  content: [{ type: "text", text }],
});

function open(doc: JSONContent) {
  editor = new Editor({ extensions: createDocumentExtensions(), content: doc });
  return editor;
}

afterEach(() => editor?.destroy());

describe("document format", () => {
  it("keeps a document without a format in its old shape", () => {
    const doc = { type: "doc", content: [paragraph("첫 문단")] };
    open(doc);

    expect(documentJSON(editor)).toEqual(doc);
  });

  it("stores the format on the document itself", () => {
    open({ type: "doc", content: [paragraph("첫 문단")] });

    setDocumentFormat(editor, {
      font: "nanum-myeongjo",
      fontSize: 12,
      lineHeight: 1.78,
    });

    expect(documentJSON(editor)).toEqual({
      type: "doc",
      attrs: { font: "nanum-myeongjo", fontSize: 12, lineHeight: 1.78 },
      content: [paragraph("첫 문단")],
    });
  });

  it("reads the format back when a document is opened", () => {
    const doc = {
      type: "doc",
      attrs: { font: "georgia", fontSize: 14, lineHeight: 2 },
      content: [paragraph("첫 문단")],
    };
    open(doc);

    expect(documentJSON(editor)).toEqual(doc);
  });

  it("undoes a format change like any other edit", () => {
    open({ type: "doc", content: [paragraph("첫 문단")] });
    setDocumentFormat(editor, { font: "mono", fontSize: 16, lineHeight: 2 });

    editor.commands.undo();

    expect(documentJSON(editor).attrs).toBeUndefined();
  });

  it("takes the format of a document loaded over the open one", () => {
    open({
      type: "doc",
      attrs: { font: "georgia", fontSize: 14, lineHeight: 2 },
      content: [paragraph("예전 본문")],
    });
    let updates = 0;
    editor.on("update", () => (updates += 1));

    replaceDocument(editor, { type: "doc", content: [paragraph("새 본문")] });

    expect(documentJSON(editor)).toEqual({
      type: "doc",
      content: [paragraph("새 본문")],
    });
    expect(updates).toBe(0);
  });
});
