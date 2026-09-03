import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  ACCESSIBILITY_COVERAGE,
  type AccessibilityGuarantee,
} from "./accessibility-coverage";

describe("integrated accessibility coverage", () => {
  it("maps every representative interaction flow", () => {
    expect(ACCESSIBILITY_COVERAGE.map(({ flow }) => flow)).toEqual([
      "global-navigation",
      "menu",
      "dialog",
      "form",
      "async-status",
      "destructive-action",
    ]);
  });

  it.each(ACCESSIBILITY_COVERAGE)(
    "$flow keeps its accessibility evidence executable",
    ({ evidence }) => {
      for (const item of evidence) {
        const source = readFileSync(join(process.cwd(), item.file), "utf8");
        for (const testName of item.testNames)
          expect(source).toContain(testName);
      }
    },
  );

  it("covers automated audits, full keyboard focus, announcements, and non-color cues", () => {
    const guarantees = new Set(
      ACCESSIBILITY_COVERAGE.flatMap((entry) => entry.guarantees),
    );
    const required: AccessibilityGuarantee[] = [
      "automated-audit",
      "focus-return",
      "focus-trap",
      "focus-visible",
      "keyboard-only",
      "non-color-cue",
      "screen-reader-status",
    ];

    expect([...guarantees].sort()).toEqual(required.sort());
  });

  it("does not accept an interaction flow without an automated audit", () => {
    for (const entry of ACCESSIBILITY_COVERAGE) {
      expect(entry.guarantees, entry.flow).toContain("automated-audit");
    }
  });
});
