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

  it("marks a relation row as changed when only the description differs", () => {
    const relation = (descriptions?: Record<string, string>) => ({
      id: "1",
      kind: "relation" as const,
      key: "manuscripts",
      label: "관련 원고",
      targetType: "manuscript" as const,
      targetIds: ["a"],
      descriptions,
    });
    const rows = compareProperties(
      [relation({ a: "길잡이" })],
      [relation({ a: "동료" })],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].changed).toBe(true);
    expect(rows[0].left).toEqual({
      kind: "relation",
      targetId: "a",
      description: "길잡이",
    });
  });
});
