import { describe, expect, it } from "vitest";

import { mergeParagraphs } from "./merge-text";

describe("mergeParagraphs", () => {
  const base = "첫 문단\n\n둘째 문단\n\n셋째 문단";

  it("merges edits to different paragraphs", () => {
    const mine = "첫 문단 고침\n\n둘째 문단\n\n셋째 문단";
    const theirs = "첫 문단\n\n둘째 문단\n\n셋째 문단 고침";
    expect(mergeParagraphs(base, mine, theirs)).toEqual({
      ok: true,
      text: "첫 문단 고침\n\n둘째 문단\n\n셋째 문단 고침",
    });
  });

  it("refuses to guess when both sides edit the same paragraph", () => {
    const mine = "첫 문단 A\n\n둘째 문단\n\n셋째 문단";
    const theirs = "첫 문단 B\n\n둘째 문단\n\n셋째 문단";
    expect(mergeParagraphs(base, mine, theirs)).toEqual({ ok: false });
  });

  it("takes the only changed side", () => {
    expect(mergeParagraphs(base, base, "바뀜")).toEqual({
      ok: true,
      text: "바뀜",
    });
  });
});
