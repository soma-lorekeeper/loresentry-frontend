import type {
  ProjectRestoreState,
  ProjectTrashListStatus,
} from "./components/project-trash";

export const PROJECT_TRASH_SCREEN_STATES = [
  {
    id: "project-trash-default",
    listStatus: "ready",
    pencilNodeId: "WYBJQ",
    screenNumber: 111,
    theme: "dark",
  },
  {
    id: "project-trash-empty",
    listStatus: "empty",
    pencilNodeId: "yvfHX",
    screenNumber: 112,
    theme: "dark",
  },
  {
    id: "project-trash-loading",
    listStatus: "loading",
    pencilNodeId: "FogDw",
    screenNumber: 113,
    theme: "dark",
  },
  {
    id: "project-trash-load-error",
    listStatus: "error",
    pencilNodeId: "r5UPt",
    screenNumber: 114,
    theme: "dark",
  },
  {
    id: "project-trash-restoring",
    listStatus: "ready",
    pencilNodeId: "tErn6",
    restoreState: "restoring",
    screenNumber: 115,
    theme: "dark",
  },
  {
    id: "project-trash-restore-error",
    listStatus: "ready",
    pencilNodeId: "ISCdJ",
    restoreState: "error",
    screenNumber: 116,
    theme: "dark",
  },
  {
    id: "project-trash-restore-success",
    listStatus: "ready",
    pencilNodeId: "tTF2Z",
    restoreState: "success",
    screenNumber: 117,
    theme: "dark",
  },
  {
    id: "project-trash-default-light",
    listStatus: "ready",
    pencilNodeId: "xjwox",
    screenNumber: 118,
    theme: "light",
  },
] as const satisfies ReadonlyArray<{
  id: string;
  listStatus: ProjectTrashListStatus;
  pencilNodeId: string;
  restoreState?: ProjectRestoreState;
  screenNumber: number;
  theme: "dark" | "light";
}>;

export type ProjectTrashStateId =
  (typeof PROJECT_TRASH_SCREEN_STATES)[number]["id"];

export interface ProjectTrashScenario {
  id: ProjectTrashStateId;
  listStatus: ProjectTrashListStatus;
  pencilNodeId: string;
  restoreState?: ProjectRestoreState;
  screenNumber: number;
  theme: "dark" | "light";
}

export function resolveProjectTrashStateId(
  value: string | null,
): ProjectTrashStateId | undefined {
  return PROJECT_TRASH_SCREEN_STATES.some((state) => state.id === value)
    ? (value as ProjectTrashStateId)
    : undefined;
}

export function getProjectTrashScenario(
  stateId: ProjectTrashStateId,
): ProjectTrashScenario {
  return PROJECT_TRASH_SCREEN_STATES.find(
    (state) => state.id === stateId,
  ) as ProjectTrashScenario;
}
