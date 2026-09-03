# Frontend 구현 인계

현재 산출물은 Next.js 서버 없이 CDN에서 제공하는 정적 frontend다. 브라우저는
별도 backend의 조회·저장 API를 호출하며, backend가 연결되지 않은 행동은 성공으로
표시하지 않는다.

## 배포 계약

- `pnpm check:cdn`을 통과한 `out/` 디렉터리 전체가 배포 단위다.
- CDN은 trailing slash 경로의 `index.html`을 제공해야 한다.
- 배포 후 `out/config.json`의 `apiBaseUrl`을 환경별 절대 HTTP(S) URL로 교체한다.
  빈 값은 backend 미연결 상태다.
- `privacyPolicyUrl`과 `termsOfServiceUrl`도 확정된 절대 HTTP(S) URL만 설정한다.
- frontend 번들 안에 Node.js 서버 산출물이나 데이터 저장소는 포함하지 않는다.

게시 경로: 7개

| 경로 | 책임 |
| --- | --- |
| `/` | 서비스 진입과 로그인 이동 |
| `/login` | Google OAuth 진입과 인증 결과 상태 |
| `/projects` | 프로젝트 목록, 계정과 전역 행동 |
| `/projects/guide` | 프로젝트 사용 가이드 |
| `/projects/trash` | 프로젝트 복원과 영구 삭제 UI |
| `/workspace` | 검증된 `projectId` query가 필요한 통합 작업공간 |
| `/design-system` | 공통 UI 상태 검수 fixture |

`projectId`는 backend가 접근 권한을 확인해 돌려준 식별자만 사용한다. 정적 URL의
query parameter는 화면 상태와 식별자를 전달할 뿐, 접근 권한이나 저장 성공을
증명하지 않는다.

## 구현 기준과 범위

화면 상태: 136개

`src/design-system/screen-registry.ts`가 136개 Pencil 화면을 Route, 상태 ID와 담당
컴포넌트에 연결한다. 다음 세 문서에서 고정 화면 번호와 Pencil ID를 가져온다.

- `docs/design/workspace/final-validation.md`
- `docs/design/project-list/frontend-handoff.md`
- `docs/design/login/frontend-handoff.md`

`src/design-system/pencil-registry.json`과 `src/design-system/tokens.css`는 33개 토큰,
109개 컴포넌트와 dark/light 공통 테마 계약의 코드 기준이다. 컴포넌트 소유권과
직접값 예외는 [Pencil frontend 매핑](./design/frontend-component-map.md), 구성 요소의
의미는 [UI 컴포넌트 라이브러리](./design/component-library.md)를 따른다.

구현된 frontend 범위는 서비스 진입, 로그인, 프로젝트 목록·휴지통·계정·전역 도움,
작업공간의 파일·탭·메모·속성 문서·시간 흐름·설정·도움말과 AI 채팅 UI다. 각 변경
행동은 주입된 adapter가 성공을 확인한 뒤에만 완료 상태를 반영한다.

## Backend 연결 경계

백엔드 연결 경계: 8개

아래 이름은 frontend port다. HTTP endpoint, method, payload와 오류 schema는 backend
계약에서 확정해야 하며 frontend가 임의로 정하지 않는다.

| 경계 ID | Frontend port | Backend에서 확정할 책임 |
| --- | --- | --- |
| `auth.start-google-oauth` | `LoginRoute.startGoogleOAuth` | OAuth 시작, callback과 검증된 복귀 맥락 |
| `auth.logout` | `ProjectListRoute.logout` | 세션 종료와 실패 결과 |
| `projects.list` | `ProjectList.loadProjects` | 접근 가능한 프로젝트 조회 |
| `projects.validate-access` | `ProjectListRoute.openProject` | 프로젝트 접근 확인과 검증된 ID 반환 |
| `workspace.restore-layout` | `WorkspaceRoute` | 프로젝트별 작업공간 복원 데이터 |
| `workspace.persist-before-switch` | `WorkspaceShell.onProjectChange` | 프로젝트 전환 전 변경 저장과 전환 승인 |
| `workspace.documents` | `WorkspaceShell save/delete adapters` | 파일·메모·속성·시간 흐름의 저장과 삭제 |
| `account.update` | `AccountSettingsDialog.updateAccount` | 계정 정보 유효성 확인과 저장 |

`public/config.json`은 backend 주소와 정책 문서 주소만 제공한다. 인증 토큰 보관,
API client, 재시도 정책과 도메인별 request/response 모델은 backend 계약이 정해진
뒤 각 port에 연결한다.

## 미확정 정책과 제외 범위

다음 항목은 이번 frontend 완료 범위에 포함하지 않는다.

- OAuth provider 설정, callback endpoint, 세션 저장과 계정 생성
- 실제 프로젝트·문서 데이터 조회, 저장, 동기화와 권한 판정
- API endpoint, method, payload, 오류 코드와 재시도 정책
- 이용약관·개인정보처리방침의 실제 URL
- 그래프 시각 디자인, 모바일·태블릿 전용 레이아웃
- 협업, 멤버·권한, 분할 화면, AI 모델 설정과 파일 유형별 템플릿
- CDN 배포 인프라 변경, 운영 데이터 이관과 출시 승인

## 검증 명령

최종 인계는 repository root에서 다음 명령으로 확인한다.

```bash
pnpm check:cdn
```

이 명령은 포맷, 33개 토큰·109개 컴포넌트, 직접 색상 예외, 레이아웃, 전체 테스트,
lint, typecheck, 정적 production build, 필수 파일과 CDN 방식 HTTP 경로를 검사한다.
개별 추적 검사는 다음 명령을 사용한다.

```bash
pnpm validate:screens
pnpm test:regression
pnpm test:accessibility
pnpm validate:handoff
```

화면 수·Route·backend 경계와 이 문서의 드리프트는 `pnpm validate:handoff`가 코드와
교차 확인한다.
