import { describe, expect, it } from "vitest";

import { EN } from "./en";
import { LOCALE } from "./locale";
import { t } from "./t";

describe("t (English build)", () => {
  it("is built for English", () => {
    expect(LOCALE).toBe("en");
  });

  it("translates every key without leaving Korean behind", () => {
    const korean = Object.keys(EN).filter((key) => {
      const text = t(key as Parameters<typeof t>[0], { count: 2, name: "x" });
      return /[가-힣]/.test(text);
    });
    expect(korean).toEqual([]);
  });
});
