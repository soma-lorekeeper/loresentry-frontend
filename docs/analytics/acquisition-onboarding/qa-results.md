# Acquisition and onboarding analytics QA

Run: 2026-10-31, approximately 15:00–15:16 KST. The production site and API were tested in Windows ego lite with the first account in `tools/google-test-id/account.json`. Its identity was matched to the account reference without recording credentials. This account had already completed onboarding. CI/CD completed successfully for authentication `e4cba81`, gateway `28a3985`, and frontend `01e70f4` before the project and login checks. The landing-page check occurred before frontend deployment completed.

| Check | Observation | Result |
| --- | --- | --- |
| UTM landing | Opening the landing page with `utm_source=qa_test`, `utm_medium=qa`, and `utm_campaign=analytics_qa_20261031` produced one browser `page_view` containing those values in `page_location`. | PASS in browser; attribution and GA parameter receipt not verified. |
| Standard project creation | A real synthetic project, `QA-GA-20261031`, appeared in the project list and workspace. The browser recorded one `project_create_started` and one `project_created`, both with `project_type: standard`. | PASS; the soma GA realtime report also displayed one of each event. |
| Existing-account login | Two Google login attempts were made. The first returned `result=success` but the page displayed a login failure. The second returned to an authenticated session: `/auth/users/me` returned 200 and the browser recorded one `login` with `method: google`, without `sign_up` in the observed event list. | PASS on retry; first attempt requires investigation. The realtime report displayed `login_start` twice and `login` once. |
| Authenticated reload | Reloading the project list produced `page_view` only in the observed browser event list. | PASS for no duplicate `login` or `sign_up` on this reload. |
| Automated checks | `pnpm exec vitest run src/features/analytics/onboarding-analytics.test.ts src/services/api/api-services.test.ts` | 2 files and 79 tests passed. These do not replace production browser checks. |

The realtime report is an aggregate: its counts can include other visitors. Event parameters were checked in the browser `dataLayer`, not in GA. The check does not establish end-to-end UTM attribution, event ordering across OAuth, or the completeness of GA reporting.

## Observations needing follow-up

- After confirming logout, the UI reported that logout failed, while a subsequent credentialed `/auth/users/me` returned 401. Navigation to the project list reached the login page. The logout request and server-side cause were not captured; this is an observed discrepancy, not a diagnosed cause.
- On the first login attempt, the OAuth return URL reported `result=success`, but the UI reported failure. Only `page_view` was present in the inspected post-return `dataLayer`; the expected failure event was not observed there. A second attempt succeeded. The cause and whether an event was transmitted outside the observation window remain unverified.

## Not executed

The available signed-in test identity already had an account and completed onboarding; the second test identity was not signed in and its app registration state was not established. No account was deleted or reset to manufacture a new signup. Therefore fresh registration, terms, `sign_up`, onboarding choices and completion, sample-project creation, failure branches, GA attribution across signup, and the signup-to-refresh funnel remain unverified. The prior refresh QA is recorded separately in [refresh QA results](../refresh/qa-results.md); it is not a signup-to-refresh execution.

The synthetic project remains in the test account. No unrelated projects were changed.
