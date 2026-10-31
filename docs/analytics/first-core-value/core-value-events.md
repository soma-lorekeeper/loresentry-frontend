# Analytics event contract: first core value

Status: the signup and project events are implemented locally; deployment and GA verification remain outstanding. This document defines the analysis plan. For current behavior see [frontend behavior](core-value-feature.md). For signup and project events see [acquisition and onboarding](../acquisition-onboarding/acquisition-events.md); for the existing refresh event contract see [refresh events](../refresh/refresh-events.md).

## Goal

Measure whether new users reach their first setting-document refresh and apply its result after signup and project creation, and how long this journey takes. Treat confirmed application (`refresh_applied`) as a proposed observable milestone, not proof that the user accepted every AI proposal or gained value. Also report `refresh_started` separately: a run that finds no changes or fails will not reach application.

## Events and journey

| Step | Event | State |
| --- | --- | --- |
| Signup | `sign_up` | Implemented locally; first committed account registration, observed by the browser, with `method` as described in the acquisition document. Registration precedes terms and does not mean the user can use the service. |
| Project creation | `project_created` | Implemented locally; success only, with `project_type` distinguishing sample and standard. |
| Refresh starts | `refresh_started` | Existing browser event on a successful start response containing a run. |
| Result observed | `refresh_result_ready` | Existing event when the browser observes the transition from RUNNING to READY; it is not emitted for every completed run. |
| Result applied | `refresh_applied` | Existing browser event after a successful confirmation or a status recheck confirms application. |

Use a closed GA funnel in the above order as a starting point, with an explicitly chosen completion window and a signup cohort. Inspect the result-ready and no-change paths separately: `refresh_no_changes` means no run was started, while `refresh_result_no_change` is a run's observed no-change result. The complete refresh event definitions and failure semantics are in the existing contract.

GA funnel exploration counts users satisfying ordered steps, not runs or necessarily the first action of each kind in a user's lifetime. It can connect a signup, project creation, and refresh across different projects because these events do not transmit project IDs. Consequently the funnel estimates user progression; it cannot establish that the refresh belongs to the project created at the preceding step or that an application is the first ever. Avoid adding project or run IDs to GA solely to make this funnel look precise. A strict first-per-account or same-project analysis needs an independently designed server-side data source and identity/privacy review.

## Measures

- **Activation rate:** users in a defined signup cohort who reach `refresh_applied` within the chosen window divided by users entering the signup step. Also show the number in each step and the window. Treat this as an observed GA rate, not the rate among all database accounts.
- **Start rate:** users in the same cohort reaching `refresh_started` within the window divided by signup users. Compare with application rate and inspect no-change and failures without treating every non-application as abandonment.
- **Time to milestone:** report GA funnel elapsed time between ordered observed steps, including signup to application if supported by the chosen exploration; label its cohort and time window. It reflects the funnel's first qualifying sequence, not an exact per-account lifetime time to first application. Select the desired reporting period and time window before comparison.
- **Breakdowns:** compare first-user or session acquisition source and `project_type` only where the relevant GA exploration supports the dimension and its scope matches the question. Sample and standard projects have different paths; do not infer which project was refreshed from a user-level breakdown.

Document saving is not a required step in this initial funnel. If the team needs to distinguish users who cannot prepare content from users who never start refresh, first define a successful saved-document event and its eligible document types; do not send document content or identifiers. No such event is claimed here.

## Validation and limits

1. After the proposed signup and project events are implemented, test a real new-user journey: arrival with UTM, signup, onboarding, sample or standard project creation, refresh start, ready observation, and application. Check event order, no duplicates for one successful action, and no events in disabled/mock mode. Use DebugView and verify sanitized payloads.
2. Test no-change, failure, retries, a pre-existing finished run on entry, background tabs, reloads and uncertain confirmation. A browser can miss a result transition, close before observing it, or observe another tab's run; do not interpret missing `refresh_result_ready` as definitive failure. See the refresh contract for the exact semantics.
3. Build the closed funnel and check its counts and elapsed-time interpretation against the test journey. GA's user identity may not connect visits across browsers or devices; blocking and consent can also cause gaps. In a closed funnel, a missing intermediate event removes a user from later steps even if application occurred. Use separate event counts and server-side operational totals for context, not a per-run success rate inferred from this funnel.
4. Confirm GA funnel and parameter availability in the target property before making the report a recurring metric. GA reporting and attribution can take time to process; DebugView receipt is not proof of complete production reporting.

Sources: [GA funnel exploration](https://support.google.com/analytics/answer/9327974), [GA traffic-source scopes](https://support.google.com/analytics/answer/11080067).
