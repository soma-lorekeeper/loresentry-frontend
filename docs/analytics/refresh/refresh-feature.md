# Setting document refresh: frontend behavior

This document describes what the current frontend displays, requests, and observes during setting document refresh. It is based on the checked-out code; it does not verify the deployed version or define new analytics events. The frontend calls this flow graph refresh in code.

## User flow

1. **Open the confirmation.** In the workspace sidebar, “Refresh setting documents” opens a confirmation dialog. Canceling closes the dialog without starting a refresh. If status is still loading or the API is unavailable, the sidebar displays the corresponding state instead.
2. **Start.** “Start refresh” closes the dialog and first attempts to save open documents. If saving fails, the frontend shows an error and does not send the refresh request. Otherwise it sends `POST /projects/{projectId}/graph-refresh` with no body. The server selects the documents; the frontend does not send a document list.
3. **Handle the start response.** When the response contains a `GENERATING` run, the frontend displays the number of locked documents from the returned file list and shows the refresh as running. If there is no run, it displays “No changes to refresh.” If the request fails, it shows a start error and reloads the current status. A successful start response does not mean the result is ready.
4. **Wait for the result.** While the latest run is `RUNNING`, the frontend polls its status every five seconds; polling pauses in a background tab. `RUNNING` is the frontend name for the server's `GENERATING` status. The sidebar shows a running indicator and, when available, elapsed minutes. If this browser observes the status change from `RUNNING` to `READY`, `NO_CHANGE`, or `FAILED`, it refreshes lock information and shows a corresponding notice. A run already finished when the workspace opens does not produce this transition notice. The browser can also observe a run started in another tab or device.
5. **Review.** When the status is `READY`, the sidebar offers “Apply changes”; the result notice can also open the review. The review compares current and proposed drafts. The user can edit either side and choose content; changes are automatically saved. All drafts must match before “Confirm application” is enabled. A user can retain current content, so confirmation does not imply every proposal was accepted.
6. **Confirm.** The frontend saves pending draft changes before sending the confirmation request. On a successful response it closes the review, shows a success notice, and refreshes relevant status and content. If a network or unknown error makes the result uncertain, it checks the run status instead of blindly sending confirmation again. Validation, authentication, and other failures receive their respective handling in the review flow.

## States visible to the frontend

| State | Meaning in the frontend |
| --- | --- |
| `IDLE` | No refresh run is found for the project. |
| `RUNNING` | The frontend is waiting for the result; maps from `GENERATING`. |
| `READY` | A result is available for review. |
| `NO_CHANGE` | A run completed without a change to apply. |
| `FAILED` | The run failed; an error code may be available. |
| `APPLIED` | The result has been confirmed and applied. |

The start response with no run is different from the later `NO_CHANGE` state: the former displays that there was nothing to start; the latter is a result observed after a run.

## Values available for measurement

| When | Frontend value | Meaning and limits |
| --- | --- | --- |
| The user clicks the start button | Click handler | Intent to start; saving or the request may still fail. |
| A start response contains a run | `lockedFileIds.length` | Count of file IDs returned as locked input documents. This is not the number of documents ultimately changed. |
| Latest run or review is loaded | `counts.total`, `counts.matched`, `counts.created` | Open draft counts from the response. The adapter maps `draft_counts.new` to `created`; it does not mean documents have already been created. |
| A run is observed changing state | Previous and current frontend status | The outcome observed by this browser, not a complete count of server jobs. |
| Confirmation succeeds | Successful response or `APPLIED` on an uncertainty recheck | The result was confirmed, but the current frontend adapter discards the confirmation response body and does not expose counts of created or updated documents. |

A browser can close, lose network access, miss a transition, or observe the same run in multiple tabs. Browser-side event counts therefore do not provide exact server totals. No new GA events or metrics are implemented by this document.

## Frontend code

- [Sidebar and start handling](../../../src/features/workspace/sidebar/graph-refresh-item.tsx)
- [Refresh API adapter](../../../src/services/api/refresh.ts) and [domain states](../../../src/domain/models.ts)
- [Polling and refresh actions](../../../src/features/graph-refresh/queries.ts)
- [Status watcher and review opening](../../../src/features/graph-refresh/refresh-watcher.tsx)
- [Review and confirmation](../../../src/features/graph-refresh/graph-diff-modal.tsx)
