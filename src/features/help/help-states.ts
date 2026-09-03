export const HELP_SCREEN_STATES = [
  {
    id: "help-default",
    mode: "default",
    pencilNodeId: "Zp4Gq",
    screenNumber: 77,
  },
  {
    id: "help-guide-topics",
    mode: "topics",
    pencilNodeId: "p11tW",
    screenNumber: 78,
  },
  {
    id: "help-guide-article",
    mode: "article",
    pencilNodeId: "ZpiZx",
    screenNumber: 79,
  },
  {
    id: "help-feedback-opened",
    mode: "feedback-opened",
    pencilNodeId: "HIJlb",
    screenNumber: 80,
  },
  {
    id: "help-feedback-error",
    mode: "feedback-error",
    pencilNodeId: "RxYQ5",
    screenNumber: 81,
  },
  {
    id: "help-guide-search-empty",
    mode: "search-empty",
    pencilNodeId: "oAP5s",
    screenNumber: 89,
  },
  {
    id: "help-guide-load-error",
    mode: "load-error",
    pencilNodeId: "i4zE54",
    screenNumber: 90,
  },
] as const;

export type HelpStateId = (typeof HELP_SCREEN_STATES)[number]["id"];
export type HelpScreenMode = (typeof HELP_SCREEN_STATES)[number]["mode"];

export interface HelpScenario {
  mode: HelpScreenMode;
  query: string;
  selectedTopicId?: string;
  stateId: HelpStateId;
}

export function resolveHelpStateId(
  value: string | null,
): HelpStateId | undefined {
  return HELP_SCREEN_STATES.some((state) => state.id === value)
    ? (value as HelpStateId)
    : undefined;
}

export function createHelpScenario(stateId: HelpStateId): HelpScenario {
  const state = HELP_SCREEN_STATES.find(
    (candidate) => candidate.id === stateId,
  )!;
  return {
    mode: state.mode,
    query: state.mode === "search-empty" ? "협업 권한" : "",
    selectedTopicId:
      state.mode === "article" || state.mode === "load-error"
        ? "workspace-start"
        : undefined,
    stateId,
  };
}
