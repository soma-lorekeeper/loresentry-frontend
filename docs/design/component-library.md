# Lorekeeper UI 컴포넌트 라이브러리

`docs/design/lorekeeper.lib.pen`을 디자인 변수와 재사용 컴포넌트의 단일 원본으로
사용한다. `docs/design/lorekeeper.pen`은 라이브러리를 `b` 별칭으로 가져오며,
화면에서는 `$b:*` 변수와 `b:*` 컴포넌트만 참조한다.

## 디자인 변수

- 전체 변수: 33개
- 테마 색상 변수: 13개
- 공통 숫자 변수: 19개
- 공통 문자열 변수: 1개
- 테마 축: `mode = dark | light`

색상 변수 하나가 다크와 라이트 값을 함께 가진다. 따라서 색상값은 26개지만
색상 변수는 13개다. 간격, 반경, 글자 크기, 행간과 아이콘 굵기는 두 테마가 같은
공통 변수를 사용한다.

## 재사용 컴포넌트

라이브러리에는 기본 컴포넌트 30개와 상태 컴포넌트 48개, 총 78개를 둔다.

### 기본 컴포넌트

- `Tab / Document`
- `Sidebar Item / Default`
- `Icon Button / Default`
- `Button / Icon Label`
- `Memo Card / Work`
- `Sidebar / Workspace`
- `Workspace / Tab Bar / New Tab`
- `Workspace / Tab Bar / Manuscript`
- `Manuscript / File Header`
- `Manuscript / Writing Canvas`
- `New Tab / Resume Banner`
- `New Tab / Create Action`
- `New Tab / Recent File Row`
- `AI Chat Panel / Open`
- `Workspace / Trash Item`
- `Dialog / Permanent Delete`
- `Search / Input`
- `Search / Result Row`
- `Memo / Editor Card`
- `Memo / Project Card`
- `Memo / File Card`
- `Memo / Scope Toggle`
- `Property / File Chip`
- `Property / Row / Text`
- `Property / Row / File Reference`
- `Property / Add`
- `Timeline / Item / Date`
- `Timeline / Item / Order`
- `Timeline / Item / Unscheduled`
- `Timeline / Add`

### 상태 컴포넌트

- 탭: `Active`, `Inactive`, `Dragging`
- 사이드바 항목: `Selected`, `Inline Edit`, `Dragging`, `Drop Target`
- 사이드바: `Project Switcher Open`, `Favorites Menu Open`, `Files Menu Open`,
  `File Create Inline`, `Folder Create Inline`, `Item Rename Inline`,
  `Item Dragging`, `Folder Drop Target`, `Favorites Drop Target`
- 메뉴: `Project Switcher / Open`, `Favorites / Open`, `Files / Open`
- 항목 메뉴: `User Section / Open`, `File / Open`, `Folder / Open`
- 탭 바: `Overflow`, `Reordering`
- 파일 헤더: `Memo Active`, `Focus Returned`
- 메모 패널: `Right / Work Selected`, `Right / Manuscript Selected`,
  `Below / Work Selected`
- AI 챗 패널: `Session List Open`, `Session Menu Open`, `Session Rename`,
  `Delete Confirmation`, `New Session Empty`
- 메모 편집 카드: `Focused`, `Saving`, `Save Error`
- 메모 범위 전환: `File Selected`
- 메모 메뉴: `Project Memo / Open`, `File Memo / Open`
- 메모 삭제: `Dialog / Memo Delete`
- 속성: `Property / Type Menu`
- 속성 문서 저장: `Saving`, `Saved`, `Error`
- 시간 흐름: `Timeline / Item / Selected`, `Timeline / Item / Editing`
- 시간 항목 삭제: `Dialog / Timeline Item Delete`

## 컴포넌트 경계

- 여러 화면에서 구조와 역할이 같은 요소는 기본 컴포넌트로 만든다.
- 문서에서 독립된 상호작용 상태로 정의하고 화면에서 반복 검증해야 하는 조합은
  상태 컴포넌트로 만든다.
- 텍스트, 아이콘과 크기처럼 콘텐츠에 따른 차이는 인스턴스 속성으로 바꾼다.
- 화면 전체 배치와 한 화면에서만 사용하는 구조는 `lorekeeper.pen`에 유지한다.
- 상태 화면은 로컬 프레임을 복제하지 않고 `.lib.pen`의 상태 컴포넌트를 참조한다.

## 검증 기준

- `lorekeeper.lib.pen`의 최상위 프레임은 모두 재사용 컴포넌트여야 한다.
- `lorekeeper.pen`에는 로컬 디자인 변수와 로컬 재사용 컴포넌트를 두지 않는다.
- 끊어진 컴포넌트 참조, 누락된 변수, 임시 placeholder와 레이아웃 문제를 허용하지
  않는다.
- 다크와 라이트 화면은 같은 컴포넌트와 변수 이름을 사용하고 `mode` 값만 바꾼다.
