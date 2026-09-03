import { describe, expect, it } from "vitest";

import { projectFixtureIds } from "@/features/projects/project-model";

import {
  resolveWorkspaceMockFixture,
  staticWorkspaceMockResolver,
} from "./workspace-mock-resolver";
import { workspaceMockFixtures } from "./workspace-fixtures";

describe("resolveWorkspaceMockFixture", () => {
  it.each(projectFixtureIds)("resolves the exact %s fixture", (projectId) => {
    expect(resolveWorkspaceMockFixture(projectId)).toEqual({
      fixture: workspaceMockFixtures[projectId],
      projectId,
      status: "ready",
    });
  });

  it.each([null, undefined, "", "   "])(
    "returns an explicit missing state for %s",
    (projectId) => {
      expect(resolveWorkspaceMockFixture(projectId)).toEqual({
        projectId: null,
        reason: "missing-project-id",
        status: "not-found",
      });
    },
  );

  it("does not replace an unknown project with the first fixture", () => {
    const result = resolveWorkspaceMockFixture("unknown-project");

    expect(result).toEqual({
      projectId: "unknown-project",
      reason: "unknown-project-id",
      status: "not-found",
    });
    expect(result).not.toHaveProperty("fixture");
  });

  it("exposes the same pure resolver through the replaceable data boundary", () => {
    expect(staticWorkspaceMockResolver.resolve(" winter-letter ")).toEqual({
      fixture: workspaceMockFixtures["winter-letter"],
      projectId: "winter-letter",
      status: "ready",
    });
  });
});
