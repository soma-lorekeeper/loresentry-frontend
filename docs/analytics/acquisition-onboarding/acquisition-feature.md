# Acquisition and onboarding: frontend behavior

This document describes the checked-out frontend's acquisition, signup and onboarding flow. It does not verify the deployed site or define new events. The proposed measurement contract is in [acquisition events](acquisition-events.md).

## User flow

1. **Arrive.** A script in the page head records the current URL, referrer and time in session storage before React runs, retaining the latest five page loads. At app startup the frontend processes them into a browser-local acquisition record. It extracts five UTM fields, one valid advertising click ID, an external referrer host, landing path and time; other query values are not stored in this record.
2. **Choose a source.** A landing with UTM, a click ID or an external referrer replaces the previous record; direct visits replace nothing unless there is no record. Records older than 30 days expire. The service's domains and `accounts.google.com` are not external referrers. The selected path is for that selected landing, not necessarily the first visit.
3. **Send page views.** When the existing GA tracker runs under its enablement conditions, it sends a sanitized `page_view` on arrival and route changes. Allowed UTM and advertising click parameters remain in `page_location`; the app also sanitizes the referrer. The same sanitized location is not sent twice in succession. This is separate from the local acquisition record.
4. **Authenticate and accept terms.** Google login can return a terms-required result. The frontend displays the terms, sends acceptance, and confirms a session. The auth server registers or finds the account before checking the current terms. The same terms-required flow also applies to an existing account that has not accepted the current version; acceptance alone cannot identify a new signup.
5. **Enter onboarding.** For a non-replay user whose onboarding is incomplete, the frontend attempts to send the stored acquisition record to `PUT /auth/users/me/acquisition`. The server allows the first record per account before onboarding completion. On success the frontend clears the local record; on failure it keeps it for a later eligible entry. A user who does not reach this flow may not have a record.
6. **Finish and create a project.** On first completion, the frontend awaits the onboarding completion request. The user may choose an example project, start a new project, or continue later. Example creation is a separate request after onboarding completion; the normal project form sends a separate creation request. A successful onboarding request does not prove project creation succeeded. Replay does not repeat onboarding completion.

## Frontend code

- [Landing and local acquisition](../../../src/features/analytics/acquisition.ts), [acquisition submission](../../../src/features/analytics/use-record-acquisition.ts)
- [Google tag and URL sanitization](../../../src/features/analytics/google-analytics.ts), [page tracker](../../../src/features/analytics/google-analytics-tracker.tsx)
- [Login](../../../src/features/auth/login-page.tsx), [terms acceptance](../../../src/features/auth/terms-consent.tsx)
- [Onboarding](../../../src/features/onboarding/onboarding-page.tsx), [project creation](../../../src/features/projects/project-dialogs.tsx), [mutations](../../../src/features/projects/queries.ts)
