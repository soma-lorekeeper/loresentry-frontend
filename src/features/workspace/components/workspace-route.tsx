"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { resolvePropertyDocumentStateId } from "@/features/property/property-document-states";
import { resolveHelpStateId } from "@/features/help/help-states";
import { resolveTimelineStateId } from "@/features/timeline/timeline-states";
import { resolveSettingsStateId } from "@/features/settings/settings-states";
import { APP_ROUTES, createWorkspaceRoute } from "@/integration/app-routes";
import { resolveWorkspaceMockFixture } from "../workspace-mock-resolver";

import { WorkspaceShell } from "./workspace-shell";

export interface WorkspaceRouteProps {
  navigate?: (href: string) => void;
}

export function WorkspaceRoute({ navigate }: WorkspaceRouteProps = {}) {
  const router = useRouter();
  const navigateToRoute = navigate ?? router.push;
  const searchParams = useSearchParams();
  const workspace = resolveWorkspaceMockFixture(searchParams.get("projectId"));
  if (workspace.status === "not-found") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold">작업공간을 열 수 없어요</h1>
        <p>검증된 프로젝트를 프로젝트 목록에서 다시 선택해 주세요.</p>
        <Link className="underline" href={APP_ROUTES.projectList}>
          프로젝트 목록으로 이동
        </Link>
      </main>
    );
  }
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
      initialProjectId={workspace.projectId}
      initialHelpState={initialHelpState}
      initialPropertyState={initialPropertyState}
      initialSettingsState={initialSettingsState}
      initialTimelineState={initialTimelineState}
      onProjectChange={(nextProjectId) =>
        navigateToRoute(createWorkspaceRoute(nextProjectId))
      }
      onProjectListSelect={() => navigateToRoute(APP_ROUTES.projectList)}
    />
  );
}
