import { describe, expect, it } from "vitest";

import type { DocumentDraft } from "@/domain/models";

import {
  bodyHunks,
  editBody,
  editProperty,
  editTitle,
  initMerge,
  isResolved,
  pushBodyHunk,
  pushDocument,
  pushProperty,
  pushTitle,
  remainingOf,
  resetDocument,
  resolvedDrafts,
} from "./merge";
import {
  bodyBlocks,
  bodyFromParagraphs,
  bodyToPlainText,
} from "@/domain/document-body";

const description = (value: string) => ({
  id: "d",
  kind: "text" as const,
  key: "description",
  label: "설명",
  value,
});

const current: DocumentDraft = {
  title: "하린",
  body: bodyFromParagraphs("가\n\n나\n\n다"),
  properties: [description("정원사")],
};
const proposed: DocumentDraft = {
  title: "하린",
  body: bodyFromParagraphs("가\n\n나나\n\n다\n\n라"),
  properties: [
    description("기록단의 정원사"),
    {
      id: "r",
      kind: "relation",
      key: "related_character",
      label: "관련 캐릭터",
      targetType: "character",
      targetIds: ["teo"],
      descriptions: {},
    },
  ],
};

describe("merge", () => {
  const start = initMerge([{ fileId: "a", current, proposed }]);

  it("counts every differing row and body hunk", () => {
    expect(remainingOf(start, "a")).toBe(4);
    expect(isResolved(start, "a")).toBe(false);
  });

  it("resolves once every row has been pushed one way", () => {
    let state = pushProperty(start, "a", "description", "<<");
    state = pushProperty(state, "a", "related_character", ">>");
    for (;;) {
      const hunk = bodyHunks(state.left.get("a"), state.right.get("a")).find(
        (h) => !h.same,
      );
      if (!hunk) break;
      state = pushBodyHunk(state, "a", hunk, "<<");
    }
    expect(isResolved(state, "a")).toBe(true);
    const result = resolvedDrafts(state, [{ id: "p", fileId: "a" }]).p!;
    expect(bodyToPlainText(result.body)).toBe("가\n나나\n다\n라");
    expect(result.properties.map((p) => p.key)).toEqual(["description"]);
  });

  it("adopts or drops whole documents and can reset them", () => {
    const added = initMerge([{ fileId: "n", current: null, proposed }]);
    const taken = pushDocument(added, "n", "<<");
    expect(isResolved(taken, "n")).toBe(true);
    const dropped = pushDocument(added, "n", ">>");
    expect(isResolved(dropped, "n")).toBe(true);
    expect(resolvedDrafts(dropped, [{ id: "q", fileId: "n" }]).q).toBeNull();
    expect(resetDocument(dropped, "n", added).right.get("n")).toBe(proposed);
  });

  it("lets either side be edited in place until both sides match", () => {
    let state = editProperty(start, "a", "left", "description", {
      ...description("기록단의 정원사"),
    });
    state = editProperty(state, "a", "left", "related_character", {
      ...(proposed.properties[1] as Extract<
        DocumentDraft["properties"][number],
        { kind: "relation" }
      >),
    });
    expect(remainingOf(state, "a")).toBe(2);

    state = editBody(state, "a", "right", "가\n나\n다");
    expect(remainingOf(state, "a")).toBe(0);
  });

  it("treats an emptied value as no value", () => {
    const emptied = editProperty(start, "a", "right", "related_character", {
      ...(proposed.properties[1] as Extract<
        DocumentDraft["properties"][number],
        { kind: "relation" }
      >),
      targetIds: [],
    });
    const withDescription = pushProperty(emptied, "a", "description", "<<");
    const rows = bodyHunks(
      withDescription.left.get("a"),
      withDescription.right.get("a"),
    ).filter((h) => !h.same).length;
    expect(remainingOf(withDescription, "a")).toBe(rows);
  });

  it("keeps the blocks a body edit did not touch", () => {
    const heading = {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "가" }],
    };
    const doc: DocumentDraft = {
      ...current,
      body: {
        ...current.body,
        doc: {
          type: "doc",
          content: [heading, ...bodyBlocks(current.body).slice(1)],
        },
      },
    };
    const state = editBody(
      initMerge([{ fileId: "h", current: doc, proposed: doc }]),
      "h",
      "left",
      "가\n나 고침\n다",
    );
    const blocks = bodyBlocks(state.left.get("h")!.body);
    expect(blocks[0]).toBe(heading);
    expect(blocks.map((b) => b.type)).toEqual([
      "heading",
      "paragraph",
      "paragraph",
    ]);
    expect(bodyToPlainText(state.left.get("h")!.body)).toBe("가\n나 고침\n다");
  });

  it("edits and pushes titles", () => {
    const renamed = initMerge([
      { fileId: "t", current, proposed: { ...proposed, title: "정원사 하린" } },
    ]);
    expect(
      remainingOf(editTitle(renamed, "t", "left", "정원사 하린"), "t"),
    ).toBe(remainingOf(renamed, "t") - 1);
    expect(pushTitle(renamed, "t", ">>").right.get("t")!.title).toBe("하린");
  });
});
