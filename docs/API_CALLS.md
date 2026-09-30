# 프론트 호출 API

> **책임:** 프론트가 BFF를 호출하는 시점, 입력 구성과 응답·오류 사용을 정한다.
>
> **확인할 때:** 서비스 포트와 API 어댑터를 구현하거나 서버 연동을 검증할 때.
>
> **관련 기준:** 제공자의 HTTP 규격은 [BFF API](../../loresentry-gateway/docs/API.md), 화면 상태는 [약관 동의 설계](auth/TERMS_CONSENT_DESIGN.md)를 따른다.

로그인과 약관 동의에 필요한 호출을 관리한다. 로그인 시작·본인 계정 조회는 현재 구현이며,
약관 조회·동의 완료는 **MVP 미구현 계약**이다. 브라우저는 BFF만 호출하고 Auth를 직접 호출하지 않는다.

## 공통 호출

API 주소는 런타임 설정의 `apiBaseUrl`을 사용한다. JSON 요청은
[ApiClient](../src/services/api/http.ts)를 통해 `credentials: "include"`를 적용하며,
변경 요청에는 `X-LS-CSRF: 1`을 보낸다. 브라우저가 관리하는 쿠키를 직접 읽거나
세션 ID·동의 대기 ID·내부 사용자 ID를 요청 본문이나 별도 헤더에 넣지 않는다.

화면은 [서비스 포트](../src/services/ports.ts)를 호출한다.
[Auth 어댑터](../src/services/api/auth.ts)는 HTTP 필드를 화면 타입으로 변환하고 응답을 검증한다.
약관 조회·제출은 자동 재시도하지 않으며, 동의 POST의 응답 유실을 미실행으로 판단하지 않는다.

## 로그인·동의 호출 목록

| 서비스 호출                          | BFF 요청                         | 호출 시점·입력                                                                | 결과 사용                                                                                   |
| ------------------------------------ | -------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `startGoogleLogin(returnTo)`         | `GET /auth/oauth/google/prepare` | Google 로그인 버튼에서 브라우저 페이지 이동. fetch로 호출하지 않음            | Google 인증 후 BFF의 고정 로그인 주소로 복귀. 현재 어댑터는 `returnTo`를 서버에 보내지 않음 |
| `getSession()`                       | `GET /auth/users/me`             | 일반 로그인 확인 또는 동의 완료 후. 본문 없음                                 | `id`, `display_name`, `email`을 `User`로 변환. 새 조회 결과로 서비스 진입 판단              |
| `getTerms()` — 추가                  | `GET /auth/terms`                | `result=terms_required` 진입 또는 버전 불일치 후 재조회. 본문 없음            | 제목·버전·원문·시행일 표시와 제출할 버전 ID 보관                                            |
| `acceptTerms(termsVersionId)` — 추가 | `POST /auth/terms/accept`        | 사용자가 표시된 원문에 동의할 때 `{ "terms_version_id": "조회한 UUID" }` 전송 | 본문 없는 `204` 확인 후 본인 계정 재조회. Google 콜백을 다시 호출하지 않음                  |

`result`는 화면 진입 안내이며 인증 근거가 아니다. 일반 로그인 화면에서는 동의 대기를
자동 조회하지 않는다. 취소 API는 없으며 모달·탭 닫기는 서버 요청을 만들지 않는다.

## 약관 응답 사용

필드의 필수 여부·형식·HTTP 상태는 [BFF 약관 API](../../loresentry-gateway/docs/API.md#약관-동의-api-mvp-미구현)를 기준으로 한다.

| 조회 응답 필드                | 프론트 사용                                                |
| ----------------------------- | ---------------------------------------------------------- |
| `terms_version_id`            | 확인한 원문의 식별자. 동의 제출 시 그대로 사용             |
| `version`, `title`, `content` | 버전·제목·일반 텍스트 원문 표시                            |
| `effective_at`                | 약관 시행일을 한국 시간으로 표시                           |
| `expires_at`                  | 동의 대기 만료 판단 보조. 로그인 세션 만료로 사용하지 않음 |

원문 필드·UUID·시각 형식을 검증하고 빈 응답이나 잘못된 응답은 조회 성공으로 처리하지 않는다.
조회로 대기 수명을 연장하지 않으며 만료의 최종 판정은 서버가 한다. 원문·동의 여부를
브라우저 영구 저장소에 저장하거나 로컬 동의 플래그로 서버 검사를 대체하지 않는다.

동의 완료는 성공 HTTP 상태를 보존해 `204`인지 확인한다. 현재 `ApiClient.request()`는
성공 상태를 호출자에게 반환하지 않으므로 어댑터가 다른 2xx 응답을 동의 성공으로
오인하지 않도록 확장한다. 쿠키 설정·삭제는 BFF 응답을 브라우저가 처리한다.

## 오류 변환

서버 `code`를 기준으로 화면용 오류를 구분하며 서버의 진단용 `message`를 그대로 표시하지 않는다.
전체 오류 정의는 BFF API를 따르고, 프론트의 [오류 변환](../src/services/api/errors.ts)과
[서비스 오류 타입](../src/services/errors.ts)에 다음 구분을 추가한다.

- `CONSENT_REQUEST_INVALID`: 동의 대기 무효. 일반 로그인 세션의 무효와 구분한다.
- `TERMS_VERSION_MISMATCH`: 원문 재조회가 필요한 상태. 현재의 일반 `409` → `duplicate` 변환에 맡기지 않는다.
- `INVALID_REQUEST`·`CSRF_REJECTED`: 입력·요청 거부. CSRF 오류를 일반 `403` → `unauthenticated` 변환에 맡기지 않는다.
- `LOGIN_UNAVAILABLE`·`UPSTREAM_INVALID_RESPONSE`·통신 실패·응답 검증 실패: 동의 결과를 확정하지 못한 상태. 완료 요청을 자동 재전송하지 않는다.

오류별 모달·체크박스·로그인 재시작 처리는 [화면 오류 처리](auth/TERMS_CONSENT_DESIGN.md#4-오류별-화면-처리)를 따른다.
본인 계정 조회의 `SESSION_UNAVAILABLE`은 일시 장애로 유지하고, 세션 없음으로 바꾸지 않는다.
