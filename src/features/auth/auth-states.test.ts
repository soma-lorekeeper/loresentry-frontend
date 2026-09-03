import { describe, expect, it } from "vitest";

import { LOGIN_SCREEN_STATES, resolveLoginScreenState } from "./auth-states";

describe("login screen registry", () => {
  it("maps Pencil screens 139–144 to explicit /login states", () => {
    expect(
      LOGIN_SCREEN_STATES.map((state) => ({
        id: state.id,
        pencilNodeId: state.pencilNodeId,
        route: state.route,
        screenNumber: state.screenNumber,
      })),
    ).toEqual([
      {
        id: "login-default",
        pencilNodeId: "EwUtO",
        route: "/login",
        screenNumber: 139,
      },
      {
        id: "login-processing",
        pencilNodeId: "F4Qlk",
        route: "/login?loginState=login-processing",
        screenNumber: 140,
      },
      {
        id: "login-oauth-canceled",
        pencilNodeId: "rENHC",
        route: "/login?loginState=login-oauth-canceled",
        screenNumber: 141,
      },
      {
        id: "login-oauth-failed",
        pencilNodeId: "vJY2I",
        route: "/login?loginState=login-oauth-failed",
        screenNumber: 142,
      },
      {
        id: "login-session-expired",
        pencilNodeId: "y578o",
        route: "/login?loginState=login-session-expired",
        screenNumber: 143,
      },
      {
        id: "login-default-light",
        pencilNodeId: "sSVhG",
        route: "/login?loginState=login-default-light",
        screenNumber: 144,
      },
    ]);
  });

  it("does not infer an unknown state", () => {
    expect(resolveLoginScreenState("failed")).toBeUndefined();
    expect(resolveLoginScreenState(null)).toBeUndefined();
  });
});
