import { describe, expect, it } from "vitest";

import { compareBodies, compareProperties } from "./compare";

describe("version compare", () => {
  it("aligns changed paragraphs side by side", () => {
    const rows = compareBodies("가\n\n나\n\n다", "가\n\n나나\n\n다");
    expect(rows).toEqual([
      { left: "가", right: "가", changed: false },
      { left: "나", right: "나나", changed: true },
      { left: "다", right: "다", changed: false },
    ]);
  });

  it("pads the shorter side when paragraphs were added", () => {
    const rows = compareBodies("가", "가\n\n나");
    expect(rows[1]).toEqual({ left: null, right: "나", changed: true });
  });

  it("splits relations into one row per target", () => {
    const rows = compareProperties(
      [
        {
          id: "1",
          kind: "relation",
          key: "manuscripts",
          label: "관련 원고",
          targetType: "manuscript",
          targetIds: ["a"],
        },
      ],
      [
        {
          id: "1",
          kind: "relation",
          key: "manuscripts",
          label: "관련 원고",
          targetType: "manuscript",
          targetIds: ["a", "b"],
        },
      ],
    );
    expect(rows.map((row) => [row.label, row.changed])).toEqual([
      ["관련 원고", false],
      [null, true],
    ]);
    expect(rows[1].left).toEqual({ kind: "missing" });
  });
});
