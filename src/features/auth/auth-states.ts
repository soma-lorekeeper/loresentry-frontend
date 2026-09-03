import type { LoginState } from "./auth-model";

export type LoginScreenStateId =
  | "login-default"
  | "login-default-light"
  | "login-oauth-canceled"
  | "login-oauth-failed"
  | "login-processing"
  | "login-session-expired";

export interface LoginScreenState {
  id: LoginScreenStateId;
  loginState: LoginState;
  name: string;
  pencilNodeId: string;
  route: string;
  screenNumber: number;
  theme: "dark" | "light";
}

export const LOGIN_SCREEN_STATES: readonly LoginScreenState[] = [
  {
    id: "login-default",
    loginState: "default",
    name: "Login · Default",
    pencilNodeId: "EwUtO",
    route: "/login",
    screenNumber: 139,
    theme: "dark",
  },
  {
    id: "login-processing",
    loginState: "processing",
    name: "Login · Processing",
    pencilNodeId: "F4Qlk",
    route: "/login?loginState=login-processing",
    screenNumber: 140,
    theme: "dark",
  },
  {
    id: "login-oauth-canceled",
    loginState: "canceled",
    name: "Login · OAuth Canceled",
    pencilNodeId: "rENHC",
    route: "/login?loginState=login-oauth-canceled",
    screenNumber: 141,
    theme: "dark",
  },
  {
    id: "login-oauth-failed",
    loginState: "failed",
    name: "Login · OAuth Failed",
    pencilNodeId: "vJY2I",
    route: "/login?loginState=login-oauth-failed",
    screenNumber: 142,
    theme: "dark",
  },
  {
    id: "login-session-expired",
    loginState: "session-expired",
    name: "Login · Session Expired",
    pencilNodeId: "y578o",
    route: "/login?loginState=login-session-expired",
    screenNumber: 143,
    theme: "dark",
  },
  {
    id: "login-default-light",
    loginState: "default",
    name: "Login · Default · Light",
    pencilNodeId: "sSVhG",
    route: "/login?loginState=login-default-light",
    screenNumber: 144,
    theme: "light",
  },
] as const;

export function resolveLoginScreenState(value: string | null | undefined) {
  return LOGIN_SCREEN_STATES.find((state) => state.id === value);
}
