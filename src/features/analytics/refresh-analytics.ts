"use client";

import { useCallback } from "react";
import { useRuntimeConfig } from "@/app/providers";
import { analyticsEnabled } from "./google-analytics";

import type { RefreshRun } from "@/domain/models";

export type RefreshEvent =
  | "refresh_start_click"
  | "refresh_started"
  | "refresh_no_changes"
  | "refresh_start_failed"
  | "refresh_result_ready"
  | "refresh_result_no_change"
  | "refresh_result_failed"
  | "refresh_review_opened"
  | "refresh_apply_click"
  | "refresh_apply_failed"
  | "refresh_applied";

type Parameters = Record<string, number | string>;

export function useRefreshAnalytics() {
  const config = useRuntimeConfig();
  return useCallback(
    (event: RefreshEvent, parameters?: Parameters) => {
      if (
        typeof window !== "undefined" &&
        analyticsEnabled(config, window.location.hostname)
      )
        trackRefresh(event, parameters);
    },
    [config],
  );
}

/** Measurements must never interrupt the action being measured. */
export function trackRefresh(event: RefreshEvent, parameters?: Parameters) {
  try {
    if (typeof window !== "undefined")
      window.gtag?.("event", event, parameters ?? {});
  } catch {
    // Analytics is best effort.
  }
}

export function refreshDraftCounts(run: RefreshRun): Parameters {
  const result: Parameters = {};
  if (Number.isSafeInteger(run.counts.total) && run.counts.total >= 0)
    result.draft_count = run.counts.total;
  if (Number.isSafeInteger(run.counts.created) && run.counts.created >= 0)
    result.new_document_draft_count = run.counts.created;
  return result;
}

export function refreshReadyParameters(run: RefreshRun): Parameters {
  const result = refreshDraftCounts(run);
  if (run.startedAt && run.readyAt) {
    const seconds =
      (Date.parse(run.readyAt) - Date.parse(run.startedAt)) / 1000;
    if (Number.isFinite(seconds) && seconds >= 0)
      result.duration_seconds = seconds;
  }
  return result;
}
