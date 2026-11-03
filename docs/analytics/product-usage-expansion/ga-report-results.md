# Published GA reports

[한국어](ga-report-results.ko.md)

On 2026-11-03, four detailed reports were published in **Reports → LoreSentry** in GA property **soma** (`557572950`, account `410899988`), using ego lite. This follows the earlier [instrumentation and custom-definition work](implementation-results.md). Application deployment and receipt of the new production events remain unverified.

## Published menu

| Topic | Report label in GA | Report ID | Event-name filter |
| --- | --- | --- | --- |
| 제품 사용 | AI 채팅 응답 결과 | `16260962922` | Regex `^chat_turn_result$` |
| 제품 사용 | 제품 사용 이벤트 | `16260828136` | Product event-family regex in [ga-reports.json](ga-reports.json) |
| 설정 오류 탐지 | 설정 오류 탐지 실행 결과 | `16260783298` | Begins with `setting_check_run_observed` |
| 설정 오류 탐지 | 설정 오류 탐지 이벤트 | `16260835081` | Begins with `setting_check_` |

Collection `16237975503` remains published to all property users. Its Refresh and Signup topics and five existing reports were preserved. These are detailed reports in the Reports menu; a separate overview/dashboard report was not created.

## Reading the reports

All four show event count, total users and events per active user, with line and bar charts. Product usage and setting-check events default to event name. Their dimension selectors offer registered Usage categories; keep event name alongside outcome/action when interpreting different event types.

The product-family regex covers all **55 operational event names** in the current catalog and matching existing events, including `workspace_entered`, `onboarding_start_selected` and `refresh_review_opened`. The unconnected conditional `action_result_resolved` helper is excluded. This is not a new-events-only release monitor.

The execution report defaults to **Usage Outcome** (`done`, `failed`, `cancelled`), adding **Usage Processing Seconds** and **Usage Finding Count**. These metrics sum valid reported values. Missing values are excluded, so dividing by every event does not establish a valid average. Terminal observations require the browser to have seen RUNNING and do not measure server job success rates. Start acceptance, cancellation acceptance, historical report views and verdict actions remain separate in the broader setting-check event report.

The chat result report defaults to **Usage Outcome** and adds **Usage First Content Seconds** and **Usage Citation Count**, likewise sums where values exist. It isolates `chat_turn_result` from window opens, request starts and other chat actions.

## Verification and remaining work

The saved collection was reopened in the library and confirmed published to all users. Both new topics were expanded in the actual left navigation, and all four reports were opened from that menu. Persisted filters, default dimensions and metric headers were checked. Actual report URLs and the inventory are in [ga-reports.json](ga-reports.json).

For the displayed last-28-days window (2026-10-06 through 2026-11-02), product usage showed existing matching events; the new setting-check and chat result reports showed no available data. This verifies report configuration, not ingestion of newly implemented events. Deploy instrumentation and verify real production receipt before interpreting the new reports. No synthetic production events were sent.
