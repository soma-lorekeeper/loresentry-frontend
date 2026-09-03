"use client";

import { useSearchParams } from "next/navigation";

import {
  getAccountGlobalScenario,
  resolveAccountGlobalStateId,
} from "@/features/account/account-global-states";

import {
  createProjectListScenario,
  resolveProjectListStateId,
} from "../project-list-states";
import { projectFixtures } from "../project-model";
import { ProjectList } from "./project-list";

export function ProjectListRoute() {
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
      initialListStatus={scenario?.listStatus}
      initialMenuProjectId={
        scenario?.menuOpen ? projectFixtures[0].id : undefined
      }
      initialProjects={scenario?.listStatus === "empty" ? [] : undefined}
      initialRenameState={scenario?.renameState}
      initialTrashState={scenario?.trashState}
      theme={globalScenario?.theme}
    />
  );
}
