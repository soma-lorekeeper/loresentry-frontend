# 유입과 온보딩: 프런트엔드 동작

이 문서는 체크아웃된 프런트엔드의 유입, 가입과 온보딩 흐름을 설명한다. 운영 배포본을 검증하거나 새로운 이벤트를 정의하는 문서는 아니다. 제안하는 측정 계약은 [유입 이벤트](acquisition-events.ko.md)를 참고한다.

## 사용자 흐름

1. **도착.** 페이지 head의 스크립트가 React 실행 전에 현재 URL, referrer, 시각을 session storage에 남기며 최근 페이지 로드 5개를 유지한다. 앱 시작 시 이를 처리해 브라우저에 유입 기록 하나를 저장한다. UTM 다섯 항목, 유효한 광고 클릭 ID 하나, 외부 referrer 호스트, 도착 경로와 시각을 추출하며 다른 쿼리 값은 이 기록에 저장하지 않는다.
2. **유입 선택.** UTM, 클릭 ID 또는 외부 referrer가 있는 방문은 이전 기록을 덮어쓴다. 직접 방문은 기존 기록이 없을 때만 저장한다. 30일이 지난 기록은 만료된다. 서비스 도메인과 `accounts.google.com`은 외부 referrer로 보지 않는다. 선택된 경로는 그 유입의 도착 경로이며 반드시 최초 방문 경로는 아니다.
3. **페이지 조회 전송.** 기존 GA 추적기는 활성화 조건이 맞을 때 도착 후 실행 시점과 라우트 변경 시 정제된 `page_view`를 보낸다. 허용된 UTM과 광고 클릭 파라미터는 `page_location`에 남기고 referrer도 정제한다. 정제된 주소가 직전과 같으면 다시 보내지 않는다. 이는 로컬 유입 기록과 별도다.
4. **인증과 약관 동의.** Google 로그인 결과에 따라 약관 동의가 필요할 수 있다. 프런트엔드는 약관을 표시하고 동의를 보낸 뒤 세션을 확인한다. auth 서버는 현재 약관 확인 전에 계정을 등록하거나 기존 계정을 찾는다. 현재 약관 버전에 동의하지 않은 기존 계정도 같은 동의 필요 흐름을 사용하므로 동의 자체로 신규 가입을 구분할 수 없다.
5. **온보딩 진입.** 다시 보기가 아니고 온보딩을 완료하지 않은 사용자는 저장된 유입 기록을 `PUT /auth/users/me/acquisition`으로 전송한다. 서버는 온보딩 완료 전 계정당 첫 기록만 허용한다. 성공하면 로컬 기록을 지우고 실패하면 이후 조건에 맞는 진입에서 재시도할 수 있도록 유지한다. 이 흐름에 도달하지 못한 사용자의 기록은 없을 수 있다.
6. **완료와 프로젝트 생성.** 최초 완료 시 프런트엔드는 온보딩 완료 요청을 기다린다. 사용자는 예시 프로젝트, 새 프로젝트 또는 나중에 시작을 고를 수 있다. 예시 생성은 온보딩 완료 이후의 별도 요청이고 일반 프로젝트 양식도 별도 생성 요청을 보낸다. 온보딩 요청 성공이 프로젝트 생성 성공을 뜻하지는 않는다. 다시 보기에서는 온보딩 완료를 반복하지 않는다.

## 프런트엔드 코드

- [도착과 로컬 유입 기록](../../../src/features/analytics/acquisition.ts), [유입 전송](../../../src/features/analytics/use-record-acquisition.ts)
- [Google 태그와 URL 정제](../../../src/features/analytics/google-analytics.ts), [페이지 추적](../../../src/features/analytics/google-analytics-tracker.tsx)
- [로그인](../../../src/features/auth/login-page.tsx), [약관 동의](../../../src/features/auth/terms-consent.tsx)
- [온보딩](../../../src/features/onboarding/onboarding-page.tsx), [프로젝트 생성](../../../src/features/projects/project-dialogs.tsx), [변경 요청](../../../src/features/projects/queries.ts)
