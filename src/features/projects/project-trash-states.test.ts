import { describe, expect, it } from "vitest";

import {
  getProjectTrashScenario,
  PROJECT_TRASH_SCREEN_STATES,
  resolveProjectTrashStateId,
} from "./project-trash-states";

describe("project trash screen registry", () => {
  it("maps Pencil screens 111–122 exactly once and in order", () => {
    expect(PROJECT_TRASH_SCREEN_STATES).toHaveLength(12);
    expect(
      PROJECT_TRASH_SCREEN_STATES.map((state) => state.screenNumber),
    ).toEqual(Array.from({ length: 12 }, (_, index) => 111 + index));
    expect(
      new Set(PROJECT_TRASH_SCREEN_STATES.map((state) => state.pencilNodeId)),
    ).toHaveProperty("size", 12);
    expect(
      PROJECT_TRASH_SCREEN_STATES.map((state) => state.pencilNodeId),
    ).toEqual([
      "WYBJQ",
      "yvfHX",
      "FogDw",
      "r5UPt",
      "tErn6",
      "ISCdJ",
      "tTF2Z",
      "xjwox",
      "BJyvs",
      "l8tEHq",
      "tsGQR",
      "xI1cj",
    ]);
  });

  it("resolves every route state and rejects unknown values", () => {
    for (const state of PROJECT_TRASH_SCREEN_STATES) {
      expect(resolveProjectTrashStateId(state.id)).toBe(state.id);
      expect(getProjectTrashScenario(state.id)).toMatchObject(state);
    }
    expect(resolveProjectTrashStateId("unknown")).toBeUndefined();
    expect(resolveProjectTrashStateId(null)).toBeUndefined();
  });
});
