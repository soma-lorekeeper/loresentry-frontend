import { describe, expect, it } from "vitest";

import { resolveWorkspaceProjectId } from "./workspace-route";

describe("resolveWorkspaceProjectId", () => {
  it("keeps a known project from the static workspace URL", () => {
    expect(resolveWorkspaceProjectId("other-project")).toBe("other-project");
  });

  it.each([null, "unknown-project"])(
    "falls back safely when projectId is %s",
    (projectId) => {
      expect(resolveWorkspaceProjectId(projectId)).toBe("glass-garden");
    },
  );
});
