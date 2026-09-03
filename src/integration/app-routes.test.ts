import { describe, expect, it } from "vitest";

import { resolveAuthDestination } from "@/features/auth/auth-model";

import { UNRESOLVED_API_BOUNDARIES } from "./api-boundaries";
import {
  APP_ROUTES,
  createWorkspaceRoute,
  resolveWorkspaceProjectId,
} from "./app-routes";

describe("frontend route integration", () => {
  it("connects service entry, login, projects, and a verified workspace", () => {
    expect(APP_ROUTES.serviceEntry).toBe("/");
    expect(APP_ROUTES.login).toBe("/login");
    expect(resolveAuthDestination({ status: "success" }, false)).toBe(
      APP_ROUTES.projectList,
    );
    expect(createWorkspaceRoute("glass garden/1")).toBe(
      "/workspace?projectId=glass+garden%2F1",
    );
  });

  it("preserves the server-verified workspace return route after re-login", () => {
    const returnRoute = createWorkspaceRoute("glass-garden");
    expect(
      resolveAuthDestination(
        { status: "success", verifiedReturnPath: returnRoute },
        true,
      ),
    ).toBe(returnRoute);
  });

  it.each([null, "", "   "])(
    "rejects missing workspace identity instead of opening a fallback (%s)",
    (projectId) => {
      expect(resolveWorkspaceProjectId(projectId)).toBeNull();
    },
  );

  it("keeps uncontracted backend operations as named ports without guessed HTTP details", () => {
    expect(UNRESOLVED_API_BOUNDARIES.map(({ id }) => id)).toEqual(
      expect.arrayContaining([
        "auth.start-google-oauth",
        "auth.logout",
        "projects.validate-access",
        "workspace.restore-layout",
        "workspace.persist-before-switch",
      ]),
    );
    expect(
      UNRESOLVED_API_BOUNDARIES.every(
        (boundary) =>
          !("endpoint" in boundary) &&
          !("method" in boundary) &&
          boundary.frontendPort.length > 0,
      ),
    ).toBe(true);
  });
});
