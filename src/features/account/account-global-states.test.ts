import { describe, expect, it } from "vitest";

import {
  ACCOUNT_GLOBAL_SCREEN_STATES,
  getAccountGlobalScenario,
  resolveAccountGlobalStateId,
} from "./account-global-states";

describe("account global state registry", () => {
  it("maps account and global Pencil screens 123–138 exactly once", () => {
    expect(ACCOUNT_GLOBAL_SCREEN_STATES).toHaveLength(16);
    expect(
      ACCOUNT_GLOBAL_SCREEN_STATES.map((state) => state.screenNumber),
    ).toEqual(Array.from({ length: 16 }, (_, index) => 123 + index));
    expect(
      new Set(ACCOUNT_GLOBAL_SCREEN_STATES.map((state) => state.pencilNodeId))
        .size,
    ).toBe(16);
    expect(
      new Set(ACCOUNT_GLOBAL_SCREEN_STATES.map((state) => state.route)).size,
    ).toBe(16);
  });

  it("resolves explicit account scenarios including long light values", () => {
    expect(resolveAccountGlobalStateId("account-settings-saving")).toBe(
      "account-settings-saving",
    );
    expect(resolveAccountGlobalStateId("unknown")).toBeUndefined();
    expect(getAccountGlobalScenario("account-settings-saving")).toMatchObject({
      accountState: "saving",
    });
    expect(
      getAccountGlobalScenario("account-settings-long-values-light"),
    ).toMatchObject({
      accountState: "default",
      theme: "light",
    });
    expect(getAccountGlobalScenario("logout-processing")).toMatchObject({
      logoutState: "processing",
    });
    expect(getAccountGlobalScenario("feedback-open-error")).toMatchObject({
      feedbackState: "error",
    });
    expect(
      ACCOUNT_GLOBAL_SCREEN_STATES.find(
        (state) => state.id === "guide-article",
      ),
    ).toMatchObject({
      pencilNodeId: "j3qmH",
      route: "/projects/guide?topic=workspace-start",
      screenNumber: 136,
    });
  });
});
