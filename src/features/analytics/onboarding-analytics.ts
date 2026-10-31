"use client";

import { useCallback } from "react";
import { useRuntimeConfig } from "@/app/providers";
import { useServices } from "@/services/services-context";
import { isServiceError } from "@/services/errors";
import { analyticsEnabled, installGoogleAnalytics } from "./google-analytics";

type Event =
  | "login_start"
  | "login"
  | "auth_failed"
  | "signup_terms_viewed"
  | "sign_up"
  | "tutorial_begin"
  | "tutorial_complete"
  | "onboarding_start_selected"
  | "project_create_started"
  | "project_created"
  | "project_create_failed"
  | "workspace_entered"
  | "manuscript_saved";

type Parameters = Record<string, string>;

let pendingRegistration: Promise<void> | null = null;
const journeyEvents = new Set<Event>([
  "tutorial_begin",
  "tutorial_complete",
  "onboarding_start_selected",
  "project_create_started",
  "project_created",
  "project_create_failed",
  "workspace_entered",
  "manuscript_saved",
]);

export function useOnboardingAnalytics() {
  const config = useRuntimeConfig();
  return useCallback(
    (event: Event, parameters?: Parameters) => {
      try {
        if (
          typeof window !== "undefined" &&
          analyticsEnabled(config, window.location.hostname)
        )
          if (pendingRegistration && journeyEvents.has(event)) {
            void pendingRegistration.then(() => {
              try {
                window.gtag?.("event", event, parameters ?? {});
              } catch {
                /* best effort */
              }
            });
          } else window.gtag?.("event", event, parameters ?? {});
      } catch {
        // Analytics must not interrupt user actions.
      }
    },
    [config],
  );
}

export function projectFailureReason(error: unknown): string | null {
  if (
    !isServiceError(error) ||
    error.code === "network" ||
    error.code === "unknown"
  )
    return null;
  return error.code === "unavailable" ? "unavailable" : "rejected";
}

/** Claim only when the tag is usable; the server keeps an atomic pending marker. */
export function useRegistrationAnalytics() {
  const config = useRuntimeConfig();
  const { auth } = useServices();
  return useCallback(
    (kind: "consent" | "session") => {
      if (
        typeof window === "undefined" ||
        !analyticsEnabled(config, window.location.hostname)
      )
        return;
      try {
        const tag = installGoogleAnalytics(config.gaMeasurementId);
        if (pendingRegistration) {
          if (kind === "session") {
            void pendingRegistration.then(() => {
              void auth
                .claimRegistrationAnalytics("session")
                .then((registered) => {
                  if (registered) {
                    try {
                      tag("event", "sign_up", { method: "google" });
                    } catch {
                      /* best effort */
                    }
                  }
                })
                .catch(() => {});
            });
          }
          return;
        }
        const request = auth
          .claimRegistrationAnalytics(kind)
          .then((registered) => {
            if (registered) {
              try {
                tag("event", "sign_up", { method: "google" });
              } catch {
                /* best effort */
              }
            }
          })
          .catch(() => {});
        // Never delay a user action, and do not hold later analytics indefinitely.
        const pending = Promise.race([
          request,
          new Promise<void>((resolve) => window.setTimeout(resolve, 3000)),
        ]);
        pendingRegistration = pending;
        void pending.then(() => {
          if (pendingRegistration === pending) pendingRegistration = null;
        });
      } catch {
        /* Analytics never interrupts authentication. */
      }
    },
    [config, auth],
  );
}
