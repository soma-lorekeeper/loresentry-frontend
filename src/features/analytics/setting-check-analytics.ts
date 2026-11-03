import type { QueryClient } from "@tanstack/react-query";
import type { SettingCheckRun } from "@/domain/setting-check";
import { trackUsage, usageEnabled } from "./usage-analytics";

const observations = new WeakMap<
  QueryClient,
  Map<string, SettingCheckRun["status"]>
>();

/** Summary, detail and start acknowledgment share one local observer per query client. */
export function observeSettingCheck(
  client: QueryClient,
  run: SettingCheckRun | null,
) {
  if (!run || !usageEnabled()) return;
  let seen = observations.get(client);
  if (!seen) {
    seen = new Map();
    observations.set(client, seen);
  }
  const previous = seen.get(run.id);
  if (previous && previous !== "RUNNING") return;
  seen.set(run.id, run.status);
  if (seen.size > 200) seen.delete(seen.keys().next().value!);
  if (previous !== "RUNNING" || run.status === "RUNNING") return;
  const values = [run.counts.open, run.counts.intended, run.counts.notConflict];
  const count = values.every(
    (value) => Number.isSafeInteger(value) && value >= 0,
  )
    ? values.reduce((a, b) => a + b, 0)
    : undefined;
  const seconds = run.finishedAt
    ? (Date.parse(run.finishedAt) - Date.parse(run.createdAt)) / 1000
    : undefined;
  trackUsage("setting_check_run_observed", {
    outcome:
      run.status === "DONE"
        ? "done"
        : run.status === "CANCELLED"
          ? "cancelled"
          : "failed",
    finding_count: count,
    processing_seconds:
      typeof seconds === "number" && Number.isFinite(seconds) && seconds >= 0
        ? seconds
        : undefined,
    error_category: run.status === "FAILED" ? "other" : undefined,
  });
}
