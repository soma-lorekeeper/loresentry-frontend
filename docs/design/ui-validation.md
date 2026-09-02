# 공통 UI 검증 절차

`/design-system` fixture는 `lorekeeper.lib.pen`의 토큰과 공통 UI 상태를 독립적으로 재현한다. 버튼, 아이콘 버튼, 입력, 메뉴, 상태 안내, 대화상자와 레이아웃 primitive의 기본·선택·오류·처리 중·비활성 상태를 한 화면에서 확인할 수 있다.

## 자동 검증

프로젝트 루트에서 다음 명령을 실행한다.

```bash
pnpm check:ui
```

이 명령은 다음 검사를 순서대로 실행한다.

1. Prettier 포맷 검사
2. Pencil registry와 CSS 토큰·컴포넌트 매핑 검사
3. dark/light fixture DOM 스냅샷, 컴포넌트 상호작용, axe 구조 접근성 검사
4. ESLint와 TypeScript 검사
5. webpack 기반 Next.js 프로덕션 빌드

실패 메시지는 테스트 suite의 컴포넌트와 테마 이름 또는 registry의 토큰·Pencil 컴포넌트 이름을 표시한다. jsdom은 실제 색을 계산하지 못하므로 axe의 `color-contrast` 규칙만 자동 검사에서 제외하며, 대비는 아래 시각 검증에서 확인한다.

## 시각·키보드 검증

```bash
pnpm dev
```

브라우저에서 `http://localhost:3000/design-system`을 열고 다음을 확인한다.

1. 테마 전환에서 dark와 light를 각각 선택해 canvas, surface, border, text, accent와 selected 색을 Pencil 변수와 대조한다.
2. Tab으로 모든 버튼과 입력의 2px accent focus ring을 확인한다. 비활성 컨트롤에는 포커스가 가지 않아야 한다.
3. 프로젝트 메뉴를 Enter로 열고 위·아래 방향키 및 Home/End로 이동한다. 비활성 항목은 건너뛰고, Escape 후 트리거로 포커스가 돌아와야 한다.
4. 삭제 대화상자를 열어 초기 포커스가 첫 동작으로 이동하는지, Tab과 Shift+Tab이 내부에서 순환하는지, Escape와 취소 후 열기 버튼으로 복귀하는지 확인한다.
5. Pencil의 `Button / Icon Label`, `Icon Button / Default`, `Settings / Field`, `Menu / Project Switcher / Open`, `Dialog / Permanent Delete`, `Auth / Status Notice` 및 processing 상태와 높이·간격·border·선택 배경을 비교한다.
