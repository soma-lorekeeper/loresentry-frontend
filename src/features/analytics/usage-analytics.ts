import type { RuntimeConfig } from "@/config/runtime-config";
import { LOCALE } from "@/i18n";
import { isServiceError } from "@/services/errors";
import { analyticsEnabled, installGoogleAnalytics } from "./google-analytics";
import {
  sanitizeUsage,
  type UsageContext,
  type UsageEvent,
  type UsageParameters,
} from "./usage-schema";

let config: RuntimeConfig | null = null;
let demoDepth = 0;

export function configureUsageAnalytics(next: RuntimeConfig | null) {
  config = next;
  try {
    if (
      next &&
      typeof window !== "undefined" &&
      analyticsEnabled(next, window.location.hostname)
    )
      installGoogleAnalytics(next.gaMeasurementId);
  } catch {
    /* Analytics cannot affect configuration or navigation. */
  }
}

export function suspendUsageAnalytics() {
  demoDepth++;
  let released = false;
  return () => {
    if (!released) {
      released = true;
      demoDepth--;
    }
  };
}

export function usageEnabled() {
  return (
    typeof window !== "undefined" &&
    config !== null &&
    analyticsEnabled(config, window.location.hostname)
  );
}

function emitUsage(event: UsageEvent, parameters: Record<string, unknown>) {
  try {
    if (
      !usageEnabled() ||
      (demoDepth > 0 && !event.startsWith("workspace_tour_"))
    )
      return;
    const safe = sanitizeUsage(event, parameters);
    if (safe)
      window.gtag?.("event", event, {
        ...safe,
        schema_version: "usage_v1",
        ui_locale: LOCALE,
      });
  } catch {
    /* A failing tracker never interrupts the measured operation. */
  }
}

export function trackUsage<E extends UsageEvent>(
  event: E,
  parameters: UsageParameters<E> = {},
) {
  emitUsage(event, parameters);
}

export function elapsedSeconds(started: number) {
  return Math.max(0, (performance.now() - started) / 1000);
}

type ErrorTags = {
  outcome?: "rejected" | "blocked" | "unknown";
  error_category?: string;
  stage?: string;
  chat_outcome?: "failed" | "rejected";
};
const tags = new WeakMap<object, ErrorTags>();
export function tagUsageError<T>(error: T, details: ErrorTags): T {
  if (error !== null && typeof error === "object")
    tags.set(error, { ...tags.get(error), ...details });
  return error;
}
export function usageFailure(error: unknown): {
  outcome: "rejected" | "blocked" | "unknown";
  error_category: string;
  stage?: string;
  chat_outcome?: "failed" | "rejected";
} {
  const marked =
    error !== null && typeof error === "object" ? tags.get(error) : undefined;
  const code = isServiceError(error) ? error.code : "unknown";
  const category =
    code === "unauthenticated" || code === "consent-invalid"
      ? "auth"
      : code === "not-found"
        ? "not_found"
        : ["locked", "refresh-locked"].includes(code)
          ? "locked"
          : code === "duplicate"
            ? "conflict"
            : [
                  "validation",
                  "terms-version-mismatch",
                  "csrf-rejected",
                  "confirmation-mismatch",
                ].includes(code)
              ? "validation"
              : ["network", "unavailable"].includes(code)
                ? code
                : "other";
  return {
    outcome: ["network", "unknown"].includes(code) ? "unknown" : "rejected",
    error_category: category,
    ...marked,
  };
}

/** All tokens/IDs remain inside this closure; GA receives only the catalog fields. */
export function beginUsage(
  start: UsageEvent,
  result: UsageEvent,
  context: Record<string, unknown> = {},
) {
  const started = performance.now();
  let settled = false;
  let unknown = false;
  let resolved = false;
  emitUsage(start, context);
  return {
    finish(parameters: Record<string, unknown>) {
      if (settled) return;
      settled = true;
      unknown = parameters.outcome === "unknown";
      emitUsage(result, {
        ...context,
        ...parameters,
        duration_seconds: elapsedSeconds(started),
      });
    },
    fail(error: unknown, extra: Record<string, unknown> = {}) {
      this.finish({ ...usageFailure(error), ...extra });
    },
    /** Caller must possess a conclusive acknowledgment for this same attempt. */
    resolve(
      operation_group: UsageParameters<"action_result_resolved">["operation_group"],
      outcome: "success" | "rejected" | "accepted",
    ) {
      if (!unknown || resolved) return;
      resolved = true;
      emitUsage("action_result_resolved", {
        operation_group,
        action: context.action,
        outcome,
        duration_seconds: elapsedSeconds(started),
      });
    },
    started,
  };
}

export function beginChatUsage(
  intent: "ask" | "explain" | "related" | "flow",
  hasQuote: boolean,
  sendMode: "new" | "retry" | "edit" = "new",
  entryPoint: UsageContext["entry_point"] = "chat_conversation",
) {
  return beginUsage("chat_turn_started", "chat_turn_result", {
    intent,
    has_quote: hasQuote ? 1 : 0,
    send_mode: sendMode,
    entry_point: entryPoint,
  });
}

const groups = {
  project: ["project_action_started", "project_action_result"],
  file: ["file_action_started", "file_action_result"],
  document: ["document_action_started", "document_action_result"],
  memo: ["memo_action_started", "memo_action_result"],
  chat_session: ["chat_session_action_started", "chat_session_action_result"],
  account: ["account_action_started", "account_action_result"],
} as const;
type ActionGroup = keyof typeof groups;
type GroupAction<G extends ActionGroup> =
  UsageParameters<(typeof groups)[G][0]> extends { action?: infer A }
    ? A
    : never;
export async function withUsageAction<G extends ActionGroup, T>(
  group: G,
  action: GroupAction<G>,
  run: () => Promise<T>,
  context: UsageContext & Record<string, unknown> = {},
) {
  const [start, result] = groups[group];
  const attempt = beginUsage(start, result, {
    entry_point: "other",
    ...context,
    action,
  });
  try {
    const value = await run();
    attempt.finish({ outcome: "success" });
    return value;
  } catch (error) {
    attempt.fail(error);
    throw error;
  }
}

export function countBucket(
  count: number,
): "0" | "1" | "2_5" | "6_20" | "21_plus" {
  return count === 0
    ? "0"
    : count === 1
      ? "1"
      : count <= 5
        ? "2_5"
        : count <= 20
          ? "6_20"
          : "21_plus";
}
