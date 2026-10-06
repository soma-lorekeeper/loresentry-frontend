---
name: Lore Sentry
description: 웹소설 회차 원고와 설정 문서를 한 작업공간에 두고, 작가가 이은 관계만 그래프와 타임라인으로 보여 주는 집필 도구
colors:
  accent-primary: "#1c6070"
  accent-primary-dark: "#a9c7d0"
  text-on-accent: "#ffffff"
  text-on-accent-dark: "#111719"
  node-character: "#2f5892"
  node-character-dark: "#edf2f2"
  node-place: "#2f6f3c"
  node-place-dark: "#d6dcdd"
  node-organization: "#645ca0"
  node-organization-dark: "#bec6c8"
  node-item: "#995f23"
  node-item-dark: "#a7b1b3"
  node-event: "#ac5c56"
  node-event-dark: "#8f9b9d"
  node-worldview: "#219180"
  node-worldview-dark: "#788588"
  node-manuscript: "#81878d"
  node-manuscript-dark: "#606f73"
  diff-add: "#2360d7"
  diff-add-dark: "#84a7eb"
  diff-add-bg: "#e9effb"
  diff-add-bg-dark: "#303944"
  diff-modify: "#2a6e7f"
  diff-modify-dark: "#5ab3c9"
  diff-modify-bg: "#eaf0f2"
  diff-modify-bg-dark: "#2b3a40"
  diff-remove: "#af4336"
  diff-remove-dark: "#dc968e"
  diff-remove-bg: "#f7eceb"
  diff-remove-bg-dark: "#3b3739"
  diff-done: "#3c714e"
  diff-done-dark: "#73b589"
  diff-done-bg: "#ecf1ed"
  diff-done-bg-dark: "#2e3b38"
  favorite: "#c8901a"
  favorite-dark: "#f7e29a"
  bg-canvas: "#f3f4f6"
  bg-canvas-dark: "#1a1d1f"
  surface-default: "#ffffff"
  surface-default-dark: "#222629"
  surface-raised: "#ffffff"
  surface-raised-dark: "#252a2d"
  surface-navigation: "#e7e9eb"
  surface-navigation-dark: "#111416"
  surface-topbar: "#eceef0"
  surface-topbar-dark: "#15181a"
  surface-icon: "#002e590d"
  surface-icon-dark: "#30363a"
  border-default: "#c8ccd0"
  border-default-dark: "#3a4246"
  text-primary: "#1c1f23"
  text-primary-dark: "#edf2f2"
  text-secondary: "#51555a"
  text-secondary-dark: "#9aa6a8"
  icon-default: "#3b4146"
  icon-default-dark: "#b8c3c5"
  state-hover: "#002e590f"
  state-hover-dark: "#cad9eb0f"
  state-selected: "#002e591f"
  state-selected-dark: "#cad9eb1f"
typography:
  display:
    fontFamily: "Wanted Sans Variable, Geist, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "clamp(38px, 4.8vw, 68px)"
    fontWeight: 800
    lineHeight: 1.1
    letterSpacing: "-0.038em"
  headline:
    fontFamily: "Wanted Sans Variable, Geist, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "clamp(30px, 3.1vw, 44px)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.032em"
  headline-sm:
    fontFamily: "Wanted Sans Variable, Geist, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "clamp(24px, 2.2vw, 30px)"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "-0.025em"
  numeral:
    fontFamily: "Wanted Sans Variable, Geist, Apple SD Gothic Neo, Noto Sans KR, sans-serif"
    fontSize: "34px"
    fontWeight: 800
    lineHeight: 1
    fontFeature: "tnum"
  lede:
    fontFamily: "Geist, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "clamp(17px, 1.4vw, 19px)"
    fontWeight: 450
    lineHeight: 1.65
  landing-body:
    fontFamily: "Geist, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "17px"
    fontWeight: 450
    lineHeight: 1.7
  landing-point:
    fontFamily: "Geist, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.6
  manuscript-title:
    fontFamily: "Geist, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.25
  manuscript-body:
    fontFamily: "Geist, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  heading-lg:
    fontFamily: "Geist, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    lineHeight: 1.4
  heading:
    fontFamily: "Geist, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: "Geist, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
  context:
    fontFamily: "Geist, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist, Apple SD Gothic Neo, Noto Sans KR, Malgun Gothic, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.5
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  control: "2px"
  card: "2px"
  bar: "4px"
  window: "6px"
  pill: "999px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "10px"
  space-4: "14px"
  space-6: "20px"
  space-7: "28px"
components:
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.text-on-accent}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "28px"
  button-outline:
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "28px"
  button-outline-hover:
    backgroundColor: "{colors.state-hover}"
  button-ghost:
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "28px"
  button-ghost-pressed:
    backgroundColor: "{colors.state-selected}"
  icon-button:
    textColor: "{colors.icon-default}"
    rounded: "{rounded.control}"
    size: "28px"
  text-field:
    backgroundColor: "{colors.surface-default}"
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "44px"
  text-field-readonly:
    backgroundColor: "{colors.surface-icon}"
  menu:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.control}"
    padding: "8px"
    width: "204px"
  menu-item:
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "34px"
  menu-item-hover:
    backgroundColor: "{colors.state-hover}"
  menu-item-checked:
    backgroundColor: "{colors.state-selected}"
  sidebar-item:
    textColor: "{colors.text-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.control}"
    padding: "0 10px"
    height: "32px"
  sidebar-item-selected:
    backgroundColor: "{colors.state-selected}"
  segmented:
    backgroundColor: "{colors.surface-navigation}"
    rounded: "{rounded.control}"
    padding: "4px"
  segmented-option-checked:
    backgroundColor: "{colors.surface-icon}"
    textColor: "{colors.text-primary}"
    typography: "{typography.label}"
    height: "30px"
  dialog-sm:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.card}"
    padding: "20px"
    width: "440px"
  dialog-md:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.card}"
    padding: "20px"
    width: "520px"
  dialog-lg:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.card}"
    padding: "20px"
    width: "650px"
  inline-notice:
    backgroundColor: "{colors.state-selected}"
    typography: "{typography.label}"
    rounded: "{rounded.control}"
    padding: "10px"
  toast:
    backgroundColor: "{colors.surface-raised}"
    rounded: "{rounded.card}"
    padding: "14px"
  empty-state-icon:
    backgroundColor: "{colors.surface-icon}"
    textColor: "{colors.icon-default}"
    rounded: "{rounded.control}"
    size: "52px"
  timeline-bar:
    backgroundColor: "{colors.node-character}"
    rounded: "{rounded.bar}"
    height: "8px"
  landing-button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.text-on-accent}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "52px"
  landing-button-secondary:
    backgroundColor: "{colors.surface-default}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "0 24px"
    height: "52px"
  landing-button-sm:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.text-on-accent}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "36px"
  kind-chip:
    backgroundColor: "{colors.surface-default}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.control}"
    padding: "0 10px 0 8px"
    height: "30px"
  status-pill:
    backgroundColor: "{colors.surface-default}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  stage-frame:
    backgroundColor: "{colors.bg-canvas}"
    rounded: "{rounded.window}"
    width: "1000px"
    height: "640px"
---

# Design System: Lore Sentry

## Overview

**Creative North Star: "조용한 작업대, 한 올의 실"**

Lore Sentry의 화면은 작가가 오래 앉아 있는 작업대다. 연회색 바닥 위에 흰 창, 머리카락처럼 가는 1px 선, 거의 각진 2px 모서리, 12px 본문의 촘촘한 밀도. 채색을 거의 하지 않고 회색 단계와 반투명 상태 막(hover·selected)으로 위계를 만든다. 색이 나타나면 의미가 있다. 청록 강조색은 지금 누를 것과 포커스를, 문서 종류 색은 그 문서가 무엇인지를 말한다. 그 밖의 색은 없다.

공개 랜딩(`/`)은 이 작업대를 바꾸지 않고 넓힌다. 같은 `--lk-*` 토큰과 같은 바닥·창·모서리 위에, 헤드라인에만 쓰는 디스플레이 서체(Wanted Sans 800)와 한 올의 실을 더했다. 원고 속 인물 이름에서 캐릭터 색 실이 내려와 축소한 실제 작업공간 창들을 차례로 꿰고, 실이 닿은 창에서 그 인물의 자리가 한 번 빛난다. 움직임은 랜딩에서 더 허용되지만, 모두 화면이 실제로 일하는 모습을 재생하는 데만 쓰고 모두 `prefers-reduced-motion`에서 멈춘다.

토큰은 코드가 원천이 아니라 Pencil(`docs/design/lorekeeper.lib.pen`)이 원천이다. `pencil-variables.json` → `scripts/generate-tokens.mjs` → `src/design-system/tokens/tokens.css`·`tokens.ts`로 생성되며 손으로 고치지 않는다. 이 문서의 색·크기 값은 그 생성물을 옮긴 것이다. 테마는 `dark`(기본, `:root`)와 `light`(`[data-theme="light"]`) 두 모드이고, 사용자 선택은 `system | dark | light`다.

**Key Characteristics:**

- 연회색 캔버스 + 흰(어두운 모드에서는 짙은 청회색) 창, 1px `border-default` 선으로 나눈 평평한 면
- 모서리는 거의 직각(컨트롤·카드 2px), 축소한 작업공간 창만 6px
- 앱 본문 12px / 1.5, 레이블 11px 600 — 데스크톱 1440×900 기준의 조밀한 도구 밀도
- 색은 두 가지 뜻만 가진다: 청록 = 행동·포커스, 문서 종류 색 = 문서의 정체
- 선택·hover는 테두리나 색 띠가 아니라 반투명 상태 막(`state-hover`, `state-selected`)으로 표시
- 랜딩만: Wanted Sans 800 헤드라인, 캐릭터 색 2.5px 실, 스크롤에 맞춰 재생되는 축소 창

## Colors

회색 단계가 화면의 95%를 차지하고, 의미가 있는 곳에만 청록 하나와 문서 종류 일곱 색이 나타나는 절제된 팔레트다. 모든 색은 `var(--lk-color-…)`로만 쓴다. 아래 이름의 `-dark` 짝은 어두운 모드 값이다.

### Primary

- **Sentry Teal** (`accent-primary`, 어두운 모드에서는 **Mist Teal**): 로고 사각형, 주 버튼, 포커스 링(2px outline), 체크 표시, 필수 표시, 메뉴의 파괴 동작, 입력 오류. 화면에서 "지금 여기"를 가리키는 유일한 색이다. 주 버튼 hover는 `text-primary`를 12%(랜딩 14%) 섞어 한 단계 가라앉힌다.
- **On-Accent** (`text-on-accent`): 청록 위의 글자와 아이콘.

### Secondary

문서 종류 색. 그래프 노드, 타임라인 막대, 문서 종류 칩의 점, 랜딩의 실에 쓰이는 제품 고유의 색이며 브랜드 약속이다(PRODUCT.md).

- **Ledger Blue** (`node-character`): 캐릭터. 랜딩에서는 따라가는 인물 "레나 아르벨"의 실·이름 강조·단계 숫자 색.
- **Conservatory Green** (`node-place`): 장소.
- **Guild Violet** (`node-organization`): 조직.
- **Brass Umber** (`node-item`): 아이템.
- **Faded Brick** (`node-event`): 이벤트.
- **Lagoon Teal** (`node-worldview`): 세계관.
- **Pencil Grey** (`node-manuscript`): 원고.

어두운 모드에서 일곱 색은 색상 없이 밝기만 다른 회색 단계(Paper White → Slate)로 바뀐다(Pencil 원천 값). 그래서 문서 종류는 어느 모드에서든 색과 함께 아이콘·레이블로 구분한다.

### Tertiary

변경 상태와 즐겨찾기. 그래프 최신화의 변경 사항(diff) 화면에서만 의미를 가진다.

- **Change Blue** (`diff-add` / `diff-add-bg`): 추가.
- **Change Teal** (`diff-modify` / `diff-modify-bg`): 수정.
- **Change Rust** (`diff-remove` / `diff-remove-bg`): 삭제.
- **Change Moss** (`diff-done` / `diff-done-bg`): 확정됨.
- **Bookmark Gold** (`favorite`): 즐겨찾기 별.

### Neutral

- **Workbench Grey** (`bg-canvas`): 페이지 바닥. 랜딩 전체 바닥도 같다.
- **Sheet White** (`surface-default`): 문서·입력칸·칩·보조 버튼의 면.
- **Raised Sheet** (`surface-raised`): 대화상자·메뉴·토스트.
- **Rail Grey** (`surface-navigation`): 사이드바, 세그먼트 바탕, 랜딩 바닥글.
- **Topbar Grey** (`surface-topbar`): 앱 상단 막대.
- **Icon Well** (`surface-icon`): 아이콘 받침, 읽기 전용 입력칸, 선택된 세그먼트.
- **Hairline** (`border-default`): 모든 1px 구분선과 테두리.
- **Ink** (`text-primary`) / **Graphite** (`text-secondary`): 본문과 보조 글자.
- **Icon Ink** (`icon-default`): 기본 아이콘.
- **Hover Veil** (`state-hover`) / **Selected Veil** (`state-selected`): 남색 계열 반투명 막. 모든 hover·선택·현재 위치 표시.

스크림(`scrim-modal`·`scrim-dialog`·`scrim-strong`)과 그림자 색(`shadow-menu`·`shadow-dialog`)은 Elevation & Depth에서 다룬다.

### Named Rules

**The Two Meanings Rule.** 색은 두 가지 뜻만 가진다. 청록은 행동과 포커스, 문서 종류 색은 문서의 정체. 장식용 색, 그라데이션 강조, 세 번째 브랜드 색을 들이지 않는다.

**The Kind Color Covenant.** `--lk-color-node-*`는 문서 종류(또는 랜딩에서 따라가는 인물의 실)만 뜻한다. 다른 것을 칠하는 데 빌려 쓰지 않고, 색만으로 종류를 말하지 않는다. 언제나 종류 아이콘·레이블과 함께 쓴다.

**The No-Alarm Rule.** 앱에는 빨간 오류 색이 없다. 입력 오류는 청록 테두리 + 아이콘 + 굵은 글씨, 상태 오류는 중립 면 + `text-secondary` 테두리로 표시한다. 붉은 계열(`diff-remove`)은 diff의 "삭제"만 뜻한다.

## Typography

**Display Font:** Wanted Sans Variable (랜딩 전용, Geist와 한글 시스템 서체로 대체)
**Body Font:** Geist (`next/font`, 가변 굵기) → Apple SD Gothic Neo → Noto Sans KR → Malgun Gothic
**Label/Mono Font:** Geist Mono → ui-monospace (에디터의 고정폭 글꼴 선택지와 코드 블록)

**Character:** 앱은 Geist 한 서체로 크기보다 굵기(400/600/650)로 위계를 만드는 담담한 도구 서체다. 랜딩 헤드라인만 Wanted Sans 800의 단단한 한글 획으로 목소리를 키운다.

### Hierarchy

앱(Pencil 토큰 `--lk-font-size-*`, `--lk-line-height-*`):

- **Manuscript Title** (600, 21px, 1.25): 원고 제목, 로그인 화면 제목.
- **Heading LG** (600–650, 18px): 화면·패널 제목(메모, 프로젝트, 버전 기록).
- **Heading** (600, 15px, 1.4): 대화상자 제목, 빈 상태 제목, diff 문서 제목(650).
- **Manuscript Body** (400, 14px, 1.5): 원고 본문 기본값. 글꼴·크기·줄 간격은 작가가 툴바에서 바꾸고 기기마다 저장한다. 본문 폭 `--lk-doc-content-width`(672px).
- **Body** (400, 12px, 1.5): 앱 기본 글자. 버튼·메뉴·사이드바·입력칸. 버튼과 강조 항목은 600.
- **Context** (400, 12px, 1.55): 상태 안내 같은 설명 문단.
- **Label** (600, 11px): 필드 레이블(settings 밀도), 힌트, 그룹 이름, 배지, 세그먼트.

랜딩(`landing.module.css`, 기본 16px / 1.6):

- **Display** (Wanted Sans 800, `clamp(38px, 4.8vw, 68px)`, 1.1, -0.038em): 첫 화면 h1 하나.
- **Headline** (Wanted Sans 800, `clamp(30px, 3.1vw, 44px)`, 1.2, -0.032em): 장마다 h2.
- **Headline SM** (Wanted Sans 800, `clamp(24px, 2.2vw, 30px)`, 1.3, -0.025em): 작은 묶음의 h3.
- **Numeral** (Wanted Sans 800, 34px, 1, tabular-nums, `node-character` 색): AI 최신화 세 단계의 번호.
- **Lede** (Geist 450, `clamp(17px, 1.4vw, 19px)`, 1.65, 최대 34em): 첫 화면 설명.
- **Landing Body** (Geist 450, 17px, 1.7, 최대 28–30em): 장 설명. `text-secondary`.
- **Landing Point** (Geist 400, 15px, 1.6): 아이콘 붙은 항목 설명. 항목 제목은 16px 700 `text-primary`.

헤드라인은 `text-wrap: balance`와 의도한 줄바꿈(`white-space: pre-line`)을 함께 쓰고, 랜딩 전체에 `word-break: keep-all`로 한국어 어절을 끊지 않는다.

### Named Rules

**The Display Scope Rule.** Wanted Sans는 랜딩의 h1·h2·h3와 단계 숫자에만 쓴다. 앱 화면, 축소한 작업공간 창 안, 본문·버튼·내비게이션에는 쓰지 않는다. 서체 파일은 `src/features/landing/fonts/wanted-sans/`에 자체 호스팅(OFL, unicode-range 분할, `font-display: swap`)하며 `landing-page.tsx`만 불러온다.

**The Weight Not Size Rule.** 앱 안에서 위계는 크기를 키우기보다 굵기(400 → 600 → 650)로 만든다. 앱의 가장 큰 글자는 21px이다.

## Layout

**앱.** 데스크톱 1440×900이 설계 기준이다. 사이드바(`surface-navigation`) + 상단 막대(`surface-topbar`) + 탭·분할 보기의 작업공간. 간격은 Pencil 스케일 `--lk-space-1…7`(4·8·10·14·20·28px, 5단계 없음)만 쓴다. 고정 치수 토큰: 컨트롤 높이 `--lk-control-height` 28px, 속성 표 행 34px와 레이블 폭 168px, 문서 본문 폭 672px. 대화상자는 sm 440 / md 520 / lg 650px 폭, 안쪽 20px.

**랜딩.** 본문 최대 폭 1240px + 좌우 여백 `clamp(16px, 5vw, 100px)`. 머리글은 64px 높이로 붙어 다니고, 8px 넘게 스크롤하면 아래 1px 선이 나타난다. 장 사이는 `clamp(120px, 14vw, 200px)`(AI 최신화 앞은 `clamp(140px, 16vw, 220px)`)로 넉넉히 띄운다. 장마다 창과 설명의 비율과 세로 정렬을 달리한다(7:5 가운데, 4:8 위, 7:5 아래, 창 하나를 1000px로 가운데). 첫 화면 뒤에는 36px 격자 선을 타원 마스크로 흐리게 깐다(첫 화면 전용).

**축소한 작업공간 창(Scene Frame).** 실제 앱 창(`AppWindow`, onboarding의 `scenes.tsx`)을 1000×640 캔버스로 그린 뒤 자리 폭에 맞춰 `transform: scale()`로 줄인다. 배율은 `max(자리폭/1000, 0.56, min(1, 초점 배율))`. 0.56보다 작으면 창 안 글자를 읽을 수 없으므로 더 줄이지 않고 왼쪽(사이드바 196px)부터 잘라 낸다. `focus` 범위(예: AI 최신화 창 432–976px)를 주면 그 범위가 자리를 채우도록 키운다. 프레임 높이는 `640 × 배율 + 2px`. 캔버스는 `aria-hidden`이고 화면 낭독기에는 `figcaption`의 장면 설명만 읽힌다.

**반응형.** 960px 이하에서 랜딩의 장은 한 열로 쌓이고 머리글 메뉴가 숨고, 실은 왼쪽 여백의 레일을 따라 내려가며 창마다 왼쪽 위 모서리로 가지를 낸다. 520px 이하에서 CTA는 폭 100%, 머리글의 "로그인"이 숨는다. 온보딩도 960px에서 한 열로 바뀐다. 앱 자체의 모바일 레이아웃은 범위 밖이다.

## Elevation & Depth

기본은 평평하다. 면의 깊이는 그림자보다 회색 단계(canvas → surface → raised)와 1px 선으로 나눈다. 그림자는 떠 있는 것(메뉴·팝오버·토스트·대화상자)과 축소한 창에만 붙고, 그림자 색은 모드별 토큰(`shadow-menu`, `shadow-dialog`)을 쓴다. 뒤를 가릴 때는 스크림 세 단계를 쓴다: `scrim-modal`(+ `blur(2px)`), `scrim-dialog`, `scrim-strong`.

### Shadow Vocabulary

- **Menu lift** (`box-shadow: 0 4px 16px var(--lk-color-shadow-menu)`): 메뉴, 토스트.
- **Popover lift** (`box-shadow: 0 8px 24px var(--lk-color-shadow-menu)`): 앵커에 붙는 팝오버류.
- **Dialog lift** (`box-shadow: 0 16px 48px var(--lk-color-shadow-dialog)`): 네이티브 `<dialog>` 모달.
- **Stage window** (`box-shadow: 0 24px 64px var(--lk-color-shadow-dialog)`): 온보딩의 축소 창.
- **Landing frame** (`box-shadow: 0 32px 64px -32px var(--lk-color-shadow-dialog), 0 2px 6px -2px var(--lk-color-shadow-menu)`): 랜딩의 축소 창. 아래로 길게 떨어지는 그림자와 가까운 접지선.
- **Focus ring** (`outline: 2px solid var(--lk-color-accent-primary)`, offset 1px; 랜딩 3px; 입력칸 -1px): 모든 키보드 포커스.
- **Ring cue** (`box-shadow: 0 0 0 3px <바닥색>, 0 0 0 4.5–5px <강조색>`): 바닥색 틈을 둔 이중 고리. 그래프에서 고른 노드(청록), 랜딩에서 따라가는 인물(캐릭터 색).

### Named Rules

**The Flat Sheet Rule.** 문서·카드·패널은 그림자 없이 선과 면 색으로만 나눈다. 그림자는 화면 위에 떠서 다른 것을 가리는 요소에만 쓴다.

## Shapes

거의 각진 모서리의 사무적인 형태다. 컨트롤과 카드는 2px(`rounded.control`, `rounded.card`)로, 둥글다기보다 모서리를 살짝 죽인 정도다. 6px(`rounded.window`)은 축소한 작업공간 창의 바깥 틀에만 쓴다. 완전히 둥근 형태는 세 곳뿐이다: 상태 알약(`rounded.pill`, "지금 만들고 있는 기능이에요"와 배지), 그래프 노드와 종류 점(원), 타임라인 막대(높이 8px의 반인 4px 캡슐, `rounded.bar`). 선은 늘 1px `border-default`이고, 랜딩의 실(2.5px)과 실 마디(2px 테두리 원)만 굵다.

## Components

### Buttons

담담하고 낮다. 28px 높이에 2px 모서리, 글자 600.

- **Shape:** 거의 직각(2px). 크기 sm 28 / md 32 / lg 40px.
- **Primary:** 청록 면 + on-accent 글자. hover에서 `text-primary` 12%를 섞어 가라앉는다.
- **Outline (기본값):** 투명 면 + 1px `border-default`. hover는 `state-hover` 막.
- **Ghost:** 테두리 없이 좌우 10px, 글자 400. 눌린 상태(`aria-pressed`)는 `state-selected` 막 + 600.
- **Icon Button:** 28×28, `icon-default` 아이콘, hover `state-hover`, 눌림·펼침 `state-selected`.
- **Disabled / Busy:** 불투명도 0.45(아이콘 버튼 0.4). busy는 불투명도를 유지하고 스피너(900ms 회전)를 붙인다.
- **랜딩 버튼:** 같은 모양을 크게 쓴다. lg 52px(좌우 24px, 17px), sm 36px(좌우 14px, 15px). 주 버튼(청록), 보조(흰 면 + 선, hover에서 선이 `text-secondary`로 짙어짐), quiet(투명, `text-secondary` → hover `text-primary`). "Google로 시작하기"에는 흰 원 안의 Google 마크가 붙는다. 색 전환 160ms.

### Chips

- **Style (랜딩 문서 종류 칩):** 30px 높이, 흰 면 + 1px 선 + 2px 모서리, 13px 600. 8px 종류 색 점 + 14px 종류 아이콘 + 레이블. 일곱 종류를 모두 나열한다.
- **상태 알약:** 알약 모양, 흰 면 + 1px 선, `text-secondary` 14px 500 + 시계 아이콘. 준비 중인 기능을 숨기지 않고 밝힐 때만 쓴다.

### Cards / Containers

- **Corner Style:** 2px.
- **Background:** `surface-default`(문서·칸), `surface-raised`(대화상자·메뉴·토스트).
- **Shadow Strategy:** Flat Sheet Rule. 떠 있는 것만 Shadow Vocabulary를 쓴다.
- **Border:** 1px `border-default`.
- **Internal Padding:** 대화상자 20px(간격 20, compact 14), 토스트·상태 안내 14px, 인라인 안내 10px.
- **Icon surface:** 대화상자 머리의 40px(sm 38px), 빈 상태의 52px(large 64px) `surface-icon` 받침에 아이콘을 놓는다.

### Inputs / Fields

- **Style:** 44px 높이(settings 밀도 40px), 흰 면 + 1px 선 + 2px 모서리, 좌우 10px. 여러 줄은 최소 88px, 세로로만 늘림.
- **Focus:** 2px 청록 outline을 안쪽(-1px)으로.
- **Error / Disabled:** 오류는 청록 테두리 + 경고 아이콘 + 600 메시지(The No-Alarm Rule). 읽기 전용·비활성은 `surface-icon` 면. 글자 수는 tabular-nums.

### Navigation

- **사이드바 항목:** 32px 높이, 좌우 10px, 아이콘 + 말줄임 레이블. hover `state-hover`, 현재 위치(`aria-current="page"`)는 `state-selected` 막(strong 변형은 600). 선택을 색 띠로 표시하지 않는다.
- **메뉴:** 204px 폭, 8px 안쪽, 항목 34px. hover·키보드 포커스 `state-hover`, 체크된 항목 `state-selected` + 600 + 청록 체크. 파괴 동작은 청록 600. 방향키·Esc 처리.
- **세그먼트:** `surface-navigation` 홈 안에서 고른 칸만 `surface-icon` 면으로 떠오른다. 30px, 11px 600.
- **랜딩 머리글:** 로고(28px 청록 사각형 안 "L" + "Lore Sentry" 17px 700), 메뉴 링크 15px 500 `text-secondary`(hover `text-primary`), 오른쪽에 로그인(quiet)과 시작하기(sm 주 버튼). 건너뛰기 링크가 포커스 때만 나타난다.

### Story Thread (signature, 랜딩)

원고 속 이름 "레나 아르벨"에서 시작해 축소 창들을 차례로 꿰고 AI 최신화 창에서 끝나는 캐릭터 색 실.

- **선:** SVG 경로, `stroke: var(--lk-color-node-character)`, 2.5px, 둥근 끝. 창 위로 지나가지 않고 창과 창 사이의 빈자리만 지난다. 넓은 화면에서는 한 창의 아래 가운데에서 다음 창의 위 가운데로 세로 S 곡선을 긋고, 좁은 화면에서는 왼쪽 레일에서 창의 왼쪽 위로 가지를 낸다.
- **마디:** 실이 닿는 자리마다 바닥색 원(r 4px, 마지막 r 6px, 2px 캐릭터 색 테두리)이 커지며(scale 0.4 → 1) 나타난다.
- **그리는 양:** 화면 높이의 70% 선까지 스크롤로 내려온 만큼 그린다. 이 선은 창이 켜지는 선(아래 30% 여백)과 같아서, 실이 닿는 순간 그 창의 장면이 재생된다.
- **기원:** 첫 화면 에디터에서 마지막 문단이 타이핑되며 이름이 캐릭터 색으로 밝아진다(글자 600, 12% 캐릭터 색 바탕, 아래 2px 안쪽 선). 그 순간 실이 첫 창 아래 끝까지 900ms에 걸쳐 뻗는다.

### Scene Frame (signature, 랜딩·온보딩 공용)

실제 작업공간 창을 줄여 보여 주는 무대. 6px 모서리 + 1px 선 + `bg-canvas` + Landing frame 그림자. 화면 아래 30% 선을 넘을 때 처음 장면을 마운트하고(첫 화면은 즉시), 불투명도 0.4 → 1(520ms)과 16px 올라옴(620ms)으로 등장한 뒤 온보딩과 같은 장면 내부 동작(창 등장, 노드 등장, 타임라인 막대 자라남, 선 그리기)을 한 번 재생한다. 장면: `editor`, `files`, `relations`, `graph`, `timeline`, `refresh`. 창 안의 타임라인 막대는 문서 종류 색을 쓴다.

### Followed-Character Cue (랜딩)

각 장면에서 따라가는 인물의 자리에 `data-followed`가 붙는다(사이드바 항목, 그래프 노드, 타임라인 행, diff 목록 항목). 창이 켜지고 900ms 뒤 그 자리에 바닥색 3px 틈 + 캐릭터 색 2px의 이중 고리가 1100ms 동안 한 번 떠올랐다 사라진다. 그래프 노드는 이름표를 빼고 점에만 고리를 건다. 반복하지 않는다.

### Motion

- **이징:** `cubic-bezier(0.2, 0.8, 0.2, 1)` 하나(랜딩·온보딩 각 모듈의 `--ease`). 빠르게 출발해 부드럽게 멈춘다. 선형은 실의 대시 갱신(90ms), 스피너, 페이드 일부에만.
- **시간:** 색 전환 160ms, 머리글 선 200ms, 마디 200/320ms, 장면 내부 등장 320–560ms, 창 등장 520–620ms, 인물 고리 1100ms. 바운스·탄성 없음.
- **원칙:** 움직임은 작업공간이 실제로 하는 일(타이핑, 노드가 이어짐, 막대가 자람, 변경 사항이 나란히 놓임)을 재생할 때만 쓴다. 한 번 재생하고 멈춘다.
- **`prefers-reduced-motion: reduce`:** 랜딩은 부드러운 스크롤을 끄고, 창·마디·실·머리글·버튼의 전환을 없애고, 창을 처음부터 완전히 보이게 하고, 인물 고리와 스피너를 멈춘다. 실은 첫 창 아래 끝까지 즉시 그려진 뒤 스크롤 위치만 따라간다(스스로 움직이지 않음). 온보딩은 등장 동작을 120ms 선형 페이드로 바꾸고 선·막대·스포트라이트·캐럿 움직임을 없앤다.

## Do's and Don'ts

### Do:

- **Do** 모든 색·간격·모서리를 `var(--lk-*)`로 쓴다. 값이 없으면 Pencil에 변수를 추가하고 `node scripts/sync-pencil.mjs` → `pnpm tokens`로 생성한다.
- **Do** 두 모드(dark 기본, light)에서 함께 확인한다. 어두운 모드에서는 문서 종류 색이 회색 단계가 되므로 종류 아이콘·레이블이 늘 함께 있어야 한다.
- **Do** hover·선택·현재 위치를 `state-hover`·`state-selected` 반투명 막으로 표시한다.
- **Do** 컨트롤과 카드에 2px 모서리, 1px `border-default` 선을 쓴다. 6px은 축소한 작업공간 창의 틀에만.
- **Do** 기능은 실제 작업공간 창(`AppWindow`)을 축소해 보여 준다. 창을 0.56배보다 작게 줄이지 말고 사이드바 쪽을 잘라 낸다.
- **Do** 모든 키보드 포커스에 2px 청록 outline을 남긴다.
- **Do** 움직임마다 `prefers-reduced-motion` 분기를 함께 쓴다. 줄인 상태에서도 내용은 처음부터 모두 보여야 한다.
- **Do** 아이콘은 lucide 레지스트리(`<Icon name size />`, 기본 14px, 의미가 있으면 `label`)로만 쓴다. 새 아이콘은 `node scripts/add-icons.mjs`로 등록한다.

### Don't:

- **Don't** `src/design-system/tokens/tokens.css`·`tokens.ts`를 손으로 고친다(`pnpm tokens:check`가 CI에서 막는다).
- **Don't** 토큰 밖의 hex를 컴포넌트에 쓴다. 예외는 Google 마크의 흰 원과 인쇄 지면(`.lk-print-sheet`)뿐이다.
- **Don't** Wanted Sans를 앱 화면, 축소 창 안, 본문·버튼·내비게이션에 쓴다(The Display Scope Rule).
- **Don't** 문서 종류 색을 문서 종류가 아닌 것에 칠하거나, 색만으로 종류·상태를 구분한다.
- **Don't** 목록 행이나 카드의 선택을 색깔 있는 왼쪽 띠(border-left, inset box-shadow)로 표시한다. 선택은 상태 막으로 한다. 원고 인용문(blockquote)의 2px 왼쪽 선은 글의 관례이므로 해당하지 않는다.
- **Don't** 빨간 오류 색을 새로 들인다(The No-Alarm Rule). 붉은 계열은 diff의 삭제만 뜻한다.
- **Don't** 앱 컨트롤·카드의 모서리를 2px보다 둥글게 만든다.
- **Don't** 반복 재생되는 장식 애니메이션, 바운스·탄성 이징을 쓴다.
