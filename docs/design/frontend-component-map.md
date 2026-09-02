# Pencil frontend 매핑

`docs/design/lorekeeper.lib.pen`의 변수와 재사용 컴포넌트를 frontend 코드 소유
영역에 연결한다. Pencil 이름과 ID는 디자인 대조 기준이고, 실제 구현 이름은 역할과
상태를 표현하는 React API를 사용한다.

## 단일 기준

- 전체 매핑은 `src/design-system/pencil-registry.json`에 저장한다.
- 변수 33개는 같은 이름의 `--lk-*` CSS 변수로 연결한다.
- 재사용 컴포넌트 109개는 정확히 한 소유 영역을 가진다.
- 매핑 수량과 이름·ID·CSS 변수 중복은 `pnpm validate:design-system`으로 검사한다.

## 코드 소유 영역

| 소유 영역 | 코드 경로 | 책임 |
| --- | --- | --- |
| `ui` | `src/components/ui` | 버튼, 아이콘 버튼, 탭, 사이드바 항목처럼 도메인에 독립적인 기초 UI |
| `workspace` | `src/features/workspace/components` | 셸, 탐색, 탭, 파일 헤더, 검색과 휴지통 |
| `new-tab` | `src/features/new-tab/components` | New Tab 재개·생성·최근 파일 UI |
| `ai-chat` | `src/features/ai-chat/components` | AI Chat 패널과 세션 상태 |
| `memo` | `src/features/memo/components` | 메모 카드, 범위, 패널과 크기 조절 |
| `property` | `src/features/property/components` | 속성 행, 유형 메뉴와 저장 상태 |
| `timeline` | `src/features/timeline/components` | 사건 시간 항목, 편집과 저장 상태 |
| `settings` | `src/features/settings/components` | 설정 필드, 저장 바와 확인 대화상자 |
| `project-list` | `src/features/projects/components` | 프로젝트 목록, 카드와 전역 사용자 정보 |
| `auth` | `src/features/auth/components` | Google 인증 행동, 상태 안내와 정책 안내 |

`base`는 독립적으로 조합할 수 있는 기본 구조이고 `state`는 같은 역할의 상호작용
상태다. 상태별 화면을 별도 컴포넌트로 복제하지 않고 기본 구조의 variant와 상태
속성으로 구현한다.

## 조합 원칙

- Pencil 최상위 화면은 Route와 상태 검수 기준이며 React 컴포넌트 목록이 아니다.
- 화면은 공통 셸, 기능 컴포넌트와 상태 variant를 조합해 만든다.
- 텍스트, 아이콘, 크기와 선택 데이터는 인스턴스 속성으로 전달한다.
- dark/light는 같은 의미와 가능한 한 같은 DOM 구조를 유지한다.
- 기능 컴포넌트는 색상, 공통 간격, 반경, 글자 크기와 아이콘 굵기를 직접 선언하지
  않고 `--lk-*` 변수를 사용한다.

## 직접값 예외

- `#00000000`은 투명 영역이다.
- `#00000055`와 `#00000066`은 그림자다.
- `#00000088`과 `#00000099`는 대화상자 배경 차단막이다.
- 화면 프레임 위치·크기·안쪽 여백과 아이콘 광학 보정값 `2`·`3`은 화면 구성값이다.
- Google 브랜드 표식의 원본 벡터 색상은 제품 테마 토큰으로 바꾸지 않는다.
- 화면 콘텐츠에 한정된 도움말 제목 `26`·`28`, 본문 행간 `1.7`과 설정 제목 `24`는
  공통 컴포넌트 토큰으로 승격하지 않는다.

그 밖의 반복 직접값은 허용하지 않는다. Pencil 변수나 컴포넌트가 바뀌면 registry와
이 문서를 같은 변경에서 갱신하고 검증 스크립트를 실행한다.
