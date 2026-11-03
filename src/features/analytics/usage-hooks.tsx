"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type { DocumentType } from "@/domain/document-types";
import { isServiceError } from "@/services/errors";
import { elapsedSeconds, trackUsage, usageFailure } from "./usage-analytics";
import type { EntryPoint, UsageEvent, UsageParameters } from "./usage-schema";

type ViewKind = NonNullable<
  UsageParameters<"workspace_view_opened">["view_kind"]
>;
type ViewState = {
  pending?: boolean;
  refreshing?: boolean;
  outcome: "ready" | "empty" | "error" | "unavailable";
  document_type?: DocumentType;
  error?: unknown;
};
type ViewObservation = {
  visible: boolean;
  kind: ViewKind;
  report: (state: ViewState) => void;
  retry: () => void;
};
const ViewUsageContext = createContext<ViewObservation | null>(null);

export function UsageViewBoundary({
  children,
  visible,
  kind,
  entryPoint = "other",
  paneVisible = visible,
}: {
  children: ReactNode;
  visible: boolean;
  paneVisible?: boolean;
  kind: ViewKind;
  entryPoint?: EntryPoint;
}) {
  const observation = useRef({
    active: false,
    loaded: false,
    retry: false,
    started: 0,
  });
  const context = useMemo<ViewObservation>(() => {
    const activate = () => {
      const state = observation.current;
      if (!visible) return false;
      if (!state.active) {
        state.active = true;
        state.loaded = false;
        state.retry = false;
        state.started = performance.now();
        trackUsage("workspace_view_opened", {
          view_kind: kind,
          entry_point: entryPoint,
        });
      }
      return true;
    };
    return {
      visible: paneVisible,
      kind,
      report(data) {
        if (!activate()) return;
        const state = observation.current;
        if (state.loaded || data.pending || (state.retry && data.refreshing))
          return;
        state.loaded = true;
        const category = data.error
          ? usageFailure(data.error).error_category
          : undefined;
        trackUsage("workspace_view_loaded", {
          view_kind: kind,
          document_type: data.document_type,
          outcome: data.outcome,
          is_retry: state.retry ? 1 : 0,
          duration_seconds: elapsedSeconds(state.started),
          error_category:
            category as UsageParameters<"workspace_view_loaded">["error_category"],
        });
      },
      retry() {
        if (activate()) {
          observation.current.loaded = false;
          observation.current.retry = true;
          observation.current.started = performance.now();
        }
      },
    };
  }, [visible, paneVisible, kind, entryPoint]);
  useEffect(() => {
    if (!visible) observation.current.active = false;
    else {
      // A pending view is still opened, even if it never reaches a settled result.
      context.report({ outcome: "ready", pending: true });
    }
  }, [visible, context]);
  return (
    <ViewUsageContext.Provider value={context}>
      {children}
    </ViewUsageContext.Provider>
  );
}

export function useUsageViewState(state: ViewState, expected?: ViewKind) {
  const context = useContext(ViewUsageContext);
  const { pending, refreshing, outcome, document_type, error } = state;
  useEffect(() => {
    if (context && (!expected || context.kind === expected))
      context.report({ pending, refreshing, outcome, document_type, error });
  }, [context, expected, pending, refreshing, outcome, document_type, error]);
  return useCallback(() => context?.retry(), [context]);
}

export function useUsageViewQuery(
  query: {
    isPending: boolean;
    isFetching: boolean;
    isError: boolean;
    error: unknown;
  },
  empty = false,
  expected?: ViewKind,
  document_type?: DocumentType,
) {
  return useUsageViewState(
    {
      pending: query.isPending,
      refreshing: query.isFetching,
      outcome: query.isError
        ? isServiceError(query.error) && query.error.code === "unavailable"
          ? "unavailable"
          : "error"
        : empty
          ? "empty"
          : "ready",
      error: query.isError ? query.error : undefined,
      document_type,
    },
    expected,
  );
}

export function useUsageViewVisible() {
  return useContext(ViewUsageContext)?.visible ?? true;
}

export function useVisibleUsage<E extends UsageEvent>(
  event: E,
  parameters: UsageParameters<E>,
  visible: boolean,
  key: string,
) {
  const last = useRef<string | null>(null);
  const current = useRef(parameters);
  useEffect(() => {
    current.current = parameters;
  });
  useEffect(() => {
    if (!visible) {
      last.current = null;
      return;
    }
    if (last.current === key) return;
    last.current = key;
    trackUsage(event, current.current);
  }, [event, visible, key]);
}

export function useDialogUsage(
  kind: NonNullable<UsageParameters<"action_dialog_opened">["dialog_kind"]>,
  open: boolean,
  entryPoint: EntryPoint = "other",
) {
  const state = useRef({
    open: false,
    submitted: false,
    edited: false,
    generation: 0,
  });
  const close = useCallback(() => {
    const current = state.current;
    if (!current.open) return;
    current.open = false;
    trackUsage("action_dialog_closed", {
      dialog_kind: kind,
      outcome: current.submitted ? "submitted" : "dismissed",
      had_input: current.edited ? 1 : 0,
    });
  }, [kind]);
  useEffect(() => {
    const current = state.current;
    ++current.generation;
    if (open && !current.open) {
      current.open = true;
      current.submitted = false;
      current.edited = false;
      trackUsage("action_dialog_opened", {
        dialog_kind: kind,
        entry_point: entryPoint,
      });
    } else if (!open) close();
  }, [open, kind, entryPoint, close]);
  return useMemo(
    () => ({
      closed: close,
      submitted: () => {
        state.current.submitted = true;
      },
      edited: () => {
        state.current.edited = true;
      },
    }),
    [close],
  );
}

/** Debounced local search use; the text is only a local timer key. */
export function useLocalSearchUsage(
  query: string,
  resultCount: number,
  area: "graph" | "timeline" | "help",
) {
  const previous = useRef("");
  const count = useRef(resultCount);
  const visible = useUsageViewVisible();
  useEffect(() => {
    count.current = resultCount;
  }, [resultCount]);
  useEffect(() => {
    if (!visible) return;
    const value = query.trim();
    if (value === previous.current) return;
    const timer = window.setTimeout(() => {
      const hadSearch = previous.current !== "";
      previous.current = value;
      const n = count.current;
      const bucket =
        n === 0
          ? "0"
          : n === 1
            ? "1"
            : n <= 5
              ? "2_5"
              : n <= 20
                ? "6_20"
                : "21_plus";
      if (area === "help") {
        if (value)
          trackUsage("help_action", {
            action: "search",
            entry_point: "guide",
            count_bucket: bucket,
          });
      } else if (value || hadSearch)
        trackUsage("exploration_action", {
          area,
          action: value ? "search" : "clear_search",
          entry_point: area,
          count_bucket: value ? bucket : undefined,
        });
    }, 500);
    return () => window.clearTimeout(timer);
  }, [query, area, visible]);
}
