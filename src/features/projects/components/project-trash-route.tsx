"use client";

import { useSearchParams } from "next/navigation";

import {
  getProjectTrashScenario,
  resolveProjectTrashStateId,
} from "../project-trash-states";
import { ProjectTrash } from "./project-trash";

export function ProjectTrashRoute() {
  const searchParams = useSearchParams();
  const stateId = resolveProjectTrashStateId(searchParams.get("trashState"));
  const scenario = stateId ? getProjectTrashScenario(stateId) : undefined;

  return (
    <ProjectTrash
      initialPermanentDeleteState={scenario?.deleteState}
      initialItems={scenario?.listStatus === "empty" ? [] : undefined}
      initialListStatus={scenario?.listStatus}
      initialRestoreState={scenario?.restoreState}
      theme={scenario?.theme}
    />
  );
}
