import { describe, expect, it } from "vitest";

import { validateProjectTitle } from "./project-model";

describe("validateProjectTitle", () => {
  it("validates the trimmed 1–255 character title boundary", () => {
    expect(validateProjectTitle("   ")).toBe("required");
    expect(validateProjectTitle("가".repeat(255))).toBeUndefined();
    expect(validateProjectTitle(`  ${"가".repeat(256)}  `)).toBe("too-long");
  });
});
