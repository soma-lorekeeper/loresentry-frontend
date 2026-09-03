import type { CreateProjectState } from "./components/create-project-dialog";
import type { ProjectListStatus } from "./components/project-list";
import type { RenameProjectState } from "./components/rename-project-dialog";
import type { TrashProjectState } from "./components/trash-project-dialog";

export const PROJECT_LIST_SCREEN_STATES = [
  {
    id: "project-list-default",
    mode: "default",
    pencilNodeId: "BvuoV",
    screenNumber: 91,
  },
  {
    id: "project-card-menu-open",
    mode: "menu",
    pencilNodeId: "G3Cvn",
    screenNumber: 92,
  },
  {
    id: "project-list-empty",
    mode: "empty",
    pencilNodeId: "Rpqy3",
    screenNumber: 93,
  },
  {
    id: "project-list-loading",
    mode: "loading",
    pencilNodeId: "z4wuM",
    screenNumber: 94,
  },
  {
    id: "project-list-error",
    mode: "list-error",
    pencilNodeId: "sYDj4",
    screenNumber: 95,
  },
  {
    id: "create-project-initial",
    mode: "create-initial",
    pencilNodeId: "PzeBB",
    screenNumber: 96,
  },
  {
    id: "create-project-required-error",
    mode: "create-required-error",
    pencilNodeId: "b7Hoq",
    screenNumber: 97,
  },
  {
    id: "create-project-ready",
    mode: "create-ready",
    pencilNodeId: "xiX3C",
    screenNumber: 98,
  },
  {
    id: "create-project-submitting",
    mode: "create-submitting",
    pencilNodeId: "U83vsD",
    screenNumber: 99,
  },
  {
    id: "create-project-server-error",
    mode: "create-error",
    pencilNodeId: "mD2Vy",
    screenNumber: 100,
  },
  {
    id: "rename-project-current",
    mode: "rename-current",
    pencilNodeId: "e2zKG",
    screenNumber: 101,
  },
  {
    id: "rename-project-invalid",
    mode: "rename-invalid",
    pencilNodeId: "z8wIZo",
    screenNumber: 102,
  },
  {
    id: "rename-project-ready",
    mode: "rename-ready",
    pencilNodeId: "NaYPr",
    screenNumber: 103,
  },
  {
    id: "rename-project-saving",
    mode: "rename-saving",
    pencilNodeId: "syeZk",
    screenNumber: 104,
  },
  {
    id: "rename-project-save-error",
    mode: "rename-error",
    pencilNodeId: "WXPWx",
    screenNumber: 105,
  },
  {
    id: "rename-project-success",
    mode: "rename-success",
    pencilNodeId: "wB2c6",
    screenNumber: 106,
  },
  {
    id: "project-trash-confirmation",
    mode: "trash-confirmation",
    pencilNodeId: "DJf8k",
    screenNumber: 107,
  },
  {
    id: "project-trash-moving",
    mode: "trash-moving",
    pencilNodeId: "xyKPr",
    screenNumber: 108,
  },
  {
    id: "project-trash-error",
    mode: "trash-error",
    pencilNodeId: "KCK49",
    screenNumber: 109,
  },
  {
    id: "project-trash-success",
    mode: "trash-success",
    pencilNodeId: "Hhm0r",
    screenNumber: 110,
  },
] as const;

export type ProjectListStateId =
  (typeof PROJECT_LIST_SCREEN_STATES)[number]["id"];

export interface ProjectListScenario {
  createState?: CreateProjectState;
  listStatus?: ProjectListStatus;
  menuOpen?: boolean;
  renameState?: RenameProjectState;
  stateId: ProjectListStateId;
  trashState?: TrashProjectState;
}

export function resolveProjectListStateId(
  value: string | null,
): ProjectListStateId | undefined {
  return PROJECT_LIST_SCREEN_STATES.some((state) => state.id === value)
    ? (value as ProjectListStateId)
    : undefined;
}

export function createProjectListScenario(
  stateId: ProjectListStateId,
): ProjectListScenario {
  const mode = PROJECT_LIST_SCREEN_STATES.find(
    (state) => state.id === stateId,
  )!.mode;
  const createState = mode.startsWith("create-")
    ? (
        {
          "create-error": "error",
          "create-initial": "initial",
          "create-ready": "ready",
          "create-required-error": "required-error",
          "create-submitting": "submitting",
        } as const
      )[
        mode as
          | "create-error"
          | "create-initial"
          | "create-ready"
          | "create-required-error"
          | "create-submitting"
      ]
    : undefined;
  const renameState = mode.startsWith("rename-")
    ? (
        {
          "rename-current": "current",
          "rename-error": "error",
          "rename-invalid": "invalid",
          "rename-ready": "ready",
          "rename-saving": "saving",
          "rename-success": "success",
        } as const
      )[
        mode as
          | "rename-current"
          | "rename-error"
          | "rename-invalid"
          | "rename-ready"
          | "rename-saving"
          | "rename-success"
      ]
    : undefined;
  const trashState = mode.startsWith("trash-")
    ? (
        {
          "trash-confirmation": "confirmation",
          "trash-error": "error",
          "trash-moving": "moving",
          "trash-success": "success",
        } as const
      )[
        mode as
          | "trash-confirmation"
          | "trash-error"
          | "trash-moving"
          | "trash-success"
      ]
    : undefined;

  return {
    createState,
    listStatus:
      mode === "empty"
        ? "empty"
        : mode === "loading"
          ? "loading"
          : mode === "list-error"
            ? "error"
            : "ready",
    menuOpen: mode === "menu",
    renameState,
    stateId,
    trashState,
  };
}
