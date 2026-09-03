import type { AccountSettingsState } from "./components/account-settings-dialog";
import type { LogoutState } from "./components/logout-dialog";
import type { GlobalFeedbackState } from "@/features/help/components/global-feedback";
import { type AccountProfile, longAccountProfile } from "./account-model";

export const ACCOUNT_GLOBAL_SCREEN_STATES = [
  {
    id: "user-menu-open",
    pencilNodeId: "Pr4Vc",
    route: "/projects?globalState=user-menu-open",
    screenNumber: 123,
  },
  {
    accountState: "default",
    id: "account-settings-default",
    pencilNodeId: "l6YSG6",
    route: "/projects?globalState=account-settings-default",
    screenNumber: 124,
  },
  {
    accountState: "edited",
    id: "account-settings-edited",
    pencilNodeId: "YlFtW",
    route: "/projects?globalState=account-settings-edited",
    screenNumber: 125,
  },
  {
    accountState: "validation-error",
    id: "account-settings-validation-error",
    pencilNodeId: "daOWS",
    route: "/projects?globalState=account-settings-validation-error",
    screenNumber: 126,
  },
  {
    accountState: "saving",
    id: "account-settings-saving",
    pencilNodeId: "VemT4",
    route: "/projects?globalState=account-settings-saving",
    screenNumber: 127,
  },
  {
    accountState: "saved",
    id: "account-settings-saved",
    pencilNodeId: "Z0yHo",
    route: "/projects?globalState=account-settings-saved",
    screenNumber: 128,
  },
  {
    accountState: "error",
    id: "account-settings-save-error",
    pencilNodeId: "CbnlA",
    route: "/projects?globalState=account-settings-save-error",
    screenNumber: 129,
  },
  {
    accountState: "default",
    id: "account-settings-long-values-light",
    pencilNodeId: "Mq1AS",
    route: "/projects?globalState=account-settings-long-values-light",
    screenNumber: 130,
    theme: "light",
  },
  {
    id: "logout-confirmation",
    logoutState: "confirmation",
    pencilNodeId: "HcLfZ",
    route: "/projects?globalState=logout-confirmation",
    screenNumber: 131,
  },
  {
    id: "logout-processing",
    logoutState: "processing",
    pencilNodeId: "y7wxgE",
    route: "/projects?globalState=logout-processing",
    screenNumber: 132,
  },
  {
    id: "logout-error",
    logoutState: "error",
    pencilNodeId: "EQJbK",
    route: "/projects?globalState=logout-error",
    screenNumber: 133,
  },
  {
    id: "logout-complete",
    logoutState: "complete",
    pencilNodeId: "N5M5TM",
    route: "/projects?globalState=logout-complete",
    screenNumber: 134,
  },
  {
    id: "guide-topics",
    pencilNodeId: "K5MEsG",
    route: "/projects/guide",
    screenNumber: 135,
  },
  {
    guideTopicId: "workspace-start",
    id: "guide-article",
    pencilNodeId: "j3qmH",
    route: "/projects/guide?topic=workspace-start",
    screenNumber: 136,
  },
  {
    feedbackState: "opened",
    id: "feedback-opened",
    pencilNodeId: "iZobk",
    route: "/projects?globalState=feedback-opened",
    screenNumber: 137,
  },
  {
    feedbackState: "error",
    id: "feedback-open-error",
    pencilNodeId: "c061WC",
    route: "/projects?globalState=feedback-open-error",
    screenNumber: 138,
  },
] as const;

export type AccountGlobalStateId =
  (typeof ACCOUNT_GLOBAL_SCREEN_STATES)[number]["id"];

export interface AccountGlobalScenario {
  accountState?: AccountSettingsState | "user-menu-open";
  feedbackState?: GlobalFeedbackState;
  logoutState?: LogoutState;
  profile?: AccountProfile;
  theme?: "dark" | "light";
}

export function resolveAccountGlobalStateId(value: string | null) {
  return ACCOUNT_GLOBAL_SCREEN_STATES.some((state) => state.id === value)
    ? (value as AccountGlobalStateId)
    : undefined;
}

export function getAccountGlobalScenario(
  stateId: AccountGlobalStateId,
): AccountGlobalScenario {
  const state = ACCOUNT_GLOBAL_SCREEN_STATES.find(
    (candidate) => candidate.id === stateId,
  )!;
  return {
    accountState:
      state.id === "user-menu-open"
        ? "user-menu-open"
        : "accountState" in state
          ? (state.accountState as AccountSettingsState)
          : undefined,
    feedbackState:
      "feedbackState" in state
        ? (state.feedbackState as GlobalFeedbackState)
        : undefined,
    logoutState:
      "logoutState" in state ? (state.logoutState as LogoutState) : undefined,
    profile:
      state.id === "account-settings-long-values-light"
        ? longAccountProfile
        : undefined,
    theme: "theme" in state ? state.theme : undefined,
  };
}
