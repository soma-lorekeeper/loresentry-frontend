"use client";

import { useSearchParams } from "next/navigation";

import { resolvePropertyDocumentStateId } from "@/features/property/property-document-states";

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
  const initialPropertyState = resolvePropertyDocumentStateId(
    searchParams.get("propertyState"),
  );

  return (
    <WorkspaceShell
      initialProjectId={projectId}
      initialPropertyState={initialPropertyState}
    />
  );
}
