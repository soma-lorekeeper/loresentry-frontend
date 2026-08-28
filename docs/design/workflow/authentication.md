# Google OAuth 인증 Workflow

로그인 화면에서 약관을 안내하고 Google OAuth 인증과 가입을 하나의 흐름으로 처리한다.

## 기본 흐름

```text
로그인 페이지
→ 약관 안내 확인
→ Google로 계속하기
   ├─ 이용약관 동의 의사 표시
   └─ Google OAuth 시작
→ Google OAuth 인증
→ Google 계정 식별
   ├─ 기존 사용자
   │  → 로그인 완료
   │  → 프로젝트 목록
   └─ 신규 사용자
      → Lorekeeper 계정 생성
      → 로그인 완료
      → 프로젝트 목록
```

## 예외 흐름

```text
Google OAuth 인증
→ 취소 또는 실패
→ Lorekeeper 계정 미생성 또는 로그인 미완료
→ 로그인 페이지
```

세션 만료로 로그인 페이지에 도착한 사용자는 인증을 완료하면 기존 작업공간으로 복귀한다.
