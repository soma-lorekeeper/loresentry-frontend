import { describe, expect, it } from "vitest";

import { resolveWorkspaceProjectId } from "@/integration/app-routes";

describe("resolveWorkspaceProjectId", () => {
  it("keeps a non-empty project from the server-verified workspace URL", () => {
    expect(resolveWorkspaceProjectId("other-project")).toBe("other-project");
  });

  it.each([null, "", "   "])(
    "does not invent a fallback when projectId is %s",
    (projectId) => {
      expect(resolveWorkspaceProjectId(projectId)).toBeNull();
    },
  );
});
