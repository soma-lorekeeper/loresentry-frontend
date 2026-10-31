# First core value: frontend behavior

This document describes the checked-out frontend journey from onboarding to setting-document refresh. It does not verify deployment, identify a user's first-ever action, or define new analytics events. The proposed journey measurement is in [core-value events](core-value-events.md).

## User flow

1. **Finish onboarding.** An eligible new user completes onboarding and chooses an example project, a new project, or to continue later. Completion is saved before example-project creation. A user choosing later can reach the project list without creating a project.
2. **Create a project.** The example option requests sample project creation and opens its workspace on success. For a normal project, the user submits a title and optional description; the frontend calls the creation service and handles a successful response. Project creation and onboarding completion can succeed or fail independently.
3. **Prepare and start refresh.** In a workspace, the user opens the refresh confirmation and starts it. The frontend first saves open documents. On save failure it does not send the start request. A successful start response can contain a run or indicate there is no change to refresh.
4. **Observe and review.** The frontend polls while a run is in progress. A browser observing a transition to ready shows a notice; a run already complete on entry does not produce that transition. When ready, the user can open and review the proposals.
5. **Apply.** The frontend saves pending draft changes and confirms application. A successful response or a status recheck after an uncertain response can establish that the result was applied. Confirmation does not establish acceptance of every proposal.

The browser can lose connectivity, close or miss a status transition. A refresh in the user's journey need not belong to the project they first created. The frontend events do not identify the same project across steps or establish a first-ever milestone. For refresh states and API details see [refresh frontend behavior](../refresh/refresh-feature.md).

## Frontend code

- [Onboarding choices](../../../src/features/onboarding/onboarding-page.tsx), [project creation](../../../src/features/projects/project-dialogs.tsx)
- [Refresh start](../../../src/features/workspace/sidebar/graph-refresh-item.tsx), [result watcher](../../../src/features/graph-refresh/refresh-watcher.tsx), [review and confirmation](../../../src/features/graph-refresh/graph-diff-modal.tsx)
- [Existing refresh tracking](../../../src/features/analytics/refresh-analytics.ts)
