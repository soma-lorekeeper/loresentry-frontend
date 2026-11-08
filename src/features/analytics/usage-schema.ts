/** The event boundary deliberately accepts categories and numbers, never domain objects. */
const choices = <const T extends readonly (string | number)[]>(...values: T) =>
  values;
const flag = choices(0, 1);
export const ENTRY_POINTS = choices(
  "landing_header",
  "landing_body",
  "landing_footer",
  "project_list",
  "onboarding",
  "sidebar",
  "new_tab",
  "file_menu",
  "document_header",
  "editor",
  "search",
  "graph",
  "timeline",
  "memo_panel",
  "chat_launcher",
  "chat_home",
  "chat_conversation",
  "selection_toolbar",
  "check_home",
  "check_report",
  "check_toast",
  "refresh_sidebar",
  "refresh_review",
  "account_menu",
  "guide",
  "shortcut",
  "other",
);
export type EntryPoint = (typeof ENTRY_POINTS)[number];
const documentType = choices(
  "manuscript",
  "character",
  "place",
  "organization",
  "item",
  "event",
  "worldview",
);
const entry = { entry_point: ENTRY_POINTS };
const document = { document_type: documentType };
const failure = {
  error_category: choices(
    "network",
    "auth",
    "validation",
    "conflict",
    "locked",
    "not_found",
    "unavailable",
    "limit",
    "cancelled",
    "other",
  ),
  stage: choices(
    "prepare",
    "save_documents",
    "request",
    "stream",
    "result_read",
    "image_ticket",
    "image_upload",
    "image_complete",
    "image_attach",
    "draft_save",
    "account_sync",
    "other",
  ),
  duration_seconds: "seconds",
} as const;
const mutationOutcome = choices("success", "rejected", "blocked", "unknown");
const project = {
  ...entry,
  action: choices("update_settings", "trash", "restore", "delete"),
};
const file = {
  ...entry,
  ...document,
  entity_kind: choices("document", "episode"),
  action: choices(
    "create",
    "rename",
    "move",
    "trash",
    "restore",
    "delete",
    "delete_episode",
    "favorite",
    "unfavorite",
    "set_image",
    "clear_image",
  ),
};
const documentAction = {
  ...entry,
  ...document,
  action: choices(
    "lock",
    "unlock",
    "save_version",
    "restore_version",
    "export",
  ),
  format: choices("txt", "md", "pdf", "docx", "hwp"),
};
const search = {
  ...entry,
  search_scope: choices("project", "chat"),
  is_retry: flag,
};
const bucket = choices("0", "1", "2_5", "6_20", "21_plus");
const memo = {
  ...entry,
  action: choices("create", "update", "delete"),
  memo_scope: choices("project", "file"),
};
const turn = {
  ...entry,
  send_mode: choices("new", "retry", "edit"),
  intent: choices("ask", "explain", "related", "flow"),
  has_quote: flag,
};
const session = {
  ...entry,
  action: choices("create", "rename", "delete"),
  creation_mode: choices("automatic", "explicit"),
};
const checkStart = {
  ...entry,
  start_mode: choices("first", "recheck", "retry"),
};
const verdict = {
  ...entry,
  action: choices("set", "clear"),
  verdict: choices("intended", "not_conflict"),
  has_reason: flag,
};
const account = {
  ...entry,
  action: choices(
    "accept_terms",
    "update_name",
    "sync_locale",
    "logout",
    "delete_account",
  ),
};
const dialog = {
  dialog_kind: choices(
    "project_create",
    "project_edit",
    "project_trash",
    "project_delete",
    "file_trash",
    "file_delete",
    "episode_delete",
    "import",
    "image_crop",
    "version_history",
    "refresh_start",
    "refresh_review",
    "setting_check_start",
    "account_settings",
    "account_delete",
    "logout",
    "feedback",
    "contact",
  ),
};
const view = {
  ...document,
  view_kind: choices(
    "new",
    "document",
    "search",
    "graph",
    "timeline",
    "memo",
    "setting_check",
    "trash",
    "settings",
    "help",
  ),
};
const steps = choices(
  "workspace",
  "editor",
  "relations",
  "graph",
  "timeline",
  "refresh",
  "chat",
  "name",
  "start",
);

export const USAGE_EVENTS = {
  landing_action: {
    ...entry,
    action: choices(
      "start_writing",
      "contact_copy",
      "contact_compose",
      "section_jump",
    ),
    outcome: choices("requested", "success", "rejected"),
  },
  action_dialog_opened: { ...entry, ...dialog },
  action_dialog_closed: {
    ...dialog,
    outcome: choices("dismissed", "submitted"),
    had_input: flag,
  },
  workspace_view_opened: { ...entry, ...view },
  workspace_view_loaded: {
    ...view,
    ...failure,
    is_retry: flag,
    outcome: choices("ready", "empty", "error", "unavailable"),
  },
  workspace_action: {
    ...entry,
    action: choices(
      "split",
      "move_tab",
      "reorder_tab",
      "close_tab",
      "sidebar_toggle",
    ),
    outcome: choices("changed"),
  },
  project_action_started: project,
  project_action_result: { ...project, ...failure, outcome: mutationOutcome },
  file_action_started: file,
  file_action_result: { ...file, ...failure, outcome: mutationOutcome },
  document_edit_summary: {
    ...document,
    body_changed: flag,
    title_changed: flag,
    properties_changed: flag,
    save_attempt_count: "count",
    save_success_count: "count",
    save_issue_count: "count",
    active_edit_seconds: "seconds",
  },
  document_save_issue: {
    ...document,
    error_category: failure.error_category,
    issue_kind: choices("error", "conflict", "locked", "expired"),
  },
  document_save_recovered: {
    ...document,
    duration_seconds: "seconds",
    resolution: choices("retry_saved", "keep_mine_saved", "take_theirs_loaded"),
  },
  document_structure_changed: {
    ...document,
    action: choices(
      "relation_add",
      "relation_remove",
      "relation_description",
      "alias_change",
      "core_mark",
      "core_unmark",
    ),
  },
  document_action_started: documentAction,
  document_action_result: {
    ...documentAction,
    ...failure,
    outcome: choices(...mutationOutcome, "download_handoff", "print_handoff"),
  },
  document_import_selected: {
    accepted_count: "count",
    unsupported_count: "count",
    duplicate_count: "count",
    input_method: choices("picker", "drop"),
  },
  document_import_started: {
    ...entry,
    file_count: "count",
    import_format: choices("text", "markdown", "mixed"),
    is_retry: flag,
  },
  document_import_result: {
    duration_seconds: "seconds",
    outcome: choices("success", "partial", "failed", "unknown"),
    file_count: "count",
    succeeded_count: "count",
    failed_count: "count",
    unknown_count: "count",
    is_retry: flag,
  },
  search_request_started: search,
  search_request_result: {
    ...search,
    ...failure,
    outcome: choices("results", "empty", "error", "superseded"),
    count_bucket: bucket,
  },
  search_result_selected: {
    ...entry,
    ...document,
    search_scope: search.search_scope,
    rank_bucket: choices("1", "2_5", "6_10", "11_plus"),
  },
  exploration_action: {
    ...entry,
    ...document,
    area: choices("graph", "timeline"),
    action: choices(
      "select_node",
      "clear_selection",
      "select_chapter",
      "open_document",
      "filter_kind",
      "filter_episode",
      "filter_row",
      "toggle_group",
      "search",
      "clear_search",
      "zoom_button",
      "fit",
    ),
    count_bucket: bucket,
  },
  memo_action_started: memo,
  memo_action_result: { ...memo, ...failure, outcome: mutationOutcome },
  memo_panel_action: {
    ...entry,
    action: choices("open", "close", "dock_right", "dock_bottom"),
  },
  chat_window_opened: {
    ...entry,
    availability: choices(
      "available",
      "too_large",
      "unavailable",
      "error",
      "loading",
    ),
  },
  chat_turn_started: turn,
  chat_turn_result: {
    ...turn,
    ...failure,
    outcome: choices(
      "completed",
      "stopped",
      "blocked",
      "rejected",
      "failed",
      "interrupted",
    ),
    first_content_seconds: "seconds",
    citation_count: "count",
  },
  chat_stop_requested: entry,
  chat_action: {
    ...entry,
    action: choices(
      "open_session",
      "attach_quote",
      "remove_quote",
      "use_suggestion",
      "edit_question",
      "copy_answer",
      "open_citation",
      "open_shortcut",
    ),
    outcome: choices("requested", "success", "rejected"),
    citation_kind: choices("document", "memo"),
    shortcut_kind: choices("tour", "import", "view", "guide"),
  },
  chat_session_action_started: session,
  chat_session_action_result: {
    ...session,
    ...failure,
    outcome: mutationOutcome,
  },
  feature_notice_viewed: {
    ...entry,
    feature: choices("chat", "setting_check", "refresh", "export"),
    notice_kind: choices(
      "too_large",
      "daily_limit",
      "concurrent",
      "unavailable",
      "stale",
      "unsaved",
      "error",
    ),
  },
  setting_check_start_requested: checkStart,
  setting_check_start_result: {
    ...checkStart,
    ...failure,
    outcome: choices("accepted", "blocked", "rejected", "unknown"),
  },
  setting_check_run_observed: {
    error_category: failure.error_category,
    outcome: choices("done", "failed", "cancelled"),
    finding_count: "count",
    processing_seconds: "seconds",
  },
  setting_check_cancel_requested: entry,
  setting_check_cancel_result: {
    ...entry,
    ...failure,
    outcome: choices("accepted", "rejected", "unknown"),
  },
  setting_check_report_viewed: { finding_count: "count", report_changed: flag },
  setting_check_finding_action: {
    ...entry,
    action: choices(
      "expand",
      "next",
      "previous",
      "open_source",
      "open_manuscript",
      "filter",
      "open_verdict_ledger",
    ),
    finding_kind: choices("setting", "manuscript"),
    is_core: flag,
    verdict: choices("intended", "not_conflict", "open"),
  },
  setting_check_verdict_started: verdict,
  setting_check_verdict_result: {
    ...verdict,
    ...failure,
    outcome: mutationOutcome,
  },
  refresh_review_action: {
    entry_point: choices("refresh_review"),
    action: choices(
      "select_draft",
      "filter",
      "choose_current",
      "choose_proposed",
      "edit_current",
      "edit_proposed",
      "reset",
    ),
    draft_kind: choices("existing", "new"),
  },
  refresh_review_closed: {
    close_reason: choices("dismissed", "applied", "ended"),
    had_local_edits: flag,
    unmatched_count: "count",
  },
  account_action_started: account,
  account_action_result: { ...account, ...failure, outcome: mutationOutcome },
  preference_selected: {
    ...entry,
    preference: choices("theme", "locale"),
    value: choices("system", "dark", "light", "ko", "en"),
  },
  onboarding_step_viewed: { step_key: steps },
  onboarding_completion_result: {
    ...failure,
    outcome: choices("success", "rejected", "unknown"),
    start_choice: choices("sample", "new", "later"),
  },
  help_action: {
    ...entry,
    action: choices(
      "topic_open",
      "search",
      "replay_onboarding",
      "start_tour",
      "shortcuts_open",
    ),
    topic_key: choices(
      "start",
      "workspace",
      "files",
      "writing",
      "explore",
      "refresh",
      "memo",
      "chat",
      "setting-check",
      "trash",
      "settings",
    ),
    count_bucket: bucket,
  },
  workspace_tour_started: entry,
  workspace_tour_finished: {
    outcome: choices("completed", "skipped"),
    step_key: steps,
  },
  feedback_submit_started: entry,
  feedback_submit_result: { ...entry, ...failure, outcome: mutationOutcome },
  action_result_resolved: {
    operation_group: choices(
      "project",
      "file",
      "document",
      "memo",
      "chat_session",
      "account",
      "feedback",
      "setting_check_start",
      "setting_check_cancel",
    ),
    action: choices(
      ...project.action,
      ...file.action,
      ...documentAction.action,
      ...memo.action,
      ...session.action,
      ...account.action,
      "set",
      "clear",
    ),
    outcome: choices("success", "rejected", "accepted"),
    duration_seconds: "seconds",
  },
} as const;

export type UsageEvent = keyof typeof USAGE_EVENTS;
type Value<Rule> = Rule extends readonly (infer T)[] ? T : number;
export type UsageParameters<E extends UsageEvent> = {
  [K in keyof (typeof USAGE_EVENTS)[E]]?: Value<(typeof USAGE_EVENTS)[E][K]>;
};
export type UsageContext = {
  entry_point?: EntryPoint;
  document_type?: (typeof documentType)[number];
  entity_kind?: "document" | "episode";
};

export function sanitizeUsage(
  event: UsageEvent,
  input: Record<string, unknown>,
) {
  const schema = USAGE_EVENTS[event];
  if (!schema) return null;
  const result: Record<string, string | number> = {};
  for (const [name, rule] of Object.entries(schema)) {
    const value = input[name];
    if (value === undefined) continue;
    if (Array.isArray(rule)) {
      if (!(rule as readonly unknown[]).includes(value)) return null;
      result[name] = value as string | number;
    } else {
      if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < 0 ||
        (rule === "count" && !Number.isSafeInteger(value))
      )
        return null;
      result[name] = value;
    }
  }
  const required = event.startsWith("file_action_")
    ? ["action", "entity_kind"]
    : event.startsWith("memo_action_")
      ? ["action", "memo_scope"]
      : event.startsWith("workspace_view_")
        ? ["view_kind"]
        : event.startsWith("search_")
          ? ["search_scope"]
          : event.startsWith("chat_turn_")
            ? ["send_mode", "intent", "has_quote"]
            : event.startsWith("action_dialog_")
              ? ["dialog_kind"]
              : event.startsWith("setting_check_start_")
                ? ["start_mode"]
                : event === "preference_selected"
                  ? ["preference", "value"]
                  : event === "onboarding_step_viewed"
                    ? ["step_key"]
                    : event === "feature_notice_viewed"
                      ? ["feature", "notice_kind"]
                      : event.startsWith("document_save_") ||
                          event === "document_edit_summary" ||
                          event === "document_structure_changed"
                        ? ["document_type"]
                        : [];
  if (required.some((key) => result[key] === undefined)) return null;
  if ("outcome" in schema && result.outcome === undefined) return null;
  if (
    "action" in schema &&
    event !== "action_result_resolved" &&
    result.action === undefined
  )
    return null;
  if (event === "preference_selected") {
    if (
      result.preference === "theme"
        ? !["system", "dark", "light"].includes(String(result.value))
        : !["ko", "en"].includes(String(result.value))
    )
      return null;
  }
  if (event === "exploration_action") {
    const supported =
      result.area === "graph"
        ? [
            "select_node",
            "clear_selection",
            "open_document",
            "filter_kind",
            "filter_episode",
            "search",
            "clear_search",
            "zoom_button",
            "fit",
          ]
        : [
            "select_chapter",
            "open_document",
            "filter_episode",
            "filter_row",
            "toggle_group",
            "search",
            "clear_search",
          ];
    if (!supported.includes(String(result.action))) return null;
  }
  return result;
}
