import { act, render, renderHook } from "@testing-library/react";
import { QueryClient } from "@tanstack/react-query";
import type { SettingCheckRun } from "@/domain/setting-check";
import { observeSettingCheck } from "./setting-check-analytics";
import { StrictMode, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_RUNTIME_CONFIG } from "@/config/runtime-config";
import { ServiceError } from "@/services/errors";
import {
  beginUsage,
  configureUsageAnalytics,
  suspendUsageAnalytics,
  trackUsage,
  withUsageAction,
} from "./usage-analytics";
import { sanitizeUsage } from "./usage-schema";
import { DocumentUsageRecorder } from "./document-usage";
import {
  useDialogUsage,
  UsageViewBoundary,
  useUsageViewState,
} from "./usage-hooks";

const enabled = vi.hoisted(() => vi.fn(() => true));
vi.mock("./google-analytics", () => ({
  analyticsEnabled: enabled,
  installGoogleAnalytics: () => window.gtag,
}));
const events = () =>
  vi.mocked(window.gtag!).mock.calls.filter((call) => call[0] === "event");
beforeEach(() => {
  enabled.mockReturnValue(true);
  window.gtag = vi.fn();
  configureUsageAnalytics(DEFAULT_RUNTIME_CONFIG);
});
afterEach(() => {
  configureUsageAnalytics(null);
  delete window.gtag;
  vi.useRealTimers();
});

describe("usage measurement boundaries", () => {
  it("never sends content, identifiers, unknown enum values or invalid numbers", () => {
    expect(
      sanitizeUsage("chat_turn_result", {
        outcome: "completed",
        send_mode: "new",
        intent: "ask",
        has_quote: 0,
        citation_count: 0,
        content: "private",
        project_id: "secret",
      }),
    ).toEqual({
      outcome: "completed",
      send_mode: "new",
      intent: "ask",
      has_quote: 0,
      citation_count: 0,
    });
    expect(
      sanitizeUsage("file_action_result", {
        action: "rename",
        entity_kind: "document",
        outcome: "success",
        duration_seconds: NaN,
      }),
    ).toBeNull();
    expect(
      sanitizeUsage("chat_turn_result", { outcome: "private" }),
    ).toBeNull();
    expect(
      sanitizeUsage("preference_selected", {
        preference: "theme",
        value: "ko",
      }),
    ).toBeNull();
    expect(
      sanitizeUsage("exploration_action", {
        area: "timeline",
        action: "zoom_button",
      }),
    ).toBeNull();
  });
  it("does not interrupt an operation when analytics throws or is disabled", async () => {
    window.gtag = vi.fn(() => {
      throw new Error("tracker blocked");
    });
    await expect(
      withUsageAction("memo", "create", async () => 42, { memo_scope: "file" }),
    ).resolves.toBe(42);
    enabled.mockReturnValue(false);
    window.gtag = vi.fn();
    trackUsage("feedback_submit_started");
    expect(events()).toHaveLength(0);
  });
  it("settles each attempt once and resolves only a previously unknown attempt", () => {
    const attempt = beginUsage("file_action_started", "file_action_result", {
      action: "rename",
      entity_kind: "document",
    });
    attempt.resolve("file", "success");
    attempt.fail(new ServiceError("network", "private server detail"));
    attempt.finish({ outcome: "success" });
    attempt.resolve("file", "success");
    attempt.resolve("file", "success");
    expect(events().map((call) => call[1])).toEqual([
      "file_action_started",
      "file_action_result",
      "action_result_resolved",
    ]);
    expect(JSON.stringify(events())).not.toContain("private server detail");
  });
  it("suppresses demo operations until every suspension has been released", () => {
    const first = suspendUsageAnalytics(),
      second = suspendUsageAnalytics();
    first();
    first();
    trackUsage("feedback_submit_started");
    trackUsage("workspace_tour_finished", { outcome: "skipped" });
    second();
    trackUsage("feedback_submit_started");
    expect(events().map((call) => call[1])).toEqual([
      "workspace_tour_finished",
      "feedback_submit_started",
    ]);
  });
  it("does not count hidden views, StrictMode replays or background refetch as opens", () => {
    function Child({ pending }: { pending: boolean }) {
      useUsageViewState({ outcome: "ready", pending }, "memo");
      return null;
    }
    const tree = (visible: boolean, pending: boolean) => (
      <StrictMode>
        <UsageViewBoundary kind="memo" visible={visible}>
          <Child pending={pending} />
        </UsageViewBoundary>
      </StrictMode>
    );
    const view = render(tree(false, false));
    expect(events()).toHaveLength(0);
    view.rerender(tree(true, true));
    expect(events().map((call) => call[1])).toEqual(["workspace_view_opened"]);
    view.rerender(tree(true, false));
    view.rerender(tree(true, true));
    view.rerender(tree(true, false));
    expect(events().map((call) => call[1])).toEqual([
      "workspace_view_opened",
      "workspace_view_loaded",
    ]);
    view.rerender(tree(false, false));
    view.rerender(tree(true, false));
    expect(events()).toHaveLength(4);
  });
  it("closes a dialog once after StrictMode and records accepted submission separately", async () => {
    const wrapper = ({ children }: { children: ReactNode }) => (
      <StrictMode>{children}</StrictMode>
    );
    const hook = renderHook(({ open }) => useDialogUsage("feedback", open), {
      wrapper,
      initialProps: { open: true },
    });
    await act(async () => {});
    expect(events()).toHaveLength(1);
    act(() => {
      hook.result.current.edited();
      hook.result.current.submitted();
    });
    hook.rerender({ open: false });
    await act(async () => {});
    expect(events()).toHaveLength(2);
    expect(events()[1][2]).toMatchObject({
      outcome: "submitted",
      had_input: 1,
    });
  });
  it("counts actual saves and one continuous issue, then acknowledges recovery", () => {
    vi.useFakeTimers();
    const recorder = new DocumentUsageRecorder();
    recorder.loaded("manuscript");
    recorder.changed({ body: true, title: false, properties: false });
    recorder.saving();
    recorder.issue("error");
    recorder.issue("error");
    recorder.flush();
    recorder.flush();
    recorder.saving();
    recorder.saved();
    recorder.flush();
    const calls = events();
    expect(
      calls.filter((call) => call[1] === "document_save_issue"),
    ).toHaveLength(1);
    expect(
      calls.filter((call) => call[1] === "document_save_recovered"),
    ).toHaveLength(1);
    expect(
      calls
        .filter((call) => call[1] === "document_edit_summary")
        .map((call) => call[2]),
    ).toMatchObject([
      { save_attempt_count: 1, save_success_count: 0, save_issue_count: 1 },
      { save_attempt_count: 1, save_success_count: 1, save_issue_count: 0 },
    ]);
  });
});

describe("asynchronous observations", () => {
  it("keeps terminal check observations monotonic across late polling responses", () => {
    const client = new QueryClient();
    const run: SettingCheckRun = {
      id: "private-run",
      projectId: "private-project",
      documentId: "private-file",
      documentTitle: "private title",
      revisionNo: 1,
      status: "RUNNING",
      stage: "READING",
      createdAt: "2026-11-03T00:00:00Z",
      finishedAt: null,
      read: {
        manuscripts: 1,
        fromOrdinal: 1,
        toOrdinal: 1,
        settings: 0,
        coreFacts: 0,
      },
      counts: { open: 0, intended: 0, notConflict: 0 },
      failureCode: null,
    };
    observeSettingCheck(client, { ...run, id: "historical", status: "DONE" });
    observeSettingCheck(client, run);
    observeSettingCheck(client, {
      ...run,
      status: "DONE",
      finishedAt: "2026-11-03T00:00:10Z",
    });
    observeSettingCheck(client, run);
    observeSettingCheck(client, { ...run, status: "DONE" });
    observeSettingCheck(client, { ...run, id: "cancelled" });
    observeSettingCheck(client, {
      ...run,
      id: "cancelled",
      status: "CANCELLED",
    });
    expect(events().map((call) => call[2])).toMatchObject([
      { outcome: "done", finding_count: 0, processing_seconds: 10 },
      { outcome: "cancelled", finding_count: 0 },
    ]);
    expect(JSON.stringify(events())).not.toContain("private");
    client.clear();
  });
  it("preserves foreground editing time across periodic summary windows", async () => {
    vi.useFakeTimers();
    const recorder = new DocumentUsageRecorder();
    recorder.loaded("manuscript");
    recorder.changed({ body: true, title: false, properties: false });
    await vi.advanceTimersByTimeAsync(59_000);
    recorder.changed({ body: true, title: false, properties: false });
    await vi.advanceTimersByTimeAsync(6_000);
    recorder.changed({ body: true, title: false, properties: false });
    recorder.flush();
    const seconds = events()
      .filter((call) => call[1] === "document_edit_summary")
      .map(
        (call) =>
          (call[2] as { active_edit_seconds: number }).active_edit_seconds,
      );
    expect(seconds).toEqual([31, 5]);
  });
  it("does not invent a dialog close when a retained session is disposed", async () => {
    const hook = renderHook(() => useDialogUsage("refresh_review", true));
    hook.unmount();
    await act(async () => {});
    expect(events().map((call) => call[1])).toEqual(["action_dialog_opened"]);
  });
});
