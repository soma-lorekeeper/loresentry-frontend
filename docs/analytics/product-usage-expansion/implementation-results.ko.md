# 제품 사용 계측 구현 결과

[English](implementation-results.md)

2026-11-03 프런트엔드 작업 트리에 구현했다. 배포, 운영 이벤트 수신과 GA 보고서 데이터 반영은 별개의 미수행 검증이다. 최초 [현재 상태 조사](current-state.ko.md)는 변경 전 기준 상태를 설명한다.

## 구현 코드

[이벤트 카탈로그](additional-events.ko.md)의 이벤트 계약 56개를 `src/features/analytics/usage-schema.ts`에 타입으로 정의했다. 애플리케이션 흐름에서 55개를 호출한다. `action_result_resolved`는 조건부 조정기 기능으로, 현재 API로는 나중의 결과가 같은 미확정 시도에 속함을 확정할 수 없어 운영 호출부를 두지 않았다. 일반 재조회로 결과를 추정하거나 이벤트를 만들기 위해 변경 요청을 재실행하지 않는다.

- 공통 전송기는 선언한 범주와 유한한 음이 아닌 숫자만 허용한다. 잘못된 열거값·숫자와 핵심 맥락 누락을 거부하고 `schema_version=usage_v1`, `ui_locale`을 추가하며, 제품 동작을 중단시키지 않는다. 운영 수집에는 여전히 API 설정, 측정 ID와 정확한 `loresentry.com` 호스트가 필요하다.
- 프로젝트·파일·문서·메모·대화 세션·계정·피드백 작업은 캐시 무효화 전에 시도와 확인된 결과를 기록한다. 네트워크 불확실성은 미확정으로 남기며, 내보내기와 인쇄는 브라우저에 넘긴 상태로 기록한다. 기존 가입·프로젝트 생성·원고 저장·검색·최신화 이벤트를 유지한다.
- 포커스된 탭 활성화와 실제 준비 완료를 구분한다. 유지된 숨김 탭과 백그라운드 재조회가 열림을 만들지 않으며, 명시적 재시도는 구분한다. 포커스가 없는 분할 창에서도 보이는 설정 점검 보고서는 측정할 수 있다.
- 편집은 겹치지 않는 60초 요약, 상한이 있는 포그라운드 활동 시간, 실제 저장 응답과 미해결 저장 문제·복구 구간으로 집계한다. 별칭·관계 설명 변경은 같은 저장 판 안에서 합친다. 새 맞춤 페이로드에서 본문·이름·검색어·식별자·원문 오류를 제외한다.
- 가져오기는 기존 부분 성공·재시도·정리 동작을 유지하고, 시도한 파일마다 한 번만 집계한다. 채팅은 최종 응답, 명시적 중지, 신뢰할 수 있는 서버 오류와 불확실한 중단을 구분한다. 세션 생성 실패의 출처를 유지하고, 첫 내용 도착 시간에 준비 시간을 포함한다. 설정 점검의 시작 수락·단조로운 종료 관측·보고서 활용·판정 변경을 구분한다.
- 명시적 대화상자, 관계도·타임라인 탐색, 메모 조작, 랜딩 행동, 환경설정, 약관 동의, 온보딩, 도움말, 투어와 피드백을 기능 처리부에 연결했다. 로컬 검색을 합쳐 기록하고 연속 카메라·호버 이벤트를 제외하며, 투어 예시 중에는 새 사용 이벤트를 중지한다. 모달 재조회나 컴포넌트 정리만으로 사용자가 창을 닫았다고 판단하지 않는다.

`src/features/analytics/ga-custom-definitions.ts`가 등록 명세다. 알 수 없는 선택적 맥락은 생략하며, 사용자 내용에서 채우거나 진입 위치를 만들어 내지 않는다. 계측을 이유로 채팅·내보내기에 새 미저장 문서 차단을 적용하지 않고 기존 동작을 유지한다.

공통 GA 기본 제목을 `Lore Sentry`로 고정해 인쇄 창의 파일명으로 잠시 사용하는 원고 제목이 기본 분석 제목이 되는 것을 방지했다. 기존 URL·리퍼러 정리를 유지한다.

## GA 설정

대상은 속성 `557572950`, 웹 스트림 `https://loresentry.com`, 측정 ID `G-FV1Y05NZQW`다. 스트림과 기존 정의를 확인한 뒤, 이미 로그인된 GA UI에서 ego lite로 등록했다. 최종 저장 목록을 등록 명세와 대조해 이벤트 범위 측정기준 45개와 이벤트 측정항목 22개, 숫자 단위의 정확한 일치를 확인했다. [검증된 GA 목록](ga-registration.json)을 참고한다.

이벤트 범위 측정기준 41개를 새로 추가했다. 기존 정의 4개를 유지해 50개 중 5개의 여유를 남긴다. 기존 `start_choice` 정의를 재사용한다. 원래 이벤트에서 파생한 복제 이벤트나 추가 주요 이벤트를 만들지 않는다.

```text
ui_locale, entry_point, action, outcome, dialog_kind, document_type,
view_kind, error_category, stage, is_retry, entity_kind, issue_kind,
resolution, format, input_method, import_format, search_scope,
count_bucket, rank_bucket, area, memo_scope, availability, send_mode,
intent, has_quote, citation_kind, creation_mode, feature, notice_kind,
start_mode, report_changed, finding_kind, is_core, verdict, draft_kind,
close_reason, had_local_edits, preference, value, step_key, topic_key
```

새 숫자 측정항목은 16개다. 기존 초 단위 `duration_seconds` 측정항목을 재사용하고 표시 이름 **Refresh Ready Duration**을 유지한다. 해석할 때 이벤트 이름으로 필터링한다. 기존 정의를 유지하며, 저장된 이벤트 측정항목 합계는 50개 중 22개다.

| 단위      | 새 파라미터                                                                                                                                                                                                                                      |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 초        | `active_edit_seconds`, `first_content_seconds`, `processing_seconds`                                                                                                                                                                             |
| 일반 횟수 | `save_attempt_count`, `save_success_count`, `save_issue_count`, `accepted_count`, `unsupported_count`, `duplicate_count`, `file_count`, `succeeded_count`, `failed_count`, `unknown_count`, `citation_count`, `finding_count`, `unmatched_count` |

등록 한도를 남기기 위해 상수 `schema_version`, 진단 플래그 `had_input`, `body_changed`, `title_changed`, `properties_changed`, `has_reason`과 현재 사용하지 않는 조건부 `operation_group`에는 보고서 정의를 만들지 않는다. 허용된 페이로드 필드이지만 GA 보고서 측정기준은 아니다.

## 검증과 배포 후 확인

- 전체 테스트 115개 파일, 893개가 통과했다. 이후 준비 상태·합산 수정은 관련 테스트 27개로 검증했다. 린트·TypeScript·포맷·토큰 일치 검사도 통과했다.
- 한국어·영어 운영 정적 출력을 모두 빌드했다. 각 언어가 필수 라우트 11개, HTML 18개, 파일 821개의 정적 검증을 통과했다. 최초 샌드박스 빌드는 실패했으나, Google Fonts에 필요한 네트워크 접근을 허용한 실제 언어별 빌드는 성공했다.
- 새 테스트는 페이로드 개인정보·유효성 검사, 비활성·오류 전송기, 한 번만 확정되는 시도, Strict Mode와 숨김 뷰·대화상자, 저장 문제 구간, 주기별 활동 시간, 늦은 폴링, 재조회 전 채팅 응답, 거짓 사전 저장 결과의 기존 동작 유지, 중지·정리로 인한 중단을 다룬다.

운영 보고서를 해석하기 전에 정상 배포 절차로 프런트엔드를 배포하고, 통제된 실제 서비스 흐름을 실행한다. 실제 GA 수신과 맞춤 정의 반영, 자동 필드, 내보내기 전달, 부분 가져오기·재시도, 스트리밍 중단과 설정 점검 완료를 확인한다. 로컬 전송 대역과 정적 출력 검사는 이러한 외부 효과를 입증하지 않는다. 광고 차단·동의·페이지 이탈·다른 기기 사용의 해석 한계는 [측정 계획](measurement-plan.ko.md)에 남아 있다.

이번 작업은 작업 트리를 커밋·푸시·배포하지 않는다. 테스트가 운영 GA 속성으로 사용자 내용이나 합성 localhost 트래픽을 보내지 않는다.
