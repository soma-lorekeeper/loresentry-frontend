# Refresh analytics QA results

Date: 2026-10-31 (KST). Production was tested after successful CI/CD for frontend `1217f25`, using the synthetic QA project `QA-GFR-FIX-20261024-1817 P`. One input document was locked and the refresh reached READY.

| Check | Browser event and values | GA Realtime receipt |
| --- | --- | --- |
| Start click | `refresh_start_click` | 1 |
| Start success | `refresh_started`, `input_document_count: 1` | 1 |
| Result ready | `refresh_result_ready`, `draft_count: 6`, `new_document_draft_count: 5`, `duration_seconds: 73.597` | 1 |
| Review opened | `refresh_review_opened` | 1 |
| Apply attempts and failures | `refresh_apply_click` 3 times; `refresh_apply_failed` twice, `failure_stage: confirm_request` | 3 and 2, respectively |
| Apply success | `refresh_applied`, `draft_count: 6`, `new_document_draft_count: 5`, `created_document_count: 0`, `updated_document_count: 0` | 1 |

Event names and counts were confirmed in the soma property's Realtime report. Parameter values were observed in the browser `dataLayer`, not in a GA parameter report. The observed custom parameters contained no document content or IDs.

The server rejected two apply attempts because a document with the same name existed in the same location. After resetting the drafts and selecting all current versions, confirmation reached `APPLIED` with zero created and updated documents. The cause of the name conflict and bulk-selection behavior was not investigated. The QA manuscript remains in the project; the READY lock was released.

`NO_CHANGE`, start failure, result failure, and successful apply with a nonzero changed-document count were not exercised in this retest.
