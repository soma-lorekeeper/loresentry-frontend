import { describe, expect, it } from "vitest";

import { bodyOf, sameBlock, sameBody } from "./document-body";

describe("document JSON equality", () => {
  it("treats a server's reordered object keys as the same paragraph", () => {
    const editor = {
      type: "paragraph",
      attrs: { textAlign: "left" },
      content: [{ type: "text", text: "같은 문장" }],
    };
    const server = {
      content: [{ text: "같은 문장", type: "text" }],
      attrs: { textAlign: "left" },
      type: "paragraph",
    };
    expect(sameBlock(editor, server)).toBe(true);
    expect(
      sameBody(
        bodyOf({ type: "doc", content: [editor] }),
        bodyOf({ content: [server], type: "doc" }),
      ),
    ).toBe(true);
    expect(
      sameBlock(editor, { ...server, attrs: { textAlign: "right" } }),
    ).toBe(false);
  });

  it("preserves the order and values of document content", () => {
    const first = {
      type: "paragraph",
      content: [{ type: "text", text: "첫째" }],
    };
    const last = {
      type: "paragraph",
      content: [{ type: "text", text: "둘째" }],
    };
    expect(
      sameBody(
        bodyOf({ type: "doc", content: [first, last] }),
        bodyOf({ type: "doc", content: [last, first] }),
      ),
    ).toBe(false);
  });
});
