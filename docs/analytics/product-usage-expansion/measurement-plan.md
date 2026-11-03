# Measurement and interpretation plan

[한국어](measurement-plan.ko.md) · [Folder guide](README.md)

Status: proposed reports for the [event catalog](additional-events.md). No report or GA setting was created by this task. The questions below guide an initial implementation without restricting later exploratory analysis to a single funnel.

## Questions and usable evidence

| Question                                                      | Events/filters to use                                                                                                                    | Intended product decision and limits                                                                                                                                        |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Which features are reached after workspace entry?             | `workspace_entered` and `workspace_view_opened`, broken down by view_kind. Chat uses `chat_window_opened`.                               | Improve discoverability and starting guidance. Count users for reach and occurrences for repeated openings separately. Loaded does not mean read or understood.             |
| Where does preparing a manuscript fail?                       | Existing project creation, manual `file_action_result` with action=create, import selection/start/result, document save issues/recovery. | Decide whether creation, supported import formats or saving needs work. Import batch outcomes and file counters have different units; samples may need no import.           |
| Do users try AI chat and receive an answer?                   | Chat-window reach, `chat_turn_started`, `chat_turn_result` by outcome/send_mode, notices, latency.                                       | Improve discovery, latency, restrictions or reliability. Completion is a received final turn, not a quality rating. A stopped local stream is not proof the server stopped. |
| Do users use a received AI answer?                            | Completed chat turns, `chat_action` filtered to copy_answer/open_citation, and following workspace views.                                | Prioritize answer usability and source navigation. Copy and citation selection are behavior proxies; neither proves correctness or satisfaction.                            |
| Does setting error checking lead to review?                   | Accepted check starts, observed terminal runs, report views, finding actions and verdict results.                                        | Improve start guidance, runtime or result presentation. Historical report views must not be counted as new job completions. Zero findings is a valid completed result.      |
| Do users review and apply setting-document refreshes?         | Existing start/ready/review/apply events plus new review actions/closing.                                                                | Identify friction before confirmation. Keep no-run/no-change/failed outcomes separate. A closed review can be resumed and is not definitive abandonment.                    |
| Are search and visual exploration useful paths to a document? | Search results by scope/outcome, result selections, graph/timeline actions and document view loads.                                      | Improve retrieval and navigation. Superseded search is user query replacement, not a failed search. A selected result is not a completed document load.                     |
| Which supporting features are used and where do actions fail? | Project/file/document/memo/account action results, help, preferences, feedback, tour events.                                             | Prioritize breadth improvements. Theme/locale selection, account locale persistence, consent acceptance and signup remain distinct.                                         |

## Three initial journeys

### Prepare and reach a core feature

Start with a signup cohort and a chosen seven-day observation window: observed signup → project creation → workspace entry → either refresh started, chat turn started, or accepted setting-check start. Report the three branches separately rather than requiring every user to use every feature. Seven days is a proposed starting window, not an established product target.

Show the existing refresh application milestone as a separate later branch. Import and manuscript saving are optional preparation branches because sample projects already contain material. Do not place imports in the mandatory funnel. Signup occurs before terms acceptance, so it does not establish service access; use consent/account-result data and existing authentication failures to investigate that gap.

Use GA user-based ordered funnel exploration for **observed user progression**. It can combine actions from different projects, visits or repeated attempts. Without transmitting identifiers it cannot prove that an answer or refresh belongs to the project created earlier, nor that an action is the first in the account's lifetime. A closed funnel can also drop later successes when an intermediate browser event was missed. Existing [first-core-value limits](../first-core-value/core-value-events.md) still apply.

### Chat: attempt, result and use

Inspect turn results by send_mode and outcome before drawing a user funnel. Then examine a user sequence of chat opening → send → completed result → copy or citation request. Observe whether the document actually loads after citation selection, but do not join an individual citation to an individual loaded document using event order alone.

Keep normal sends, retries and edited-question sends separate. A retried turn is another attempt, and a session can contain many turns. Use the browser-measured first-content and total duration distributions for completed/interrupted turns as supported by the report; label the completion bias because turns with no terminal observation contribute no final latency. Do not call the result model inference time or server throughput.

### Check: accepted job, result observed and review

Show start-request outcomes, terminal observations, report views and successful verdict changes as distinct panels. For an optional user funnel, use accepted start → observed done → report viewed → verdict saved. Explicitly label it as user progression, not a matched run funnel. Verdict entry is optional; users can read and agree without leaving one. No findings is not a failure to engage.

Break out failed, cancelled, blocked and unknown starts. A cancel accepted response can race with completion; report the actual later observed terminal state separately. A report reopened from history is use of existing results. An already terminal run at page entry must not enter the newly-completed series.

## Metrics and their denominators

| Metric                     | Definition                                                                                                                       | Interpretation boundary                                                                                                                                     |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature reach              | Observed users with the relevant feature-open event / observed users with workspace_entered in the same chosen period.           | A user-period reach measure. Users can exceed the denominator if events/cohorts are mixed; use one consistently filtered population.                        |
| Chat answer reach          | Signup-cohort users with at least one completed chat turn within the chosen window / observed signup-cohort users.               | Observed activation proxy, not all database accounts or exact first-ever success.                                                                           |
| Chat outcome mix           | Each outcome's chat_turn_result occurrences / all observed chat_turn_result occurrences, with consistent send_mode/date filters. | Conditional on a terminal browser result. Show started occurrences and unobserved-result gaps alongside it; do not treat those gaps as failures.            |
| Search empty-result share  | Empty search_request_result occurrences / (results + empty) occurrences for one search_scope.                                    | Successful returned searches only. Show error and superseded outcomes separately. Do not add legacy project_search counts.                                  |
| Import completion by file  | Sum succeeded_count / sum file_count from observed document_import_result events, with retries shown separately.                 | Attempted-file completion in observed batches, not unique files. Also show failed_count/unknown_count and batches with missing results.                     |
| Save-issue exposure        | Users with document_save_issue / users with a nonempty document_edit_summary in the chosen period.                               | Approximate user-period exposure; missing final summaries and mixed observation windows can affect the denominator. Also show raw users and issue episodes. |
| Save recovery observations | Counts of document_save_recovered by resolution, with issue-episode and editing-summary counts beside them.                      | Do not divide calendar-period recoveries by calendar-period issues as an exact recovery rate; an episode may span periods or be lost on reload.             |
| Observed check outcomes    | Counts of done/failed/cancelled run observations, alongside accepted starts, report views and missing observations.              | No exact server job success rate: starts and terminal observations can come from different tabs or periods.                                                 |
| Refresh application reach  | Users reaching existing refresh_applied in the selected signup-cohort window / observed signup-cohort users.                     | Keep no-change and failure branches visible; it is not draft acceptance percentage.                                                                         |

For action-result families, compare outcome **mix among observed results** by action. Show start counts and unknown/resolution counts separately. No raw ratio of result occurrences to start occurrences proves an exact attempt success rate: events can be blocked, lost, duplicated across tabs, or span the date boundary. Resolutions do not create another initial result and must not be added to the original result denominator.

Use users, occurrences, files, drafts, documents, turns, jobs and issue episodes as explicit units. Never compare sums from different units as if they were conversions. Do not publish confidence or statistical-significance claims from small counts without an analysis designed for that question.

## Segmentation and report setup

Begin with action/outcome, view_kind, document_type, entry_point, search_scope, send_mode and existing acquisition source/medium/campaign. Add ui_locale only when relevant; distinguish application locale from GA's browser-language dimension. Use the correct first-user or session source scope for the question. Existing project_type only describes the project-creation event; it does not label every later action in the same user journey.

Register only parameters actually used in reports as custom dimensions/metrics, after inspecting existing definitions and capacity. [Google's parameter guide](https://developers.google.com/analytics/devguides/collection/ga4/event-parameters) explains that sending a parameter and registering it for reports are separate steps. A proposed first set is:

- Dimensions: outcome, action, view_kind, document_type, entry_point, search_scope, send_mode, error_category. Add feature/notice_kind, verdict or close_reason when their panels are built.
- Metrics: duration_seconds, first_content_seconds, processing_seconds, file_count, succeeded_count, failed_count, unknown_count, save_attempt_count, save_success_count, save_issue_count and active_edit_seconds, only for reports that need them. Existing refresh metrics are reused.

A metric with a shared name must retain one unit; distinguish browser duration from server processing duration. Do not average a mixture of actions as one service latency. Verify whether the chosen GA surface supports the requested distribution; a registered average does not itself provide percentiles.

Retain existing login/signup/tutorial event names rather than adding synonyms. [Google distinguishes automatic, enhanced, recommended and custom events](https://developers.google.com/analytics/devguides/collection/ga4/events); custom product events fill service-specific gaps. Review existing key-event configuration before changing it. Existing sign_up and refresh_applied are candidate business milestones; marking every new event, or an unfiltered generic result event containing failures, as a key event would not express successful product use.

Do not use IDs or arbitrary timestamps as custom report dimensions. They increase distinct values and can cause report rows to collapse into `(other)`, as described in [Google's cardinality guidance](https://support.google.com/analytics/answer/12226705?hl=en). Report capacity and configuration are rollout checks, not values assumed verified here.

## Exploration, retention and operational truth

After initial deployment, inspect feature-to-feature paths and returning users with meaningful actions, including users who never enter the main funnel. Define a returning-active observation as a later observed day with editing, a successful import/manual creation, a completed chat turn, or use of check/refresh results; a background page view alone is not this proposed activity definition. Select explicit calendar timezone and cohort windows before comparing retention. This definition needs configuration and verification and is not implemented by this document.

GA is a best-effort view of behavior. Browser blocking, consent/enablement state, unloads, network failures and identity changes affect it. Exact account-level retention, same-project conversion, billable/model cost, job reliability, cancellation acknowledgment and content correctness require suitable server-side records and, where relevant, an independently designed evaluation. Do not forward internal logs or content to GA to make the numbers align.

The first review after rollout should therefore inspect payload quality and journey consistency before interpreting product trends. Keep failed attempts and unknown outcomes visible, and use operational totals for aggregate context without claiming a per-event identity join.
