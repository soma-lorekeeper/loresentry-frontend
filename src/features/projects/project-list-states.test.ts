import { describe, expect, it } from "vitest";

import {
  createProjectListScenario,
  PROJECT_LIST_SCREEN_STATES,
  resolveProjectListStateId,
} from "./project-list-states";

describe("project list screen registry", () => {
  it("maps Pencil screens 91–110 exactly once", () => {
    expect(PROJECT_LIST_SCREEN_STATES).toHaveLength(20);
    expect(
      new Set(PROJECT_LIST_SCREEN_STATES.map((state) => state.screenNumber))
        .size,
    ).toBe(20);
    expect(
      PROJECT_LIST_SCREEN_STATES.map((state) => state.screenNumber),
    ).toEqual(Array.from({ length: 20 }, (_, index) => 91 + index));
    expect(
      new Set(PROJECT_LIST_SCREEN_STATES.map((state) => state.pencilNodeId))
        .size,
    ).toBe(20);
  });

  it("resolves only registered state ids and creates explicit scenarios", () => {
    expect(resolveProjectListStateId("project-trash-error")).toBe(
      "project-trash-error",
    );
    expect(resolveProjectListStateId("unknown")).toBeUndefined();
    expect(
      createProjectListScenario("create-project-submitting").createState,
    ).toBe("submitting");
    expect(
      createProjectListScenario("rename-project-save-error").renameState,
    ).toBe("error");
    expect(createProjectListScenario("project-trash-moving").trashState).toBe(
      "moving",
    );
  });
});
