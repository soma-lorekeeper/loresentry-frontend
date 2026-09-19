import { describe, expect, it } from "vitest";

import type { DocumentDraft } from "@/domain/models";

import {
  bodyHunks,
  initMerge,
  isResolved,
  pushBodyHunk,
  pushDocument,
  pushProperty,
  remainingOf,
  resetDocument,
  resolvedDrafts,
} from "./merge";

const description = (value: string) => ({
  id: "d",
  kind: "text" as const,
  key: "description",
  label: "설명",
  value,
});

const current: DocumentDraft = {
  title: "하린",
  bodyMd: "가\n\n나\n\n다",
  properties: [description("정원사")],
};
const proposed: DocumentDraft = {
  title: "하린",
  bodyMd: "가\n\n나나\n\n다\n\n라",
  properties: [
    description("기록단의 정원사"),
    {
      id: "r",
      kind: "relation",
      key: "related_character",
      label: "관련 캐릭터",
      targetType: "character",
      targetIds: ["teo"],
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
    expect(result.bodyMd).toBe("가\n\n나나\n\n다\n\n라");
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
});
