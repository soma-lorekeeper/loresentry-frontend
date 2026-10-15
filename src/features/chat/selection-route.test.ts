import { describe, expect, it } from "vitest";

import { selectionTarget } from "./selection-route";

describe("selectionTarget", () => {
  it("adds to the conversation that is open on screen", () => {
    expect(selectionTarget(true, { kind: "session", id: "s-1" })).toBe("s-1");
  });

  it("starts a new conversation when none is open", () => {
    expect(selectionTarget(true, { kind: "home" })).toBeNull();
    expect(selectionTarget(false, { kind: "session", id: "s-1" })).toBeNull();
    expect(selectionTarget(false, { kind: "home" })).toBeNull();
  });
});
