"use client";

import { useRuntimeConfig } from "@/config/runtime-config-provider";

import { LoginPage } from "./login-page";

export function LoginRoute() {
  const runtime = useRuntimeConfig();

  return (
    <LoginPage
      privacyUrl={runtime.config?.privacyPolicyUrl ?? undefined}
      termsUrl={runtime.config?.termsOfServiceUrl ?? undefined}
    />
  );
}
