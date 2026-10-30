# Analytics event contract: setting document refresh

Status: implemented locally; deployment and production event verification remain outstanding. The custom metrics and dimensions were registered in the target GA property. The contract covers what the frontend observes in the real workspace refresh flow; see [frontend behavior](refresh-feature.md). It does not change the refresh API or claim an exact server-side count of runs.

## Purpose and conditions

Understand how often users start refresh, what results the browser observes, whether users open review and confirm it, and the size and duration of those results. The figures describe behavior and final document changes, not how much of an AI proposal was accepted.

Use the existing Google tag and enablement rules: a valid measurement ID, API data mode and `loresentry.com`. Do not initialize a second tag. Do not send these events for mock mode, onboarding or tour examples. GA transmission must never block the feature.

## Events

Each row is one occurrence; a retry is a new attempt. Parameter names and meanings are specified below.

| Event | Send when | Parameters |
| --- | --- | --- |
| `refresh_start_click` | User clicks “Start refresh” in the confirmation dialog, before saving documents. | None |
| `refresh_started` | Start response succeeds with a run. | `input_document_count` |
| `refresh_no_changes` | Start response succeeds without a run. | None |
| `refresh_start_failed` | Saving open documents fails or the start request fails. A network error does not prove the server did not start a run. | `failure_stage` |
| `refresh_result_ready` | This browser observes `RUNNING` → `READY`. | `draft_count`, `new_document_draft_count`, `duration_seconds` when valid |
| `refresh_result_no_change` | This browser observes `RUNNING` → `NO_CHANGE`. This is after a run; `refresh_no_changes` is before a run starts. | None |
| `refresh_result_failed` | This browser observes `RUNNING` → `FAILED`. | `failure_reason` |
| `refresh_review_opened` | The real review dialog opens for a ready run. Each reopening is a new event. | None |
| `refresh_apply_click` | User clicks “Confirm application” in the real review dialog, before flushing drafts. | None |
| `refresh_apply_failed` | A draft flush or confirmation is definitively rejected or fails. Do not classify an uncertain network response as a confirmed failure; check the status first. | `failure_stage` |
| `refresh_applied` | Confirmation response succeeds, or a subsequent status check confirms `APPLIED` after an uncertain response. Emit at most once for the same locally observed confirmation attempt. | `draft_count`, `new_document_draft_count` when known; `updated_document_count`, `created_document_count` only when the successful confirmation response is available and valid |

Closing a dialog is not failure. Do not count a failed save or unresolved confirmation as applied. A rejected attempt may be retried and the retry is a separate attempt.

## Parameter contract

All count values are non-negative integers; omit unavailable or invalid values instead of sending zero. Zero is valid only when a count is actually known to be zero.

| Parameter | Source and meaning |
| --- | --- |
| `input_document_count` | Length of `lockedFileIds` in the successful start response: selected input documents returned as locked. It is not the number ultimately changed or the full context read during processing. |
| `draft_count` | `counts.total` from a `READY` run or review response: total open review drafts. |
| `new_document_draft_count` | `counts.created`, mapped from `draft_counts.new`: new-document proposal drafts, not documents already created. |
| `duration_seconds` | `(readyAt − startedAt)` using server timestamps from the READY response, in seconds. Omit if either is absent, invalid, or produces a negative duration. It measures server start to result readiness, not document saving before start or browser polling delay. |
| `updated_document_count` | Length of `updated` in the successful confirmation response: existing documents listed as changed in content or relationships. |
| `created_document_count` | Length of `created` in the successful confirmation response: newly created documents. |
| `failure_stage` | Fixed category: `save_documents` or `start_request` for start failure; `save_draft` or `confirm_request` for apply failure. Use `other` only when the stage cannot be reliably determined. Never send a raw error message. |
| `failure_reason` | For a failed run, `timeout` if the error code is `TIMED_OUT`; `other` otherwise. Never send the raw code or message. |

For `refresh_applied`, preserve draft counts from an actual READY/review response for the same run locally; the server returns zero open drafts after `APPLIED`, which must not be mistaken for the earlier counts. If the browser did not obtain those counts, omit them. The current frontend confirmation adapter discards the response body and must be changed to expose and validate the returned `created` and `updated` lists before reporting their lengths. Do not send IDs from these lists.

If the confirmation response is lost and a later status check confirms `APPLIED`, send `refresh_applied` with any known draft counts, but omit `updated_document_count` and `created_document_count`: status alone cannot reconstruct them. Do not invent zeros or emit a second success if a later check repeats. Do not retry confirmation solely to recover analytics counts.

Draft counts and changed-document counts are different units; do not divide them to claim an AI acceptance rate. Changed documents may include user edits or relationship changes. Actual acceptance of AI proposals is outside this contract.

## Privacy, counting and implementation

- Send only the named counts, duration, and bounded categories. Do not send project, run, document or user identifiers, titles, text, search terms, URLs, or raw errors as custom parameters. Existing tag configuration and page URL/referrer redaction still apply to other collection.
- Instrument actions at their actual handlers. Emit result events on the watcher’s observed transition, not every poll or initial load of a finished run. Avoid duplicate emissions on rerender and repeated observation in the same mounted watcher. Reopening review deliberately emits another `refresh_review_opened`.
- A browser may close, lose connectivity, reload, or observe a run started elsewhere; multiple tabs can observe the same transition. These events are best-effort browser observations, not exact server totals or a reliable per-run funnel. The contract does not measure first review time.
- Preserve review counts locally only as needed for the active run and never transmit its ID. Do not use client-generated start time as a substitute for server timestamps when calculating duration.

## GA setup and verification

1. Implement and deploy through the existing tag. Event names do not require prior registration.
2. Register the numeric parameters needed in reports as event-scoped custom metrics; register `failure_stage` and `failure_reason` as event-scoped custom dimensions if breakdowns are needed. Verify availability and limits in the target property before creating definitions.
3. With analytics enabled on the production hostname, use Realtime or configured DebugView to check event names, values and timing. Standard reports can take longer. Exercise both no-change paths, failures, READY, reopening review, successful confirmation and an uncertain response followed by `APPLIED`.
4. Test that unavailable values are omitted, 0 is preserved when known, timing uses server timestamps, no custom IDs or content are sent, repeats do not double-count the same local confirmation, and disabled/mock modes send nothing. Document-only changes do not constitute runtime verification.

References: [Google: set up events](https://developers.google.com/analytics/devguides/collection/ga4/events), [Google: event parameters](https://developers.google.com/analytics/devguides/collection/ga4/event-parameters).
