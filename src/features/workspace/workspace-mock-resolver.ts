import type { ProjectFixtureId } from "@/features/projects/project-model";

import {
  type WorkspaceMockFixture,
  workspaceMockFixtures,
} from "./workspace-fixtures";

export type WorkspaceMockFailureReason =
  "missing-project-id" | "unknown-project-id";

export type WorkspaceMockResolution =
  | {
      fixture: WorkspaceMockFixture;
      projectId: ProjectFixtureId;
      status: "ready";
    }
  | {
      projectId: string | null;
      reason: WorkspaceMockFailureReason;
      status: "not-found";
    };

export interface WorkspaceMockResolver {
  resolve: (projectId: string | null | undefined) => WorkspaceMockResolution;
}

function isProjectFixtureId(projectId: string): projectId is ProjectFixtureId {
  return Object.prototype.hasOwnProperty.call(workspaceMockFixtures, projectId);
}

export function resolveWorkspaceMockFixture(
  projectId: string | null | undefined,
): WorkspaceMockResolution {
  const normalizedProjectId = projectId?.trim();

  if (!normalizedProjectId) {
    return {
      projectId: null,
      reason: "missing-project-id",
      status: "not-found",
    };
  }

  if (!isProjectFixtureId(normalizedProjectId)) {
    return {
      projectId: normalizedProjectId,
      reason: "unknown-project-id",
      status: "not-found",
    };
  }

  return {
    fixture: workspaceMockFixtures[normalizedProjectId],
    projectId: normalizedProjectId,
    status: "ready",
  };
}

export const staticWorkspaceMockResolver = {
  resolve: resolveWorkspaceMockFixture,
} satisfies WorkspaceMockResolver;
