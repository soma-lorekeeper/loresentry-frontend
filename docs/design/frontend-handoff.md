# Lorekeeper 핵심 화면 frontend 인계

- 상태: 일곱 데스크톱 화면 구현 기준 확정, 사용자 확인 완료
- 디자인 원본: [`lorekeeper.pen`](./lorekeeper.pen)
- 승인 기준: `20 · Visual Direction · Recommended Blend · APPROVED` (`K4irXB`)
- 구현 대상: 새 탭 2개 상태와 원고 편집기 5개 상태

이 문서는 frontend 구현자가 승인된 핵심 화면을 재현할 때 사용할
화면·변수·컴포넌트·상태 계약이다. 화면의 정보와 동작은 `workspace` 문서를
기준으로 하고, 현재 시각 값과 레이어 구조는 `lorekeeper.pen`을 기준으로 한다.

## 화면과 상태

| 화면 ID | 구현 상태 | 유지할 핵심 차이 | 동작 기준 |
| --- | --- | --- | --- |
| `dtvaQ` | 새 탭 기본 | 최근 파일 목록과 `이어서 작업하기` 행동 표시 | [`new-tab.md`](./workspace/new-tab.md) |
| `TMBRe` | 최근 파일이 없는 새 탭 | 생성 유형과 빈 최근 파일 안내 표시 | [`new-tab.md`](./workspace/new-tab.md) |
| `A9Wrm` | 원고 편집기 기본 | AI 챗과 메모 패널이 닫힌 원고 중심 상태 | [`manuscript-editor.md`](./workspace/manuscript-editor.md) |
| `iHWvC` | AI 챗 열림 | 활성 AI 버튼과 320px 우측 보조 패널 | [`ai-chat-panel.md`](./workspace/ai-chat-panel.md) |
| `BGPNV` | 작품 메모 선택 | 320px 우측 패널, 작품 메모 탭과 카드·추가 행동 | [`file-memo-panel.md`](./workspace/file-memo-panel.md) |
| `dm2JC` | 원고 메모 선택 | 320px 우측 패널, 현재 원고의 직접 입력 영역 | [`file-memo-panel.md`](./workspace/file-memo-panel.md) |
| `GY3eJ` | 작품 메모 하단 배치 | 280px 하단 패널과 가로 작품 메모 카드 | [`file-memo-panel.md`](./workspace/file-memo-panel.md) |

## 공통 시각 계약

- 화면 캔버스, 외곽 경계, 사이드바, 탭 바와 사용자 아바타는 각각
  `color-bg-canvas`, `color-border-frame`, `color-surface-sidebar`,
  `color-surface-topbar`, `color-surface-avatar`를 사용한다.
- 패널·컨트롤 경계는 `color-border-default`를 사용한다. AI 패널은
  `color-surface-navigation`, 메모 패널은 `color-surface-memo`를 사용한다.
- 원고 편집 면은 `color-surface-editor`를 사용한다. 제목은
  `color-text-manuscript-title`, `font-size-manuscript-title`,
  `line-height-manuscript-title`을, 본문은 대응하는 `manuscript-body` 변수를
  사용한다.
- UI 글꼴은 `font-family-ui`, 직접 배치한 Lucide 아이콘은
  `icon-weight-default`를 사용한다. 현재 승인 변수 40개의 실제 값은
  [`design-direction.md`](./design-direction.md)의 승인 변수 기준과
  `lorekeeper.pen`을 따른다.
- 구현 코드에 현재 계산 색상이나 간격을 복사하지 않고 의미 변수에 대응하는
  프로젝트 토큰을 연결한다.

## 재사용 컴포넌트 계약

| Pencil 원본 | 구현 역할 | 허용하는 인스턴스 차이 |
| --- | --- | --- |
| `kJPYz` · `Tab / Document` | 열린 콘텐츠 탭 | 유형 아이콘, 제목, 닫기 아이콘과 콘텐츠 길이에 따른 너비 |
| `fR7lD` · `Sidebar Item / Default` | 그래프·메모 탐색 항목 | 아이콘, 레이블과 선택 배경 |
| `MkSEW` · `Icon Button / Default` | 탭 추가, 메모 닫기·추가 | 아이콘과 32px·36px 컨텍스트 크기 |
| `NEXTx` · `Button / Icon Label` | AI 챗 열기·닫기 | 비활성 투명 표면과 활성 선택 표면·강조 경계 |
| `UABoE` · `Memo Card / Work` | 작품 메모 카드 | 제목, 본문과 패널 배치에 따른 너비 |

원본의 표면·경계·여백·간격·모서리는 인스턴스에서 새 값으로 다시 만들지 않는다.
세부 원본 기준은 [`component-library.md`](./component-library.md)를 따른다.

## 상태 표현 계약

- 활성 탭은 선택 표면과 유형 아이콘·제목·닫기 행동을 함께 표시한다.
- AI 챗이 열리면 AI 버튼의 선택 표면·강조 경계와 실제 우측 패널을 함께 표시한다.
- 작품·원고 메모 범위는 탭 강조선과 텍스트 색을 함께 바꾸고 선택한 범위의
  콘텐츠만 표시한다.
- 메모의 우측·하단 배치는 선택 버튼 표면과 실제 패널 위치를 함께 바꾼다.
- 새 탭의 기본·빈 상태는 최근 파일 콘텐츠와 안내 문구로 구분한다. 두 상태 모두
  프로젝트 맥락, 생성 유형 8개와 `이어서 작업하기` 행동을 유지한다.
- 상태를 색상 하나로만 전달하지 않는다. 키보드 포커스 이동과 탭·패널 동작은
  [`tabs.md`](./workspace/tabs.md)와 각 패널 문서를 따른다.

## 화면 전용 값

- 모든 대상 화면의 기준 크기는 1440×900이다.
- 사이드바의 18px 상단 여백, 새 탭 콘텐츠의 42px·120px 여백과 원고 읽기
  열의 52px·40px 세로 여백은 현재 화면 구도를 만드는 직접값으로 유지한다.
- AI·우측 메모 패널은 320px 폭, 하단 메모 패널은 280px 높이를 사용한다.
- 닫힌 AI 버튼과 비선택 배치 버튼의 `#00000000`은 투명 상태 재정의다. 별도
  색상 토큰으로 만들지 않는다.

## 이번 인계에서 확정하지 않은 범위

- 반응형 중단점과 좁은 폭에서의 정확한 배치
- 우측 메모 패널 너비와 하단 메모 패널 높이의 사용자 조절 방식
- AI 챗과 메모 패널을 동시에 열었을 때의 배치
- 동적 호버·포커스의 상세 시각값과 다중 탭 가로 스크롤의 별도 시각 프레임
- 라이트 테마, 미설계 성공·오류 상태와 일곱 화면 밖의 파일 유형 화면

이 항목은 현재 일곱 화면을 구현하기 위한 추측으로 채우지 않는다. 제품 동작이
이미 문서에 정해진 경우 해당 동작을 구현하고, 시각값이나 배치 결정이 필요한
경우 후속 디자인 검증으로 보낸다.

## 구현 검증 기준

- 일곱 화면에서 공통 역할이 같은 토큰과 컴포넌트를 사용하는지 확인한다.
- 1440×900에서 원고가 보조 패널보다 먼저 읽히고 패널이 탭 바·파일 헤더·입력
  영역을 덮지 않는지 확인한다.
- 텍스트 대비, 복합 상태 단서, 자동 저장·탭 복원·패널 포커스 동작을 접근성
  검사와 실제 상호작용으로 검증한다.
- 시각 기준 검증값과 화면별 예외는 [`final-validation.md`](./final-validation.md)를 따른다.

## 사용자 확인

확인 대상은 위 일곱 데스크톱 화면의 적용 결과, 공통 구현 계약, 화면 전용 값과
명시한 미확정 범위다. 단순 파일 저장이나 푸시는 승인으로 간주하지 않으며
사용자의 명시적 확인이 있어야 인계를 완료한다.

2026-08-29 사용자가 대화에서 `완료 처리해`라고 응답해 이 대상과 범위를
명시적으로 확인했다.
