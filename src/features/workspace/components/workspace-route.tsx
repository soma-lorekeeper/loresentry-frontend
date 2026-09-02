"use client";

import { useSearchParams } from "next/navigation";

import { projects } from "../workspace-data";
import { WorkspaceShell } from "./workspace-shell";

export function resolveWorkspaceProjectId(projectId: string | null): string {
  return projects.some((project) => project.id === projectId)
    ? projectId!
    : projects[0].id;
}

export function WorkspaceRoute() {
  const searchParams = useSearchParams();
  const projectId = resolveWorkspaceProjectId(searchParams.get("projectId"));

  return <WorkspaceShell initialProjectId={projectId} />;
}
