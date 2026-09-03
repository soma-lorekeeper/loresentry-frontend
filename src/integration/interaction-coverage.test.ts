import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  INTERACTION_REGRESSION_COVERAGE,
  type RegressionGuarantee,
} from "./interaction-coverage";

describe("core interaction regression coverage", () => {
  it("maps every integrated feature to executable evidence", () => {
    expect(
      INTERACTION_REGRESSION_COVERAGE.map(({ feature }) => feature),
    ).toEqual([
      "file",
      "tab",
      "memo",
      "property",
      "timeline",
      "project",
      "account",
      "auth",
    ]);
  });

  it.each(INTERACTION_REGRESSION_COVERAGE)(
    "$feature keeps its named state transitions traceable",
    ({ evidence }) => {
      for (const item of evidence) {
        const source = readFileSync(join(process.cwd(), item.file), "utf8");
        for (const testName of item.testNames)
          expect(source).toContain(testName);
      }
    },
  );

  it("covers processing, errors, recovery, duplication, retained input, and focus", () => {
    const guarantees = new Set(
      INTERACTION_REGRESSION_COVERAGE.flatMap((entry) => entry.guarantees),
    );
    const required: RegressionGuarantee[] = [
      "success",
      "processing",
      "error",
      "recovery",
      "duplicate-prevention",
      "input-retention",
      "focus-return",
    ];
    expect([...guarantees].sort()).toEqual(required.sort());
  });
});
