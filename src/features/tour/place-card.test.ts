import { describe, expect, it } from "vitest";

import { placeCard } from "./place-card";

const card = { width: 320, height: 160 };
const viewport = { width: 1440, height: 900 };

describe("placeCard", () => {
  it("sits beside a sidebar item when there is room on the right", () => {
    const target = { left: 8, top: 120, width: 216, height: 34 };
    expect(placeCard(target, card, viewport, ["right", "bottom"])).toEqual({
      left: 238,
      top: 120,
    });
  });

  it("falls back to the next side that fits", () => {
    const target = { left: 400, top: 100, width: 1000, height: 200 };
    expect(placeCard(target, card, viewport, ["right", "bottom"])).toEqual({
      left: 400,
      top: 314,
    });
  });

  it("becomes a sheet on narrow screens, away from the target", () => {
    const narrow = { width: 390, height: 844 };
    const high = { left: 20, top: 100, width: 350, height: 200 };
    const low = { left: 20, top: 600, width: 350, height: 100 };
    expect(placeCard(high, card, narrow, ["right"]).top).toBe(844 - 160 - 12);
    expect(placeCard(low, card, narrow, ["right"]).top).toBe(12);
  });
});
