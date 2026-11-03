# Implementation and validation plan

[한국어](implementation-and-validation.ko.md) · [Folder guide](README.md)

Status: planned work only. The [event catalog](additional-events.md) defines the payload contract; [current state](current-state.md) records what already exists. None of the instrumentation, GA changes or runtime checks below was implemented or executed in this documentation task.

## 1. Shared implementation before feature rollout

Add a typed sender in the existing `src/features/analytics/` area, with an explicit event-to-parameter map, enum validators and non-negative numeric validation. Reuse the existing installed tag, `analyticsEnabled` conditions, URL/referrer filtering and search URL redaction. A new usage event must not initialize another tag, loosen hostname/data-mode restrictions or implicitly enable mock traffic.

The sender should be nonthrowing and best effort. It must not delay navigation, saving, authentication or model requests. Drop undeclared keys and invalid values rather than forwarding an entire domain object. Preserve valid zero counts; omit unknowns. Retain existing event names and payload meanings, including the registration-claim mechanism. Do not backfill historical occurrences as if they just happened.

Use an action coordinator to capture start time, entry point and relevant bounded context once. Its opaque attempt token stays in memory and is never sent. Settle an attempt once, and optionally resolve a previously unknown result once under a separate event name. Remove completed records using a bounded lifecycle; clean up on project change/unmount. Keep only identifiers needed for local matching, not copied document content.

Assign one result owner before changing a feature. A handler owns valid user intent; a validated service response or explicit state transition owns the result. The result must be recorded before any awaited cache invalidation or navigation. A successful service mutation followed by a failed refetch is not a rejected mutation. Shared API middleware can expose sanitized result signals, but must not indiscriminately emit GA for every request, retry, poll or nested import call.

### Observation constraints

- **Save:** use actual acknowledgment plus `DocumentSession` dirty/status information. Its save Promise may fulfill after failure. Inspect the actual state machine before adding callbacks; no event should convert an error into saved.
- **Chat:** retain the validated final-turn/SSE-done signal before refetch. Expose explicit error provenance and abort cause to distinguish trusted server failure, response loss, user Stop and unmount/session deletion. The adapter's current ignored cancellation request cannot prove server cancellation. Check the existing pre-save boolean behavior before promising blocked-on-unsaved results; any behavior correction is a separate explicit implementation change, not a telemetry side effect.
- **Checks:** centralize observation across summary/detail polling, deduplicated by local run ID. Run it independently of toast display/tab visibility. Track RUNNING → DONE/FAILED/CANCELLED, with no synthetic terminal event for initial historical data.
- **Import:** preserve per-batch counters and per-file create/fill stages locally. Distinguish current-batch success from accumulated success across earlier retries. Cleanup is not a new manual file action.
- **Unknown mutations:** emit a resolution only when the existing domain contract can conclusively match the result to the same local attempt. A newer matching-looking state, another actor's edit or a new latest run is insufficient. If the response/read API cannot prove this, retain unknown; do not invent an endpoint or retransmit the mutation for analytics.

## 2. Instrumentation ownership map

Paths below are relative to `src/`. They identify candidate insertion points, not code changes already made. The catalog is the only event-name/parameter definition.

| Area                         | Intent/result owner and integration point                                                                                                                                                | End-to-end check                                                                                                                                 |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace navigation         | `features/workspace/workspace-context.tsx`, view host, shell and view registry. Capture a committed focused-pane activation; each view reports its own settled readiness.                | Open a hidden existing document tab and a second pane. Exactly one active-view observation per committed activation; no hidden-mount duplicates. |
| Projects                     | `features/projects/project-dialogs.tsx`, `project-trash.tsx`, `project-settings/project-settings-view.tsx` and project queries. Existing create owner remains.                           | A settings response succeeds while list reload fails: the mutation result remains success.                                                       |
| Files, favorites and images  | `features/workspace/queries.ts`, file-tree handlers, `features/documents/document-image.tsx`, `services/api/files.ts` and `images.ts`.                                                   | Exercise create, move and image attachment; an upload alone must not count as set_image success.                                                 |
| Editing and save recovery    | `features/documents/document-session.ts`, `use-document-session.ts`, property table and editor core-setting actions. Keep aggregation outside the hot per-keystroke send path.           | A save error followed by retry success produces one issue episode, one recovery, and non-overlapping summary windows.                            |
| Import                       | `features/workspace/import-dialog.tsx` owns batch lifecycle; `use-import-document.ts` supplies create/fill results.                                                                      | Two files with one fill failure then retry: first batch is partial, retry counts only the remaining file, and no second document is inferred.    |
| Versions, locking and export | `features/documents/document-view.tsx`, `features/versions/version-history-modal.tsx`, related queries and document adapter.                                                             | Restore only on acknowledged content; TXT/Markdown and PDF stop at their actual browser handoff boundary.                                        |
| Project/chat search          | `features/search/search-view.tsx` and `features/chat/chat-dock.tsx` own current query attempts and selection; query hooks expose usable result/error/cache state.                        | A replaced query settles as superseded locally; its later response does not become another result. Keyboard and mouse selection use one owner.   |
| Graph/timeline               | `features/graph/graph-view.tsx`, `graph-tools.tsx`, `node-panel.tsx`, `features/timeline/timeline-view.tsx`.                                                                             | Filters/selected nodes create bounded local observations; actual document opening also passes through workspace load measurement.                |
| Memos                        | `features/memos/memo-list.tsx`, `memo-panel.tsx`, `queries.ts`.                                                                                                                          | Creating, updating and deleting use explicit save/response ownership, including shortcut submissions.                                            |
| Chat                         | `features/chat/chat-dock.tsx`, `use-chat-streams.ts`, `conversation.tsx`, `services/api/chat.ts`. Session creation, turn generation, user stop and copying have separate result signals. | Close/reopen the floating window during generation; it does not become stopped. Validate done versus missing-done termination.                   |
| Setting checks               | `features/setting-check/use-start-check.ts`, `queries.ts`, watcher, report, board/findings and verdict ledger.                                                                           | Visible-tab completion, hidden-tab completion, cancellation race and historical report opening obey separate run/view semantics.                 |
| Refresh review               | `features/graph-refresh/graph-diff-modal.tsx`, `document-diff.tsx`, `use-draft-autosave.ts`. Preserve existing start/result/application owner.                                           | Closing with pending saves emits a closed event only if it really closes. Existing uncertain confirmation produces no duplicate application.     |
| Account and language         | Account dialogs, `features/auth/terms-consent.tsx`, `features/locale/use-locale-switch.ts`, `services/api/auth.ts`.                                                                      | Consent, session confirmation, signup, local language navigation and account sync are not collapsed into one success.                            |
| Onboarding/help/tour         | `features/onboarding/onboarding-page.tsx`, help views, `features/tour/workspace-tour.tsx`.                                                                                               | Replay and tour examples do not pollute initial tutorial or real feature events.                                                                 |
| Landing, theme and feedback  | Landing/contact handlers, `features/projects/user-menu.tsx`, `features/feedback/feedback-provider.tsx`.                                                                                  | Clipboard acknowledgment and feedback response are measured; opening a mail client remains a request/handoff.                                    |

Workspace load attempts need `is_retry` because a visible view can explicitly retry without another activation. Derive the view's ready/empty/error from what is actually displayed, not just from one shared query returning data. A cached graph response alone does not prove its asynchronously loaded canvas rendered. If a distinct render-ready signal is unavailable, document that gap before enabling that view's ready outcome.

## 3. Proposed rollout batches

### P0: core visibility and observed results

1. Shared validator, sender and local attempt/observer ownership; preserve old collectors.
2. Workspace feature entry/readiness, manual file creation, import and editing/save issues.
3. AI chat open/turn/stop/visible restrictions, including necessary explicit error/abort signals.
4. Setting-check start, result/cancel observations, report visibility and verdict persistence.
5. Verify the preparation/chat/check/refresh branches using synthetic project content in the intended test environment.

Report P0 as complete only when every P0 row in the catalog is implemented and verified; otherwise list the pending rows and reasons and keep the batch incomplete. Do not report an entire batch complete after enabling only its easiest events. New typed signals or missing render-ready contracts are dependencies, not permission to guess outcomes.

### P1: breadth and explanation

Expand through management operations, versions/export/images, search/exploration, memos, chat result use/session management, refresh review, account/terms/locale, landing, help, feedback and unknown-result resolution where the domain already supports it. Add dialog opening/closing around these flows. Configure the reports in the measurement plan and inspect real payloads before interpreting differences among features.

### P2: optional interaction detail

Add layout/panel interactions, initial-onboarding steps and workspace-tour lifecycle after establishing useful baseline reports. Per-control formatting detail, camera gesture telemetry and server workspace-preference persistence metrics remain deferred outside the catalog. The broad plan can ship incrementally without pretending these details were already covered.

## 4. GA configuration and delivery verification

These are follow-up tasks, not completed work:

1. Inspect the target property's current tag, enhanced measurement, custom definitions, key events, internal-traffic filters and report availability. Preserve manual sanitized page views and the existing history-based automatic page-view restriction. Do not assume every enhanced event is privacy-safe merely because application events are sanitized.
2. Check automatic site-search/form/outbound-click collection specifically. [Enhanced measurement](https://support.google.com/analytics/answer/9216061?hl=en) can collect search terms, form metadata and link data. The current search URL redaction addresses known query keys; new custom events must not reintroduce those values. Audit the actual outgoing payload, including page_title and automatic fields, especially while print temporarily changes document.title to a manuscript title. This is an exposure to test, not a confirmed observed leak.
3. Add only needed custom dimensions/metrics from the measurement plan after checking the property's existing definitions and capacity. Do not delete/rename existing definitions without a migration. A generic result event with failed outcomes is not automatically a successful key event.
4. Verify in controlled local/mocked collection first, keeping mock/localhost traffic out of the real GA property. Use deterministic fake event sinks for instrumentation checks; real API/SSE responses still require a separate integration check.
5. In an authorized target environment/account, use synthetic content for a representative real journey. Capture collection requests and use Realtime or enabled DebugView to confirm receipt, event order, values and exclusions. An HTTP request merely leaving the browser is not proof of GA receipt, and DebugView receipt is not proof that a configured report has the right scope or denominator. [Google's event guide](https://developers.google.com/analytics/devguides/collection/ga4/events) describes event setup and these inspection surfaces.
6. Validate the actual report after processing: filters, custom parameter availability, acquisition scope, date/timezone and result meanings. Record build/commit, environment, host/data mode, cases, sanitized payload samples, GA receipt and remaining gaps in the implementation work record. Do not store cookies, raw manuscript text or account identifiers in reports.

The existing restriction to `loresentry.com` means ordinary localhost/dev-domain browsing cannot demonstrate real GA delivery. Do not loosen it globally just to test; controlled test sinks and a deliberately configured delivery check have different evidentiary roles.

## 5. Acceptance cases

These are required implementation checks to select and execute when the corresponding event family is built. They are not PASS results from this task.

| Case                                    | Required observation                                                                                                                                                                                                  |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Enabled/disabled collection             | Correct production/API/ID conditions permit events; mock, localhost, empty ID and onboarding/tour feature examples do not. A tour lifecycle event must not create demo feature events.                                |
| Payload boundary                        | Unknown keys/enums, IDs, names, queries, quotes, content, raw URLs/errors are rejected; known zero counts survive and missing counts stay omitted. Automatic fields are inspected as well.                            |
| Duplicate ownership                     | Strict Mode, rerender, query cache updates, retry callbacks and summary/detail polling do not double-count one local attempt/transition. Real reopening/retry still counts as a new occurrence.                       |
| View activation/load                    | Hidden retained tabs emit no feature-open/ready; focus changes and explicit retries get the correct is_retry and readiness. Split panes and restored cached data are covered.                                         |
| Definite and uncertain mutation results | Typed rejection is rejected; lost/untrusted response is unknown; follow-up cache failure does not reverse acknowledgment. Unsupported/no-request preconditions are blocked only when attempted.                       |
| Unknown resolution                      | A conclusive, same-attempt domain result produces at most one separate resolution. Inconclusive state or another actor's action produces none. No blind mutation replay.                                              |
| Autosave windows                        | No edits means no summary. Hidden time is excluded; a 60-second window plus hide/dispose produces disjoint counts. Existing manuscript_saved is not silently redefined.                                               |
| Save errors/conflicts                   | A fulfilled save Promise with an error is not success. Repeated retries do not create repeated continuous issues. Recovery waits for acknowledged save or successful latest-content adoption.                         |
| Import selection and partial batch      | Unsupported/duplicate selection counts differ from submission. Two-file partial success and fill-only retry obey count conservation: succeeded + failed + unknown = attempted. Closing does not claim rollback.       |
| Image phases                            | Ticket/upload/complete success followed by attach failure is not set_image success. A lost attach acknowledgment remains unknown.                                                                                     |
| Export limits                           | TXT/Markdown handoff requires usable URL and helper invocation. PDF preparation/print invocation is not confirmed printing; afterprint cannot distinguish cancel. DOCX/HWP or missing Blob capability is not success. |
| Search supersession                     | Rapid replacement/clear closes the old logical attempt as superseded; late stale results are ignored. Empty/error/cache hit/retry are distinct; no query or length is sent.                                           |
| Chat finalization                       | Deltas followed by disconnect do not count completed; a validated done turn does, before cache refresh. No per-delta/activity telemetry.                                                                              |
| Chat abort and pre-save                 | User Stop, unmount, deletion and disconnected SSE are distinguished. A false pre-save result is not an invented successful save or blocked event without an actual guard.                                             |
| Chat timing and result use              | First content is nonempty and measured from the local attempt, including preparation. Copy waits for clipboard result; citation request and actual target load stay distinct.                                         |
| Check terminal state                    | RUNNING→DONE/FAILED/CANCELLED is observed once locally whether its tab is open or closed. An initially terminal result creates no fresh completion; historical report viewing does.                                   |
| Check cancel race                       | Cancel acknowledgment and later CANCELLED are distinct. A race to DONE is reported as done, not forced cancellation.                                                                                                  |
| Check verdicts                          | Choosing a verdict does not count saved until acknowledged. Undo/reason editing/retry use correct action and carry no reason/finding IDs.                                                                             |
| Refresh compatibility                   | Keep both no-change paths, saved counts and uncertain-application recheck semantics. Review interactions are not proposal acceptance; failed/prevented close produces no closed event.                                |
| Account navigation                      | Terms, account deletion and logout emit from their actual acknowledgment before redirect, without delaying it. Unconfirmed revocation is unknown; consent success does not imply session success.                     |
| Locale and replay                       | Account locale sync can fail while local language changes. Initial onboarding, replay and tour are separate, with no duplicate tutorial_complete.                                                                     |
| Delivery and reports                    | Local interception, real service consumption, GA receipt and final report validation are recorded separately. Disabled/blocked/lost events are not treated as proof of unused or failed features.                     |

## Completion evidence

For this documentation work, verify file pairing, equivalent names/enums, relative links, formatting and scope of the diff. For future implementation, run meaningful tests of the above observable contracts and the frontend's required checks for the actual code change. Do not use a documentation/link check as proof that analytics reaches GA, and do not run production mutations merely to close a documentation task.
