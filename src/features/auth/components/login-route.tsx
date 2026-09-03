"use client";

import { useSearchParams } from "next/navigation";

import { useRuntimeConfig } from "@/config/runtime-config-provider";

import type { GoogleAuthOutcome, LoginState } from "../auth-model";
import { LoginPage } from "./login-page";

const routeStates: Record<string, { state: LoginState; theme?: "light" }> = {
  "default-light": { state: "default", theme: "light" },
  "oauth-canceled": { state: "canceled" },
  "oauth-failed": { state: "failed" },
  processing: { state: "processing" },
  "session-expired": { state: "session-expired" },
};

export interface LoginRouteProps {
  onNavigate?: (href: string) => void;
  startGoogleOAuth?: () => GoogleAuthOutcome | Promise<GoogleAuthOutcome>;
}

export function LoginRoute({
  onNavigate,
  startGoogleOAuth,
}: LoginRouteProps = {}) {
  const runtime = useRuntimeConfig();
  const searchParams = useSearchParams();
  const scenario = routeStates[searchParams.get("loginState") ?? ""];

  return (
    <LoginPage
      initialState={scenario?.state}
      onNavigate={onNavigate}
      privacyUrl={runtime.config?.privacyPolicyUrl ?? undefined}
      startGoogleOAuth={startGoogleOAuth}
      termsUrl={runtime.config?.termsOfServiceUrl ?? undefined}
      theme={scenario?.theme}
    />
  );
}
