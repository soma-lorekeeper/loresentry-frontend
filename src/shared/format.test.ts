import { describe, expect, it } from "vitest";

import {
  countCharacters,
  dottedDate,
  initialsOf,
  relativeTime,
} from "./format";

const now = new Date(2026, 8, 18, 15, 0).getTime();
const ago = (ms: number) => new Date(now - ms).toISOString();

describe("format", () => {
  it("describes recent work the way the wireframes do", () => {
    expect(relativeTime(ago(12 * 60_000), now)).toBe("12분 전");
    expect(relativeTime(ago(26 * 3600_000), now)).toBe("어제");
    expect(relativeTime(new Date(2026, 7, 28, 10).toISOString(), now)).toBe(
      "8월 28일",
    );
  });

  it("formats trash dates and initials", () => {
    expect(dottedDate(new Date(2026, 7, 31).toISOString())).toBe(
      "2026. 8. 31.",
    );
    expect(initialsOf("이승주")).toBe("승주");
    expect(initialsOf("Mira On")).toBe("MI");
  });

  it("counts characters with and without spaces", () => {
    expect(countCharacters("가 나\n다")).toEqual({
      withSpaces: 4,
      withoutSpaces: 3,
    });
  });
});
