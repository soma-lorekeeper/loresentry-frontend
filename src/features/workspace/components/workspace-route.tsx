"use client";

import { useSearchParams } from "next/navigation";

import { resolvePropertyDocumentStateId } from "@/features/property/property-document-states";
import { resolveHelpStateId } from "@/features/help/help-states";
import { resolveTimelineStateId } from "@/features/timeline/timeline-states";
import { resolveSettingsStateId } from "@/features/settings/settings-states";

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
  const initialTimelineState = resolveTimelineStateId(
    searchParams.get("timelineState"),
  );
  const initialSettingsState = resolveSettingsStateId(
    searchParams.get("settingsState"),
  );
  const initialHelpState = resolveHelpStateId(searchParams.get("helpState"));

  return (
    <WorkspaceShell
      initialProjectId={projectId}
      initialHelpState={initialHelpState}
      initialPropertyState={initialPropertyState}
      initialSettingsState={initialSettingsState}
      initialTimelineState={initialTimelineState}
    />
  );
}
