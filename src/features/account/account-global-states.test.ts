import { describe, expect, it } from "vitest";

import {
  ACCOUNT_GLOBAL_SCREEN_STATES,
  getAccountGlobalScenario,
  resolveAccountGlobalStateId,
} from "./account-global-states";

describe("account global state registry", () => {
  it("maps account, logout, and feedback Pencil screens exactly once", () => {
    expect(ACCOUNT_GLOBAL_SCREEN_STATES).toHaveLength(14);
    expect(
      ACCOUNT_GLOBAL_SCREEN_STATES.map((state) => state.screenNumber),
    ).toEqual([
      ...Array.from({ length: 12 }, (_, index) => 123 + index),
      137,
      138,
    ]);
    expect(
      new Set(ACCOUNT_GLOBAL_SCREEN_STATES.map((state) => state.pencilNodeId))
        .size,
    ).toBe(14);
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
  });
});
