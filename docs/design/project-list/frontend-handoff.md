# 프로젝트 목록 frontend 구현 인계

이 문서는 프로젝트 목록 Deliverable의 Pencil 화면과 frontend 구현 계약을 연결하는
최종 인계 기준이다. 화면 레지스트리와 범위는 2026-09-01의 `LOREKEEPER-403`
검증 결과를 사용한다.

## 원본과 우선순위

구현 중 기준이 충돌하면 다음 순서로 확인한다.

1. 각 기능 문서의 행동·데이터 규칙과 Workflow
2. [프로젝트 목록 최종 검증](./final-validation.md)의 상태·접근성 완료 조건
3. 이 문서의 화면 ID와 상태 목적
4. `lorekeeper.lib.pen`의 변수와 재사용 컴포넌트

화면 ID는 Route가 아니라 상태별 시각 기준이다. 하나의 Route가 기본, 빈 상태,
로딩, 오류, 대화상자와 처리 결과 화면 여러 개에 대응할 수 있다.

## 화면 레지스트리

| 번호 | 화면 | Pencil ID |
| ---: | --- | --- |
| 91 | Project List · Default | `BvuoV` |
| 92 | Project List · Card Menu Open | `G3Cvn` |
| 93 | Project List · Empty | `Rpqy3` |
| 94 | Project List · Loading | `z4wuM` |
| 95 | Project List · Error | `sYDj4` |
| 96 | Project Create · Initial | `PzeBB` |
| 97 | Project Create · Required Error | `b7Hoq` |
| 98 | Project Create · Ready | `xiX3C` |
| 99 | Project Create · Submitting | `U83vsD` |
| 100 | Project Create · Server Error | `mD2Vy` |
| 101 | Project Rename · Current | `e2zKG` |
| 102 | Project Rename · Invalid | `z8wIZo` |
| 103 | Project Rename · Ready | `NaYPr` |
| 104 | Project Rename · Saving | `syeZk` |
| 105 | Project Rename · Save Error | `WXPWx` |
| 106 | Project Rename · Success | `wB2c6` |
| 107 | Project Trash Move · Confirmation | `DJf8k` |
| 108 | Project Trash Move · Moving | `xyKPr` |
| 109 | Project Trash Move · Error | `KCK49` |
| 110 | Project Trash Move · Success | `Hhm0r` |
| 111 | Project Trash · Default | `WYBJQ` |
| 112 | Project Trash · Empty | `yvfHX` |
| 113 | Project Trash · Loading | `FogDw` |
| 114 | Project Trash · Load Error | `r5UPt` |
| 115 | Project Trash · Restoring | `tErn6` |
| 116 | Project Trash · Restore Error | `ISCdJ` |
| 117 | Project Trash · Restore Success | `tTF2Z` |
| 118 | Project Trash · Default · Light | `xjwox` |
| 119 | Project Trash · Permanent Delete Confirmation | `BJyvs` |
| 120 | Project Trash · Permanent Deleting | `l8tEHq` |
| 121 | Project Trash · Permanent Delete Error | `tsGQR` |
| 122 | Project Trash · Permanent Delete Success | `xI1cj` |
| 123 | Project List · User Menu Open | `Pr4Vc` |
| 124 | Account Settings · Default | `l6YSG6` |
| 125 | Account Settings · Edited | `YlFtW` |
| 126 | Account Settings · Validation Error | `daOWS` |
| 127 | Account Settings · Saving | `VemT4` |
| 128 | Account Settings · Saved | `Z0yHo` |
| 129 | Account Settings · Save Error | `CbnlA` |
| 130 | Account Settings · Long Values · Light | `Mq1AS` |
| 131 | Project List · Logout Confirmation | `HcLfZ` |
| 132 | Project List · Logout Processing | `y7wxgE` |
| 133 | Project List · Logout Error | `EQJbK` |
| 134 | Project List · Logout Complete | `N5M5TM` |
| 135 | Project Guide · Topics | `K5MEsG` |
| 136 | Project Guide · Article | `j3qmH` |
| 137 | Project List · Feedback Opened | `iZobk` |
| 138 | Project List · Feedback Open Error | `c061WC` |

번호, 화면 이름과 Pencil ID는 구현·검수에서 사용하는 고정 식별자다. 이름이나
상태 목적을 바꾸면 Pencil 최상위 화면과 이 표를 같은 변경에서 갱신한다.

## Route와 상태 연결

| 진입점 | 화면 | 구현 목적 |
| --- | --- | --- |
| `/projects` | `91`~`110` | 목록 조회, 프로젝트 생성, 이름 변경과 휴지통 이동 |
| `/projects/trash` | `111`~`122` | 휴지통 조회, 복원과 영구 삭제 |
| `/projects` 사용자 메뉴 | `123`~`130` | 계정 설정 열기, 편집, 유효성 검사와 저장 결과 |
| `/projects` 로그아웃 | `131`~`134` | 확인, 세션 종료 요청, 오류와 `/login` 라우트 인계 |
| 전역 사용 가이드 | `135`~`136` | 주제 목록과 가이드 본문 탐색 |
| 전역 피드백 | `137`~`138` | 외부 피드백 창 열기와 실패 재시도 |

화면 `134`는 로그아웃 완료 전환 상태만 나타내며 `/login`의 인증 UI를 정의하지
않는다.

## 컴포넌트와 변수

- `lorekeeper.lib.pen`의 33개 변수를 코드 토큰의 단일 원본으로 사용한다.
- 라이브러리의 103개 재사용 컴포넌트 이름을 코드 컴포넌트와 상태 이름의 기준으로
  삼는다. 화면별 텍스트, 아이콘과 상태는 속성으로 전달하고 구조를 복제하지 않는다.
- dark/light는 같은 DOM 구조와 컴포넌트를 유지하고 `mode` 토큰만 전환한다.
- 의미가 있는 색상, 간격, 반경, 글자 크기와 아이콘 굵기에 화면별 직접값을 만들지
  않는다. 대화상자 차단막 `#00000088`만 기록된 색상 예외로 허용한다.
- 변수·컴포넌트 수와 참조 무결성은
  [프로젝트 목록 디자인 시스템 감사](./design-system-audit.md)를 완료 조건으로 쓴다.

## 상호작용과 오류

- 카드 전체 선택과 더보기 버튼은 중첩 클릭 영역이 아닌 독립 행동으로 구현한다.
- 생성·이름 변경은 필수, 공백, 255자와 중복 규칙을 공유한다. 저장 오류에도 입력을
  유지한다.
- 휴지통 이동·영구 삭제와 로그아웃은 확인 대화상자를 거치며 처리 중 중복 요청과
  닫기를 막는다.
- 조회·저장·복원·삭제 오류는 원인을 추측하지 않고 같은 위치의 `다시 시도`를
  제공한다.
- 성공 후 목록 데이터와 포커스 대상을 함께 갱신한다. 사용자에게 보이지 않는
  낙관적 성공 상태를 디자인 근거 없이 추가하지 않는다.
- 가이드와 피드백의 외부 이동은 새 창 여부를 사전에 알리고, 실패하면 현재 맥락과
  재시도 행동을 유지한다.

## 접근성 구현 조건

- 카드, 메뉴, 입력, 대화상자와 상태 알림의 키보드 순서·포커스 복귀는
  [프로젝트 목록 최종 검증](./final-validation.md)을 그대로 따른다.
- 확인 대화상자는 포커스를 내부에 가두고 기본 포커스를 `취소`에 둔다.
- 선택, 처리, 성공과 오류는 색상 외에 테두리·아이콘·문구를 함께 사용한다.
- 필드 오류 문구는 해당 입력과 프로그램 방식으로 연결한다.
- 비동기 상태 문구는 `aria-live` 또는 동등한 알림 영역으로 한 번만 전달한다.
- 다크·라이트 텍스트는 일반 텍스트 4.5:1, 비텍스트 UI는 3:1 이상의 검증된
  조합을 유지한다.

## 확정 범위

### 포함

- 데스크톱 프로젝트 목록, 카드 그리드와 전역 사이드바
- 기본·빈 상태·로딩·오류와 카드 메뉴
- 프로젝트 생성, 이름 변경과 휴지통 이동
- 프로젝트 휴지통 조회, 복원과 영구 삭제
- 사용자 메뉴, 계정 설정과 로그아웃
- 사용 가이드와 피드백 전역 진입
- dark/light 공통 변수·컴포넌트, 키보드·대비·레이아웃 검증과 구현 인계

### 제외

- 로그인·인증 화면과 인증 제공자 동작
- 랜딩 화면과 통합 작업공간 재설계
- frontend 코드, API·서버 구현과 데이터 저장·동기화
- 모바일·태블릿 전용 상세 레이아웃
- 검색, 정렬 방식 선택, 프로젝트 복제와 프로젝트 템플릿
- 배포, 운영 환경 변경과 출시 작업

### 남은 후속 작업

- 이 문서를 기준으로 한 frontend 화면 구현과 API 계약은 별도 Work로 계획한다.
- 모바일·태블릿 대응은 정보 구조와 중단점이 확정된 뒤 별도 Deliverable로 설계한다.
- 검색, 정렬 선택, 복제와 템플릿은 제품 우선순위가 확정된 뒤 상태·행동 계약부터
  추가한다.
- 로그인 UI는 인증 범위의 기존 문서 또는 별도 Deliverable을 따른다.

## 사용자 확인 기록

사용자는 2026-09-01에 이 문서의 포함·제외 범위와 남은 후속 작업을 확정했다.
확인 결과는 `LOREKEEPER-403`에도 기록한다.
