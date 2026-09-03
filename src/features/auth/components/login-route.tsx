"use client";

import { useRouter, useSearchParams } from "next/navigation";

import { useRuntimeConfig } from "@/config/runtime-config-provider";

import type { GoogleAuthOutcome } from "../auth-model";
import { resolveLoginScreenState } from "../auth-states";
import { LoginPage } from "./login-page";

export interface LoginRouteProps {
  onNavigate?: (href: string) => void;
  startGoogleOAuth?: () => GoogleAuthOutcome | Promise<GoogleAuthOutcome>;
}

function assumeGoogleAuthenticationSuccess(): GoogleAuthOutcome {
  return { status: "success" };
}

export function LoginRoute({
  onNavigate,
  startGoogleOAuth,
}: LoginRouteProps = {}) {
  const runtime = useRuntimeConfig();
  const router = useRouter();
  const searchParams = useSearchParams();
  const scenario = resolveLoginScreenState(searchParams.get("loginState"));

  return (
    <LoginPage
      initialState={scenario?.loginState}
      onNavigate={onNavigate ?? router.push}
      privacyUrl={runtime.config?.privacyPolicyUrl ?? undefined}
      startGoogleOAuth={startGoogleOAuth ?? assumeGoogleAuthenticationSuccess}
      termsUrl={runtime.config?.termsOfServiceUrl ?? undefined}
      theme={scenario?.theme === "light" ? "light" : undefined}
    />
  );
}
