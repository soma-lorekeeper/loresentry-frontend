export const SETTINGS_SCREEN_STATES = [
  {
    id: "settings-default",
    mode: "default",
    pencilNodeId: "EHbKj",
    screenNumber: 70,
  },
  {
    id: "settings-changed",
    mode: "changed",
    pencilNodeId: "WFeMQ",
    screenNumber: 71,
  },
  {
    id: "settings-saving",
    mode: "saving",
    pencilNodeId: "Mk1yl",
    screenNumber: 72,
  },
  {
    id: "settings-saved",
    mode: "saved",
    pencilNodeId: "iEh4S",
    screenNumber: 73,
  },
  {
    id: "settings-save-error",
    mode: "error",
    pencilNodeId: "JfCF1",
    screenNumber: 74,
  },
  {
    id: "settings-unsaved-confirmation",
    mode: "unsaved-confirmation",
    pencilNodeId: "b5Rlml",
    screenNumber: 75,
  },
  {
    id: "settings-trash-confirmation",
    mode: "trash-confirmation",
    pencilNodeId: "X9umV",
    screenNumber: 76,
  },
] as const;

export type SettingsScreenMode =
  (typeof SETTINGS_SCREEN_STATES)[number]["mode"];
export type SettingsStateId = (typeof SETTINGS_SCREEN_STATES)[number]["id"];

export interface SettingsScenario {
  description: string;
  initialDialog?: "trash" | "unsaved";
  name: string;
  stateId: SettingsStateId;
  status: "changed" | "default" | "error" | "saved" | "saving";
}

export function resolveSettingsStateId(
  value: string | null,
): SettingsStateId | undefined {
  return SETTINGS_SCREEN_STATES.some((state) => state.id === value)
    ? (value as SettingsStateId)
    : undefined;
}

export function createSettingsScenario(
  stateId: SettingsStateId,
): SettingsScenario {
  const state = SETTINGS_SCREEN_STATES.find(
    (candidate) => candidate.id === stateId,
  )!;
  const changed =
    state.mode !== "default" && state.mode !== "trash-confirmation";

  return {
    description: changed
      ? "유리 정원과 균열을 기록하는 장편 판타지 프로젝트"
      : "유리 정원을 둘러싼 인물과 사건을 기록합니다.",
    initialDialog:
      state.mode === "unsaved-confirmation"
        ? "unsaved"
        : state.mode === "trash-confirmation"
          ? "trash"
          : undefined,
    name: "유리 정원의 기록",
    stateId,
    status:
      state.mode === "unsaved-confirmation"
        ? "changed"
        : state.mode === "trash-confirmation"
          ? "default"
          : state.mode,
  };
}
