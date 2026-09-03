import type { AccountSettingsState } from "./components/account-settings-dialog";
import type { LogoutState } from "./components/logout-dialog";
import type { GlobalFeedbackState } from "@/features/help/components/global-feedback";
import { type AccountProfile, longAccountProfile } from "./account-model";

export const ACCOUNT_GLOBAL_SCREEN_STATES = [
  {
    id: "user-menu-open",
    pencilNodeId: "Pr4Vc",
    screenNumber: 123,
  },
  {
    accountState: "default",
    id: "account-settings-default",
    pencilNodeId: "l6YSG6",
    screenNumber: 124,
  },
  {
    accountState: "edited",
    id: "account-settings-edited",
    pencilNodeId: "YlFtW",
    screenNumber: 125,
  },
  {
    accountState: "validation-error",
    id: "account-settings-validation-error",
    pencilNodeId: "daOWS",
    screenNumber: 126,
  },
  {
    accountState: "saving",
    id: "account-settings-saving",
    pencilNodeId: "VemT4",
    screenNumber: 127,
  },
  {
    accountState: "saved",
    id: "account-settings-saved",
    pencilNodeId: "Z0yHo",
    screenNumber: 128,
  },
  {
    accountState: "error",
    id: "account-settings-save-error",
    pencilNodeId: "CbnlA",
    screenNumber: 129,
  },
  {
    accountState: "default",
    id: "account-settings-long-values-light",
    pencilNodeId: "Mq1AS",
    screenNumber: 130,
    theme: "light",
  },
  {
    id: "logout-confirmation",
    logoutState: "confirmation",
    pencilNodeId: "HcLfZ",
    screenNumber: 131,
  },
  {
    id: "logout-processing",
    logoutState: "processing",
    pencilNodeId: "y7wxgE",
    screenNumber: 132,
  },
  {
    id: "logout-error",
    logoutState: "error",
    pencilNodeId: "EQJbK",
    screenNumber: 133,
  },
  {
    id: "logout-complete",
    logoutState: "complete",
    pencilNodeId: "N5M5TM",
    screenNumber: 134,
  },
  {
    feedbackState: "opened",
    id: "feedback-opened",
    pencilNodeId: "iZobk",
    screenNumber: 137,
  },
  {
    feedbackState: "error",
    id: "feedback-open-error",
    pencilNodeId: "c061WC",
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
