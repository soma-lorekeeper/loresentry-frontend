import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { RefreshRun } from "@/domain/models";

import {
  refreshReadyParameters,
  trackRefresh,
  useRefreshAnalytics,
} from "./refresh-analytics";

const run: RefreshRun = {
  id: "secret-run",
  projectId: "secret-project",
  status: "READY",
  startedAt: "2026-10-30T00:00:00Z",
  readyAt: "2026-10-30T00:02:05Z",
  completedAt: null,
  error: null,
  counts: { total: 4, created: 0, matched: 2 },
};

afterEach(() => {
  delete window.gtag;
});

describe("refresh analytics", () => {
  it("sends only counts and server duration, preserving a known zero", () => {
    expect(refreshReadyParameters(run)).toEqual({
      draft_count: 4,
      new_document_draft_count: 0,
      duration_seconds: 125,
    });
  });

  it("omits invalid timestamps and counts rather than inventing zeros", () => {
    expect(
      refreshReadyParameters({
        ...run,
        readyAt: "invalid",
        counts: { ...run.counts, total: -1, created: NaN },
      }),
    ).toEqual({});
    expect(
      refreshReadyParameters({ ...run, readyAt: "2026-10-29T00:00:00Z" }),
    ).not.toHaveProperty("duration_seconds");
  });

  it("does not send in the default mock environment even if a tag exists", () => {
    window.gtag = vi.fn();
    const { result } = renderHook(() => useRefreshAnalytics());
    result.current("refresh_start_click");
    expect(window.gtag).not.toHaveBeenCalled();
  });

  it("never lets a tag failure interrupt the feature", () => {
    window.gtag = vi.fn(() => {
      throw new Error("blocked");
    });
    expect(() => trackRefresh("refresh_start_click")).not.toThrow();
  });
});
