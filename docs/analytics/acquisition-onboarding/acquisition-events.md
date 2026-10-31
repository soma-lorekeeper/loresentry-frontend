# Analytics event contract: acquisition and onboarding

Status: implemented locally. Production deployment and event verification remain outstanding. See [frontend behavior](acquisition-feature.md) and [first core value](../first-core-value/core-value-events.md) for the subsequent refresh journey.

## Purpose and conditions

Measure where visitors come from and how many reach signup, onboarding completion, and project creation. The current Google tag is enabled only with a valid measurement ID, API data mode, and the `loresentry.com` hostname. The frontend sends `page_view` when its tracker runs on arrival and route changes, without a user click. Its sanitized `page_location` retains `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `gclid`, `gbraid`, and `wbraid`; `page_referrer` is also sanitized. There is no separate UTM event. Early departure, redirects, blocked scripts, or disabled analytics may prevent collection; verify the deployed flow.

Separately, the frontend stores selected landing information in the browser and sends it to the auth `user_acquisitions` table on eligible onboarding entry. It selects the latest non-direct source within 30 days and records at most one row per account before onboarding completion. This is not a GA signup event. See [current acquisition implementation](../../../src/features/analytics/acquisition.ts) and [existing GA documentation](../../../../docs/frontend/analytics.md).

## Events

Reuse the existing Google tag and enablement rules. Analytics must never block user actions. Intent, display, success and failure events have different triggers. Each retry is a separate attempt; avoid rerender duplicates. Only the real flow is measured, excluding mock and onboarding replay.

| Event | Trigger | Parameters and conditions |
| --- | --- | --- |
| `page_view` | Existing tracker runs on arrival or a route change. | Sanitized location and referrer; this is not a separate UTM event. |
| `login_start` | User clicks the Google login button. | `method: google`; includes existing users and attempts that fail. |
| `login` | A valid authenticated session is confirmed after the login flow. | `method: google`; once per locally observed successful login flow, including new and existing users; not on session restoration or ordinary page reload. |
| `auth_failed` | The browser observes a definite authentication or terms request failure. | `failure_stage: oauth \| terms \| session`; bounded `failure_reason: canceled \| expired \| rejected \| unavailable \| other` only when known. An uncertain response is not proof of server failure. |
| `signup_terms_viewed` | Terms for signup are actually displayed. | Emit once per display, not per rerender; do not classify as signup if this screen can also serve existing accounts. |
| `sign_up` | A **new account is first committed** by the auth registration transaction. Deliver the event when the browser can reliably observe that outcome. | `method: google`; at most once per new account. Registration occurs before terms and does not mean the user can use the service. Never send for ordinary login, existing-account terms reacceptance, or a returning unfinished-onboarding user. |
| `tutorial_begin` | A user first enters the real onboarding flow. | Exclude replay. Avoid duplicate sends on rerender; a revisit may be a new observed entry, not necessarily a unique account. |
| `tutorial_complete` | A first onboarding completion request succeeds. | Exclude replay and failures. Completion is distinct from project creation. |
| `onboarding_start_selected` | User selects a start choice and the handler receives it. | `start_choice: sample \| new \| later`; this is intent, not proof that completion or project creation succeeded. A repeated choice is a new selection. |
| `project_create_started` | The example creation request is initiated or the valid standard-project form is submitted. | `project_type: sample \| standard`; each retry is a new attempt. |
| `project_created` | Project creation request succeeds. | Same `project_type`; once per successful creation, including both creation paths. |
| `project_create_failed` | Project creation request is definitively rejected or fails. | Same `project_type`; bounded `failure_reason: rejected \| unavailable \| other` when known. An uncertain network response does not establish that the server created nothing. |

The account transaction writes a pending registration marker only when a new identity is created. Existing identities and concurrent registration losers do not create another marker. On the OAuth return, the frontend claims it through the BFF using either an authenticated session or the valid terms-consent credential. Auth atomically deletes the marker and returns whether it existed. Existing accounts predating the migration receive no marker. The frontend claims only when GA is enabled; it sends no identifiers. A lost response after deletion, blocked delivery, or a browser that never returns can still lose the event. A later retry can observe an unclaimed registration later than the actual account creation; GA timestamps and attribution reflect that later observation. Onboarding and project events wait at most three seconds for an in-flight claim, without delaying user actions; a slower claim can still arrive out of order.

This is best-effort browser measurement, not an exact count of committed accounts. The backend stores a pending marker even if analytics is disabled and removes it on claim or account deletion.

`sign_up`, `login`, `tutorial_begin` and `tutorial_complete` are GA recommended events. Do not emit success for a failed action; registration may succeed before a later authentication or terms failure. A canceled login is reported only if the browser actually receives a cancellation result; closing the browser alone emits no failure. Terms display is a separate step and may not apply to all users.

Do not add UTM values to `sign_up` as custom parameters: GA associates available traffic-source information with users, sessions, and key events. `method` describes the signup provider; it is not the acquisition source. Do not send account identifiers, email, names, project identifiers or user-entered content. Follow the existing URL/referrer sanitization and review campaign values and page titles for personal information.

## Analysis and rollout

1. Verify arrival `page_view` and UTM values in Tag Assistant and GA DebugView, including the Google OAuth round trip. Confirm the configured unwanted-referral rules prevent OAuth from being mistaken for the acquisition source and that route changes do not duplicate page views.
2. Deploy the events above, then verify successful actions, failures, retries, refreshes, onboarding replay, sample and standard projects, and disabled/mock modes. Check actual request payloads for unwanted identifiers and content.
3. Mark `sign_up` as a GA key event. In acquisition reports or Explore, compare signup counts by **first user source/medium** and by **session source/medium**. Use key-event attribution reports for attributed credit and document the selected model and lookback window. These answer different questions; session and event attribution do not necessarily equal the current database's 30-day rule. Register `project_type`, `start_choice`, `failure_stage` or `failure_reason` as event-scoped custom dimensions only if needed for reports.
4. Compare GA signup trends with auth counts of newly committed accounts and existing acquisition records over a defined period. GA users are not guaranteed to equal accounts: blocking, consent, navigation, browser/device changes, and identity settings affect observation and linkage. GA does not backfill events before instrumentation.
5. Decide separately whether account-level acquisition data is still needed. Keep the existing collection and historical records until GA is verified and a migration and retention decision is made; this proposal does not authorize their removal.

Sources: [GA recommended events](https://support.google.com/analytics/answer/9267735), [traffic-source scopes](https://support.google.com/analytics/answer/11080067), [UTM tagging](https://support.google.com/analytics/answer/11242870), [GA custom dimensions](https://support.google.com/analytics/answer/14240153).
