import { describe, expect, it } from "vitest";

import { resolveWorkspaceMockFixture } from "../workspace-mock-resolver";

describe("resolveWorkspaceMockFixture", () => {
  it("rejects an unknown project at the workspace route boundary", () => {
    expect(resolveWorkspaceMockFixture("other-project")).toEqual({
      projectId: "other-project",
      reason: "unknown-project-id",
      status: "not-found",
    });
  });

  it.each([null, "", "   "])(
    "does not invent a fallback when projectId is %s",
    (projectId) => {
      expect(resolveWorkspaceMockFixture(projectId)).toEqual({
        projectId: null,
        reason: "missing-project-id",
        status: "not-found",
      });
    },
  );
});
