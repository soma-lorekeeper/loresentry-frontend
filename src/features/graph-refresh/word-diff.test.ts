import { describe, expect, it } from "vitest";

import { wordDiff } from "./word-diff";

const marked = (segments: { text: string; changed: boolean }[]) =>
  segments.filter((s) => s.changed).map((s) => s.text);

describe("wordDiff", () => {
  it("marks only the words that differ", () => {
    const diff = wordDiff(
      "북쪽 온실을 관리하는 정원사",
      "북쪽 온실의 문이 열린 뒤 기록단에 합류한 정원사",
    )!;
    expect(marked(diff.left)).toEqual(["온실을 관리하는"]);
    expect(marked(diff.right)).toEqual(["온실의 문이 열린 뒤 기록단에 합류한"]);
    expect(diff.left.map((s) => s.text).join("")).toBe(
      "북쪽 온실을 관리하는 정원사",
    );
  });

  it("leaves lines that barely overlap unmarked", () => {
    expect(wordDiff("가 나 다 라", "마 바 사 아")).toBeNull();
    expect(wordDiff("", "새 문장")).toBeNull();
    expect(wordDiff("같은 줄", "같은 줄")).toBeNull();
  });
});
