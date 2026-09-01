# 로그인 페이지

## 역할

사용자 인증에만 집중한다.

## Route

```text
/login
```

## 초기 범위

- Lorekeeper 로고를 표시한다.
- `Google로 계속하기`를 제공한다.
- 이용약관과 개인정보처리방침 링크를 제공한다.
- Google 버튼을 누르면 이용약관에 동의하고 개인정보처리방침을 확인한 것으로 처리한다는 안내를 표시한다.
- 인증 방식은 Google OAuth만 제공한다.
- 이메일·비밀번호 로그인은 제공하지 않는다.
- 별도 회원가입과 비밀번호 찾기는 제공하지 않는다.
- 별도의 약관 동의 화면은 제공하지 않는다.

페이지 간 이동은 [Google OAuth 인증 Workflow](../workflow/authentication.md)를 따른다.

## 사실의 기준

충돌이 있으면 다음 순서로 판단한다.

1. 로그인 화면의 정보·표시·행동은 이 문서를 따른다.
2. 인증 상태 전환과 성공 후 이동은 [Google OAuth 인증 Workflow](../workflow/authentication.md)를
   따른다.
3. 서비스 진입 경로는 [서비스 진입 Workflow](../workflow/service-entry.md)를 따른다.
4. 시각 변수와 반복 UI는 [UI 컴포넌트 라이브러리](../component-library.md),
   `lorekeeper.pen`과 `lorekeeper.lib.pen`의 현재 구조를 따른다.

## 디자인 시작 상태

`LOREKEEPER-405` 시작 시점에 Pencil에서 확인한 기준은 다음과 같다.

- `lorekeeper.pen`의 최상위 화면 130개 중 로그인·인증 화면은 없다.
- `lorekeeper.lib.pen`의 재사용 컴포넌트 103개 중 로그인·인증 전용 컴포넌트는
  없다.
- 로그인 관련 표현은 로그아웃 완료 화면의 로그인 복귀 버튼, 안내와 정책
  링크에만 존재한다.

이 상태는 로그인 화면 설계의 시작 근거이다. 후속 작업에서 화면·컴포넌트를
추가한 뒤에는 화면 레지스트리와 최종 감사 문서를 현재 상태의 기준으로 사용한다.
