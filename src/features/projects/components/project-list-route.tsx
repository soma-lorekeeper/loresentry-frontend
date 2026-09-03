"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  getAccountGlobalScenario,
  resolveAccountGlobalStateId,
} from "@/features/account/account-global-states";
import { APP_ROUTES, createWorkspaceRoute } from "@/integration/app-routes";

import {
  createProjectListScenario,
  resolveProjectListStateId,
} from "../project-list-states";
import { projectFixtures } from "../project-model";
import { ProjectList } from "./project-list";

export interface ProjectListRouteProps {
  logout?: () => Promise<void>;
  navigate?: (href: string) => void;
  openProject?: (projectId: string) => Promise<{ verifiedProjectId: string }>;
}

export function ProjectListRoute({
  logout,
  navigate,
  openProject,
}: ProjectListRouteProps = {}) {
  const router = useRouter();
  const navigateToRoute = navigate ?? router.push;
  const searchParams = useSearchParams();
  const stateId = resolveProjectListStateId(searchParams.get("projectState"));
  const scenario = stateId ? createProjectListScenario(stateId) : undefined;
  const globalStateId = resolveAccountGlobalStateId(
    searchParams.get("globalState"),
  );
  const globalScenario = globalStateId
    ? getAccountGlobalScenario(globalStateId)
    : undefined;

  return (
    <ProjectList
      initialAccountProfile={globalScenario?.profile}
      initialAccountState={globalScenario?.accountState}
      initialCreateState={scenario?.createState}
      initialFeedbackState={globalScenario?.feedbackState}
      initialListStatus={scenario?.listStatus}
      initialLogoutState={globalScenario?.logoutState}
      initialMenuProjectId={
        scenario?.menuOpen ? projectFixtures[0].id : undefined
      }
      initialProjects={scenario?.listStatus === "empty" ? [] : undefined}
      initialRenameState={scenario?.renameState}
      initialTrashState={scenario?.trashState}
      logout={logout}
      onNavigateToLogin={() => navigateToRoute(APP_ROUTES.login)}
      onOpenProject={async (projectId) => {
        if (!openProject) throw new Error("project access adapter is required");
        const result = await openProject(projectId);
        navigateToRoute(createWorkspaceRoute(result.verifiedProjectId));
      }}
      theme={globalScenario?.theme}
    />
  );
}
