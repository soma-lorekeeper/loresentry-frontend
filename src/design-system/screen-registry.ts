import { ACCOUNT_GLOBAL_SCREEN_STATES } from "@/features/account/account-global-states";
import { LOGIN_SCREEN_STATES } from "@/features/auth/auth-states";
import { HELP_SCREEN_STATES } from "@/features/help/help-states";
import { PROJECT_LIST_SCREEN_STATES } from "@/features/projects/project-list-states";
import { PROJECT_TRASH_SCREEN_STATES } from "@/features/projects/project-trash-states";
import { PROPERTY_DOCUMENT_SCREEN_STATES } from "@/features/property/property-document-states";
import { SETTINGS_SCREEN_STATES } from "@/features/settings/settings-states";
import { TIMELINE_SCREEN_STATES } from "@/features/timeline/timeline-states";

import pencilScreenCatalog from "./pencil-screen-catalog.json";

export type ScreenOwner =
  | "account"
  | "ai-chat"
  | "auth"
  | "help"
  | "memo"
  | "new-tab"
  | "project-list"
  | "project-trash"
  | "property"
  | "settings"
  | "timeline"
  | "workspace";

export interface ScreenImplementation {
  featureComponent: string;
  name: string;
  owner: ScreenOwner;
  pencilNodeId: string;
  route: string;
  screenNumber: number;
  stateId: string;
}

interface RuntimeScreenState {
  id: string;
  pencilNodeId: string;
  route?: string;
  screenNumber: number;
}

const runtimeScreenStates: readonly RuntimeScreenState[] = [
  ...PROPERTY_DOCUMENT_SCREEN_STATES,
  ...TIMELINE_SCREEN_STATES,
  ...SETTINGS_SCREEN_STATES,
  ...HELP_SCREEN_STATES,
  ...PROJECT_LIST_SCREEN_STATES,
  ...PROJECT_TRASH_SCREEN_STATES,
  ...ACCOUNT_GLOBAL_SCREEN_STATES,
  ...LOGIN_SCREEN_STATES,
];

function getRuntimeState(screenNumber: number) {
  return runtimeScreenStates.find(
    (candidate) => candidate.screenNumber === screenNumber,
  );
}

function getWorkspaceCoreImplementation(
  name: string,
  screenNumber: number,
): Pick<
  ScreenImplementation,
  "featureComponent" | "owner" | "route" | "stateId"
> {
  const normalizedState = name
    .toLowerCase()
    .replaceAll("·", " ")
    .replaceAll("+", " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  if (name.startsWith("New Tab")) {
    return {
      featureComponent: "new-tab/WorkspaceNewTab",
      owner: "new-tab",
      route: "/workspace?projectId=glass-garden",
      stateId: normalizedState,
    };
  }
  if (name.startsWith("Workspace · Memo")) {
    return {
      featureComponent: "memo/ProjectMemos",
      owner: "memo",
      route: "/workspace?projectId=glass-garden",
      stateId: normalizedState,
    };
  }
  if (name.includes("AI Chat")) {
    return {
      featureComponent: "ai-chat/AiChatPanel",
      owner: "ai-chat",
      route: "/workspace?projectId=glass-garden",
      stateId: normalizedState,
    };
  }
  if (name.includes("Memo")) {
    return {
      featureComponent: "memo/FileMemoWorkspace",
      owner: "memo",
      route: "/workspace?projectId=glass-garden",
      stateId: normalizedState,
    };
  }
  return {
    featureComponent:
      screenNumber === 10
        ? "workspace/WorkspaceManuscriptEditor"
        : "workspace/WorkspaceShell",
    owner: "workspace",
    route: "/workspace?projectId=glass-garden",
    stateId: normalizedState,
  };
}

function getRuntimeImplementation(
  screenNumber: number,
  state: RuntimeScreenState,
): Pick<
  ScreenImplementation,
  "featureComponent" | "owner" | "route" | "stateId"
> {
  if (screenNumber >= 52 && screenNumber <= 64) {
    return {
      featureComponent: "property/PropertyDocument",
      owner: "property",
      route: `/workspace?projectId=glass-garden&propertyState=${state.id}`,
      stateId: state.id,
    };
  }
  if ((screenNumber >= 65 && screenNumber <= 69) || screenNumber === 88) {
    return {
      featureComponent: "timeline/EventTimeline",
      owner: "timeline",
      route: `/workspace?projectId=glass-garden&timelineState=${state.id}`,
      stateId: state.id,
    };
  }
  if (screenNumber >= 70 && screenNumber <= 76) {
    return {
      featureComponent: "settings/ProjectSettings",
      owner: "settings",
      route: `/workspace?projectId=glass-garden&settingsState=${state.id}`,
      stateId: state.id,
    };
  }
  if (
    (screenNumber >= 77 && screenNumber <= 81) ||
    screenNumber === 89 ||
    screenNumber === 90
  ) {
    return {
      featureComponent: "help/WorkspaceHelp",
      owner: "help",
      route: `/workspace?projectId=glass-garden&helpState=${state.id}`,
      stateId: state.id,
    };
  }
  if (screenNumber >= 91 && screenNumber <= 110) {
    return {
      featureComponent: "project-list/ProjectList",
      owner: "project-list",
      route: `/projects?projectState=${state.id}`,
      stateId: state.id,
    };
  }
  if (screenNumber >= 111 && screenNumber <= 122) {
    return {
      featureComponent: "project-trash/ProjectTrash",
      owner: "project-trash",
      route: `/projects/trash?trashState=${state.id}`,
      stateId: state.id,
    };
  }
  if (screenNumber >= 123 && screenNumber <= 134) {
    return {
      featureComponent:
        screenNumber <= 130
          ? "account/AccountSettingsDialog"
          : "account/LogoutDialog",
      owner: "account",
      route: state.route!,
      stateId: state.id,
    };
  }
  if (screenNumber >= 135 && screenNumber <= 138) {
    return {
      featureComponent:
        screenNumber <= 136 ? "help/ProjectGuide" : "help/GlobalFeedback",
      owner: "help",
      route: state.route!,
      stateId: state.id,
    };
  }
  if (screenNumber >= 139 && screenNumber <= 144) {
    return {
      featureComponent: "auth/LoginPage",
      owner: "auth",
      route: state.route!,
      stateId: state.id,
    };
  }
  throw new Error(`등록되지 않은 runtime 화면입니다: ${screenNumber}`);
}

export const SCREEN_IMPLEMENTATION_REGISTRY: readonly ScreenImplementation[] =
  pencilScreenCatalog.screens.map((screen) => {
    const runtimeState = getRuntimeState(screen.screenNumber);
    const implementation = runtimeState
      ? getRuntimeImplementation(screen.screenNumber, runtimeState)
      : getWorkspaceCoreImplementation(screen.name, screen.screenNumber);
    return { ...screen, ...implementation };
  });

export const PENCIL_SCREEN_COUNT = pencilScreenCatalog.screenCount;
export const PENCIL_SCREEN_SOURCES = pencilScreenCatalog.sources;
