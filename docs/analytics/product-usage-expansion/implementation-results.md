# Product usage instrumentation results

[한국어](implementation-results.ko.md)

Implemented in the frontend working tree on 2026-11-03. Deployment, production event receipt and GA report population are separate, unperformed checks. The original [current-state assessment](current-state.md) describes the pre-change baseline.

## Delivered code

The [event catalog](additional-events.md) has 56 typed event contracts in `src/features/analytics/usage-schema.ts`. Application flows call 55 of them; `action_result_resolved` is a conditional coordinator capability, with no production caller because the current APIs cannot conclusively match a later result to the same unknown attempt. Do not infer that result from a generic refetch or replay a mutation to manufacture it.

- Shared transport allows only declared categories and finite nonnegative numeric values, rejects invalid enum/numeric input and missing core context, adds `schema_version=usage_v1` and `ui_locale`, and never interrupts a product operation. Production collection still requires an API configuration, a measurement ID and the exact `loresentry.com` hostname.
- Project, file, document, memo, chat-session, account and feedback operations capture attempts and acknowledged results before cache invalidation. Network ambiguity remains unknown; exported files and printing are browser handoffs. Existing signup, project-creation, manuscript-save, search and refresh events remain intact.
- Focused tab activations and actual readiness are distinct. Retained hidden tabs and background refetches do not fabricate opens; deliberate retry is separate. A visible setting-check report can be measured in an unfocused split pane.
- Editing uses disjoint 60-second summaries, bounded foreground activity, actual save acknowledgments and unresolved issue/recovery episodes. Alias and relationship-description changes coalesce within a save revision. Text, names, search terms, identifiers and raw errors are excluded from new custom payloads.
- Imports retain existing partial-success/retry/cleanup behavior and count each attempted file once. Chat distinguishes final acknowledgment, explicit Stop, trusted server error and uncertain interruption. Session-creation failure provenance is retained; first-content time includes preparation. Setting-check start acceptance, monotonic terminal observation, report use and verdict mutations are separate.
- Explicit dialogs, graph/timeline exploration, memo controls, landing actions, preferences, terms consent, onboarding, help, tours and feedback are connected at their feature handlers. Local searches are coalesced, continuous camera/hover events are excluded, and tour demonstrations suspend the new usage events. A modal reload or component teardown alone does not mean the user closed it.

`src/features/analytics/ga-custom-definitions.ts` is the registration manifest. Optional context remains omitted when it is unavailable; do not fill it from user content or invent an entry source. Instrumentation does not enforce new unsaved-document guards on chat or export: their existing behavior is preserved.

The shared GA default title is fixed to `Lore Sentry`, preventing a transient manuscript title used by the print dialog from becoming the default analytics title. Existing URL/referrer sanitization remains active.

## GA configuration

Target: property `557572950`, web stream `https://loresentry.com`, measurement ID `G-FV1Y05NZQW`. Registration used ego lite in the existing authenticated GA UI, after inspecting the stream and existing definitions. The final saved inventory was compared with the manifest: 45 event-scoped dimensions and 22 event metrics, including exact numeric units. See [verified GA inventory](ga-registration.json).

New event-scoped dimensions: 41, keeping the existing four definitions and leaving five of 50 slots free. The existing `start_choice` definition is reused. No event-derived copies or additional key events are created.

```text
ui_locale, entry_point, action, outcome, dialog_kind, document_type,
view_kind, error_category, stage, is_retry, entity_kind, issue_kind,
resolution, format, input_method, import_format, search_scope,
count_bucket, rank_bucket, area, memo_scope, availability, send_mode,
intent, has_quote, citation_kind, creation_mode, feature, notice_kind,
start_mode, report_changed, finding_kind, is_core, verdict, draft_kind,
close_reason, had_local_edits, preference, value, step_key, topic_key
```

New numeric metrics: 16. The existing seconds metric for `duration_seconds` is reused, preserving its display name, **Refresh Ready Duration**; filter by event name when interpreting it. Existing definitions are retained. The saved total is 22 of 50 event-metric slots.

| Unit           | New parameters                                                                                                                                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Seconds        | `active_edit_seconds`, `first_content_seconds`, `processing_seconds`                                                                                                                                                                             |
| Standard count | `save_attempt_count`, `save_success_count`, `save_issue_count`, `accepted_count`, `unsupported_count`, `duplicate_count`, `file_count`, `succeeded_count`, `failed_count`, `unknown_count`, `citation_count`, `finding_count`, `unmatched_count` |

To preserve quota, no report definition is created for the constant `schema_version`, diagnostic flags `had_input`, `body_changed`, `title_changed`, `properties_changed`, `has_reason`, or currently unused conditional `operation_group`. These remain permitted payload fields, not GA report dimensions.

## Verification and release follow-up

- Full suite: 115 files, 893 tests passed. Subsequent readiness/coalescing edits passed 27 focused tests. Lint, TypeScript, formatting and token consistency passed.
- Both Korean and English production exports built successfully. Each passed static validation with 11 required routes, 18 HTML files and 821 files. The first sandboxed build failed; the actual locale builds succeeded with the network access needed for Google Fonts.
- New tests cover payload privacy/validation, disabled/failing transport, one-time attempt resolution, Strict Mode and hidden views/dialogs, save episodes, periodic activity, stale polling, chat acknowledgment before refetch, false pre-save compatibility, Stop and teardown interruption.

Before interpreting production reports, deploy the frontend through the normal release process and exercise controlled real-service journeys. Verify actual GA receipt and populated custom definitions, automatic fields, export handoffs, partial import/retry, interrupted streaming and setting-check completion. Local spies and static export checks do not establish those external effects. Ad blocking, consent, page loss and cross-device use remain interpretation limits from the [measurement plan](measurement-plan.md).

This task does not commit, push or deploy the working tree. No user content or synthetic localhost traffic is sent to the production GA property by these tests.
