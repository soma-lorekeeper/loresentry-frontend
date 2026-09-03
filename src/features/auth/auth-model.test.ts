import { describe, expect, it } from "vitest";

import { isInternalWorkspacePath, resolveAuthDestination } from "./auth-model";

describe("authentication destination", () => {
  it.each([
    "/workspace?projectId=glass-garden",
    "/workspace/?projectId=glass-garden",
  ])("accepts an internal workspace path: %s", (path) => {
    expect(isInternalWorkspacePath(path)).toBe(true);
    expect(
      resolveAuthDestination(
        { status: "success", verifiedReturnPath: path },
        true,
      ),
    ).toBe(path);
  });

  it.each([
    "https://evil.example/workspace?projectId=glass-garden",
    "//evil.example/workspace?projectId=glass-garden",
    "/workspace",
    "/projects?projectId=glass-garden",
  ])("rejects an unverified or invalid return path: %s", (path) => {
    expect(isInternalWorkspacePath(path)).toBe(false);
    expect(
      resolveAuthDestination(
        { status: "success", verifiedReturnPath: path },
        true,
      ),
    ).toBe("/projects");
  });

  it("uses the project list for ordinary authentication", () => {
    expect(
      resolveAuthDestination(
        {
          status: "success",
          verifiedReturnPath: "/workspace?projectId=glass-garden",
        },
        false,
      ),
    ).toBe("/projects");
  });
});
