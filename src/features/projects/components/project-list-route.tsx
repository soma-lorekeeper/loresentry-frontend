"use client";

import { useSearchParams } from "next/navigation";

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

  return (
    <ProjectList
      initialCreateState={scenario?.createState}
      initialListStatus={scenario?.listStatus}
      initialMenuProjectId={
        scenario?.menuOpen ? projectFixtures[0].id : undefined
      }
      initialProjects={scenario?.listStatus === "empty" ? [] : undefined}
      initialRenameState={scenario?.renameState}
      initialTrashState={scenario?.trashState}
    />
  );
}
