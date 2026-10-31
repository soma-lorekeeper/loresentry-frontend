# 리프레시 애널리틱스 QA 결과

일시: 2026-10-31 (한국 시간). 프론트엔드 `1217f25`의 CI/CD 성공 후 운영 사이트에서 합성 QA 프로젝트 `QA-GFR-FIX-20261024-1817 P`로 검증했다. 입력 문서 1개가 잠겼고 최신화 결과는 READY였다.

| 확인 | 브라우저 이벤트와 값 | GA 실시간 수신 |
| --- | --- | --- |
| 시작 클릭 | `refresh_start_click` | 1회 |
| 시작 성공 | `refresh_started`, `input_document_count: 1` | 1회 |
| 결과 준비 | `refresh_result_ready`, `draft_count: 6`, `new_document_draft_count: 5`, `duration_seconds: 73.597` | 1회 |
| 검토창 열기 | `refresh_review_opened` | 1회 |
| 반영 시도와 실패 | `refresh_apply_click` 3회, `refresh_apply_failed` 2회, `failure_stage: confirm_request` | 각각 3회와 2회 |
| 반영 성공 | `refresh_applied`, `draft_count: 6`, `new_document_draft_count: 5`, `created_document_count: 0`, `updated_document_count: 0` | 1회 |

soma 속성의 실시간 보고서에서 이벤트 이름과 건수를 확인했다. 매개변수 값은 브라우저 `dataLayer`에서 확인했으며 GA 보고서에서는 확인하지 않았다. 확인한 커스텀 매개변수에는 문서 내용이나 ID가 없었다.

같은 위치에 같은 이름의 문서가 있다는 이유로 서버가 반영 시도 두 번을 거절했다. 작업본을 초기화한 뒤 현재 버전 전체를 선택해 확정하자 `APPLIED`가 됐으며 생성·변경 문서 수는 모두 0이었다. 이름 충돌의 원인과 전체 버전 선택 동작은 별도로 조사하지 않았다. QA 원고는 프로젝트에 남아 있고 READY 잠금은 해제됐다.

이번 재검증에서는 `NO_CHANGE`, 시작 실패, 결과 실패, 실제 생성·변경 문서 수가 0보다 큰 반영 성공은 수행하지 않았다.
