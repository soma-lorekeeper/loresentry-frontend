# Lorekeeper UI 컴포넌트 라이브러리

`docs/design/lorekeeper.lib.pen`을 디자인 변수와 재사용 컴포넌트의 단일 원본으로
사용한다. `docs/design/lorekeeper.pen`은 라이브러리를 `b` 별칭으로 가져오며,
화면에서는 `$b:*` 변수와 `b:*` 컴포넌트만 참조한다.

## 디자인 변수

- 전체 변수: 64개
- 테마 색상 변수: 38개
- 공통 숫자 변수: 24개
- 공통 문자열 변수: 2개
- 테마 축: `mode = dark | light`

색상 변수 하나가 다크와 라이트 값을 함께 가진다. 따라서 색상값은 76개지만
색상 변수는 38개다. 간격, 반경, 글자 크기, 행간과 아이콘 굵기는 두 테마가 같은
공통 변수를 사용한다.

그림자와 스크림도 변수로 둔다(`color-shadow-*`, `color-scrim-*`). 생 값으로 박아
두면 테마를 따라가지 못하는데, 다크에서 알맞은 33% 검정 그림자는 흰 바탕에서
너무 무겁다. `color-surface-alpha0`은 미스트 그라디언트의 시작 정지점이다 —
투명한 검정에서 표면색으로 보간하면 흰 바탕에서 중간이 회색으로 뜬다.

### 라이트 팔레트를 잡은 방법

**색조 숫자가 아니라 지각되는 중성도로 맞춘다.** 다크는 청록 계열(H 180~206,
S 7~29%)이지만 그렇게 읽히지 않는다 — L 8~25% 구간에서는 그만한 색 기운이 거의
보이지 않기 때문이다. 같은 색조를 같은 채도로 L 94~97%에 올리면 그 기운이 그대로
다 보여서 화면이 차갑고 임상적으로 읽힌다. 그래서 라이트는 잔여 색조를 훨씬 낮춘
중성 회색으로 두었다.

**층의 순서는 두 모드가 같다** — `navigation < topbar < canvas < surface < raised`.
사이드바가 가장 가라앉고 문서 표면이 가장 떠오른다. 라이트에서 사이드바
(`#E7E9EB`)가 캔버스(`#F3F4F6`)보다 어두운 것이 그래서다.

**표면 계단은 다크와 같은 밝기차, 글자는 다크와 같은 대비비로 잡는다.** 대비비는
밝기 구간에 따라 지각 간격이 달라서 표면을 맞추는 데 쓰면 어긋나고, 반대로 글자
가독성은 대비비가 지배한다. 표면 계단에는 다크의 밝기차를 0.85배로 줄여 쓴다 —
어두운 선은 밝은 바탕 위에서 더 세게 읽힌다.

**강조색만 예외로 둔다.** 다크의 캔버스 대비 9.49:1은 밝은 색이 어두운 바탕에
놓였다는 사실의 결과지 의도한 값이 아니다. 라이트에서 그대로 재현하면 거의 검정에
가까워져 색이 남지 않으므로 6.45:1로 잡았다 — 본문색과 보조색 사이라는 자리는
다크와 같다.

### 만져진 자리는 색이 아니라 잉크로 표시한다

선택과 hover 바탕만 불투명색이 아니다. **같은 색조의 잉크를 두 세기로 얇게 덮는다.**

| 토큰 | 알파 | dark | light |
| --- | --- | --- | --- |
| `color-state-selected` | 0.12 | `#CAD9EB1F` | `#002E591F` |
| `color-state-hover` | 0.06 | `#CAD9EB0F` | `#002E590F` |

**불투명한 색은 어떤 밝기로도 그림자가 되지 않는다.** 연하면 흐릿하고 진하면 무거운
"다른 색 패널"이 된다. 얇게 덮은 잉크는 밝기와 무관하게 표면이 만져진 것으로 읽힌다.
라이트는 어두운 잉크로 눌러 그림자를 만들고, 다크는 밝은 잉크로 들어 올려 하이라이트를
만든다 — 밝은 바탕에서는 눌린 것이, 어두운 바탕에서는 들린 것이 손이 닿은 자리다.

**두 모드의 잉크는 색조가 같다**(OKLCH H 252). 라이트 잉크를 12%로 깔면 캔버스 위에서
`#D6DCE3`이 되는데, 이 색의 색조가 원래 쓰던 선택색과 같은 H 252이고 채도는 그
3분의 2다. 잉크로 바꾸면서도 쓰던 색감이 남는다.

**바탕이 달라도 만져진 정도가 같아야 한다.** 상태 바탕은 사이드바·탑바·캔버스·흰
표면 네 곳에 얹힌다. 불투명색은 자리마다 대비가 갈렸지만 잉크는 고르다.

| | 사이드바 | 탑바 | 캔버스 | 흰 표면 | 편차 |
| --- | --- | --- | --- | --- | --- |
| 불투명 `#CBD5DF` (옛 값) | 1.222 | 1.278 | 1.351 | 1.487 | **0.265** |
| 잉크 선택 0.12 | 1.245 | 1.249 | 1.255 | 1.258 | **0.014** |

다크도 같은 이유로 잉크로 바꿨다. 불투명 `#293237`은 사이드바에서 1.414, 떠 있는
패널에서 1.109로 **편차 0.305** — 라이트보다 더 어긋나 있었다.

**선택이 hover보다 진하다.** 머무는 자리보다 고른 자리가 더 강하게 남아야 한다.
비율은 [pensiv](https://app.pensiv.so)를 재서 잡았다 — 그쪽은 hover 5% · 선택 10%로
hover가 선택의 절반이다.

두 상태가 한 규칙에 묶여 있으면 **선택된 항목에 마우스를 올려도 아무 일이 일어나지
않는다.** 그래서 hover 규칙에는 선택을 제외하는 조건을 붙인다.

```css
.sidebarItem:hover:not([data-selected="true"]) { background: var(--lk-color-state-hover); }
.sidebarItem[data-selected="true"] { background: var(--lk-color-state-selected); }
```

### 아이콘 바탕은 라이트에서만 잉크다

`color-surface-icon`은 아이콘을 감싸는 정사각 바탕이다. 상태가 아니라 장식이므로
**어떤 상태보다도 약해야 한다.** 그런데 두 모드가 서로 다른 방식을 쓴다.

| | 값 | 방식 |
| --- | --- | --- |
| dark | `#30363A` | 불투명 |
| light | `#002E590D` | 잉크 α 0.05 |

다크는 표면이 뒤에서 앞으로 갈수록 밝아지는데(사이드바 0.189 → 카드 0.266), 카드
위로 아직 올라갈 여백이 있어서 박스를 한 칸 더 밝게(0.329) 두면 "떠 있는 판"으로
읽힌다. 라이트는 카드가 이미 순백이라 **더 밝게 갈 자리가 없다.** 불투명색으로는
어둡게 내리는 수밖에 없고, 그러면 밝기 사다리가 거기서만 뒤집혀 판이 아니라 구멍이
된다. 예전 값 `#D5D8DC`가 그랬다 — 흰 표면 위 대비 1.430으로, 선택(1.258)보다 강한
장식이었다.

잉크로 두면 바탕이 무엇이든 같은 세기로 얹힌다. 흰 표면·캔버스·탑바·사이드바 네 곳에서
1.097~1.102, **편차 0.005**다. 불투명 `#D5D8DC`는 같은 자리에서 1.175~1.430으로
편차가 0.255였고, 흰 바탕에 맞춰 옅게 잡으면 캔버스 위 휴지통 빈 상태에서 사라졌다.

**α는 0.06이 아니라 0.05다.** 0.06은 `color-state-hover`의 라이트 값과 정확히 같아져
장식이 hover 하이라이트와 구분되지 않는다. 한 칸 내려 두면 선택(1.258) · hover(1.122) ·
장식(1.100) 순서가 되어, 의미를 갖지 않는 것이 가장 약하게 남는다.

### 잉크 사다리는 네 단계다

같은 색조의 잉크를 네 세기로 쓴다. 흰 표면 위 대비를 기준으로 적었다.

| 단계 | 토큰 | α | 대비 |
| --- | --- | --- | --- |
| 장식·회색 버튼 평상시 | `color-surface-icon` | 0.05 | 1.100 |
| 투명 요소 hover | `color-state-hover` | 0.06 | 1.122 |
| 회색 버튼 hover | `color-surface-icon-hover` | 0.10 | 1.209 |
| 선택·활성 | `color-state-selected` | 0.12 | 1.258 |

**회색 버튼에는 전용 hover가 필요하다.** 평상시가 이미 α0.05인 박스에 α0.06을 얹으면
차이가 0.01뿐이라 마우스를 올려도 변화가 보이지 않는다. 평상시가 투명한 요소는
`color-state-hover`로 충분하지만, 회색 박스를 가진 버튼은 `color-surface-icon-hover`를
쓴다.

### 상태는 강조 테두리로 나타내지 않는다

hover · 포커스 · 선택 · 열림 · 편집 중 · 드롭 타깃을 **전부 잉크로** 표시한다. 강조색
테두리(`color-accent-primary`)는 **강조색으로 채운 버튼**에만 남는다. 그 버튼은 테두리와
채움이 같은 색이라 테두리가 상태를 뜻하지 않는다.

이유가 둘이다. 하나, 강조 테두리를 여러 상태에 같이 쓰면 상태끼리 구분되지 않는다 —
프로젝트 카드는 hover와 선택이 둘 다 강조 테두리라 사실상 같아 보였다. 둘, 테두리는 표면
위계를 건드리지 않아서 "이 줄이 골라져 있다"는 느낌을 만들지 못한다. 잉크는 표면이 눌린
자리로 읽히므로 목록·카드·탭 어디서나 같은 방식으로 작동한다.

**상태가 아닌 테두리는 중립색으로 둔다.** 평상시 카드 윤곽, 입력 필드, 안내 배너처럼
구조를 그리는 선은 `color-border-default`를 쓴다. 강조색은 남기지 않는다.

**예외는 목록의 왼쪽 막대 하나다.** 세로로 늘어선 목록에서 **눈길이 가야 할 항목**을
가리키는 3px 왼쪽 막대에는 `color-accent-primary`를 쓴다. 항목을 둘러싸는 테두리가
아니라 목록 축에 직각으로 놓인 짧은 막대라, 위 문단이 말하는 "상태를 나타내는 테두리"와
겹치지 않는다. 나머지 항목의 막대는 `color-border-default`이거나 투명이다.

무엇을 가리키는지는 목록의 성격을 따른다. 한 번에 하나만 고르는 목록에서는 **현재 위치**를
가리키고(그래프 노드 패널 146, 가이드 목차 레일 79), 처리해야 할 것이 쌓이는 목록에서는
**아직 손대지 않은 항목**을 가리킨다(Diff 목록 156·157 — 반영이 끝난 항목은 중립 막대로
내려가고, 전부 끝난 158에는 강조 막대가 하나도 없다).

**막대와 채움은 다른 것을 말한다.** 157에서 유중혁 행은 강조 막대(아직 반영 안 됨)와
선택 잉크(지금 보고 있는 행)를 동시에 가진다. 막대를 선택 표시로 쓰면 이 둘을 한 신호로
겹쳐 쓰게 되므로, 선택은 언제나 잉크 채움이 맡는다.

밑줄 탭도 같은 규칙을 따른다. 메모 범위 탭은 선택된 탭에 accent 밑줄 2px을 긋고 있었으나
선택 잉크 채움으로 바꿨다.

**포커스는 hover와 같은 세기로 둔다**(`color-state-hover`, 1.122). 포커스는 스쳐 가는
신호라 선택(1.258)보다 약해야, 선택된 항목에 초점이 가도 선택 음영이 지워지지 않는다.
다만 이 선택에는 대가가 있다 — 잉크만으로는 초점 위치가 마우스 hover와 같아 보이고,
이미 선택된 항목 위에서는 초점이 드러나지 않는다.

**편집 중인 대상은 포커스보다 진하다**(`color-state-selected`, 1.258). 스쳐 가는 초점과
달리 편집 중은 사용자가 지금 손대고 있는 자리라 한동안 머문다. 47번의 새 메모 카드가
그렇다 — `color-state-hover`로는 다크에서 대비가 1.06이라 카드가 눌린 것인지 아닌지
분간되지 않았고, 92번의 메뉴가 열린 카드와 같은 무게를 줘야 "지금 이 카드"가 읽힌다.

**아이콘 바탕에 상태 토큰을 쓰지 않는다.** 아이콘을 감싸는 정사각 바탕은 예외 없이
`color-surface-icon`이고, `color-state-selected`나 `color-state-hover`는 쓰지 않는다.
두 토큰의 라이트 값이 한때 `#D5D8DC`와 `#CBD5DF`로 거의 같아서 섞여 써도 표가 나지
않았지만, 값이 갈린 지금은 같은 모양의 박스가 화면마다 다른 세기로 보인다. 상태
토큰은 `aria-pressed` · `data-selected` · `aria-current` · `data-drop-target`처럼
**무언가를 나타내는 자리에만** 붙인다.

### 분류 강조색은 라이트에만 있다

`color-node-*` 일곱 개는 다크에서 무채색 밝기 계단이고, 라이트에서는 그 계단 위에
색상을 얹은 값이다. 근거는 [작업공간 그래프](./workspace/graph.md)에 적었다.

일곱 색을 같은 밝기에 두지 않는다. 그래프 노드는 지름 10~30px이라 **작은
시야각에서는 색상 변별력이 누구에게나 떨어지고**, 등명도 집합은 그 조건에서 가장
약하다. OKLCH 밝기를 0.46~0.62로 벌려 두면 축소해도 구분이 남는다. 색각 시뮬레이션이
그 차이를 보여 준다 — 최소 지각거리(OKLab)가 녹색약에서 0.006에서 0.030으로,
정상 색각에서도 0.054에서 0.073으로 벌어진다.

#### 색을 쓰는 자리

**여러 분류가 한 화면에 섞여 있고 그중에서 고르는 것이 그 화면이 하는 일일 때만 색을
쓴다. 상시 노출되는 자리와 본문 옆에는 쓰지 않는다.**

| 자리 | 색 | 이유 |
| --- | --- | --- |
| 그래프 노드 원·범례·필터·검색 점 | 씀 | 분류로 고르는 것이 이 화면의 일이다 |
| 타임라인 막대와 연장 띠 | 씀 | 레인 일곱을 가르는 것이 표의 일이다 |
| 검색 결과 행의 유형 아이콘 | 씀 | 여러 분류가 섞인 목록에서 고르는 자리이고, 일시적으로만 뜬다 |
| `분류` 속성 행의 칩 아이콘 | 씀 | **문서당 딱 하나.** 이 문서가 무엇인지를 문자 그대로 말하는 자리이고, 같은 문서가 그래프에서 갖는 색과 여기서 묶인다 |
| 사이드바 파일 목록 | 안 씀 | 원고 편집 화면 한 장에만 분류 아이콘이 16개다. 상시 노출이라 색을 풀면 쓰는 내내 색점 열여섯이 시야에 남는다. 사람은 트리에서 분류가 아니라 이름과 위치로 찾는다 |
| 탭 | 안 씀 | 상시 노출이고, 지금 무슨 문서인지는 이미 이름이 말한다 |
| 속성의 파일·관계 칩 | 안 씀 | 본문 바로 옆에 여러 개가 붙는다. `분류` 행이 이 문서를 말하고, 관계 행은 이어진 것을 말하므로 역할이 다르다 |

그래서 원고를 쓰는 화면에서 색이 나타나는 자리는 `분류` 행 하나뿐이고, 관계를
훑으러 그래프·타임라인으로 가면 그때 색이 펼쳐진다.

### 즐겨찾기 별은 문서 제목 옆에만 있다

**즐겨찾기를 켜고 끄는 자리는 문서 제목 오른쪽의 별 하나뿐이다.** 사이드바 즐겨찾기
섹션은 결과를 보여 줄 뿐 토글이 아니고, 파일 헤더에도 넣지 않는다. 진입점이 하나여야
사용자가 "여기서 켰다"를 기억한다.

라벨도 테두리도 배경도 없는 맨 아이콘 버튼이다(`Icon Button / Default`, 28×28에
별 14×14). 제목과의 간격은 `space-1`이고, 버튼 안쪽 여백을 더하면 글자에서 별까지
11px이 된다.

| 상태 | 모양 | 색 |
| --- | --- | --- |
| 꺼짐 | 윤곽선 별 (`icon`) | `color-icon-default` |
| 켜짐 | **속을 채운 별** (`path`) | `color-favorite-on` — 다크 `#EDF2F2`, 라이트 `#C8901A` |

**속을 채우는 것이 핵심이다.** 꺼짐과 켜짐이 다크에서 `#B8C3C5`와 `#EDF2F2`로 둘 다
밝은 회색이라, 윤곽선끼리 비교하면 한눈에 갈리지 않는다. 면적이 달라져야 읽힌다.
pen의 `icon`은 선으로만 그리므로 켜진 별은 `path` 노드로 그린다.

**그래프의 별 배지와 색이 다르다.** 그쪽은 `color-favorite`(다크 `#F7E29A`)를 쓴다.
문서 제목 옆에서는 주변 아이콘이 모두 무채색이라 흰 별이 "켜짐"으로 읽히지만, 그래프
캔버스에서는 노드가 이미 밝은 회색 일곱 단계라 흰 별이 가장 밝은 노드 위에서 사라진다.
같은 개념에 색이 둘이 되는 값을 치르더라도 두 자리 모두 읽히는 쪽을 택했다.

라이트 `#C8901A`의 대비는 흰 문서 표면 위 2.86, 캔버스 위 4.24다. 밝은 노랑
(`#E0A800`)은 흰 표면 위 1.96이라 쓸 수 없다.

## 재사용 컴포넌트

라이브러리에는 기본 컴포넌트 51개와 상태 컴포넌트 64개, 총 115개를 둔다.

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
- `Settings / Section`
- `Settings / Field`
- `Settings / Danger Zone`
- `Memo Panel / Resize Handle / Vertical`
- `Memo Panel / Resize Handle / Horizontal`
- `Project List / User Summary`
- `Sidebar / Project List`
- `Project List / New Project Card / Default`
- `Project List / Project Card / Default`
- `Auth / Google Button / Default`
- `Auth / Status Notice / Info`
- `Auth / Policy Notice`

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
- 시간 흐름: `Timeline / Item / Selected`, `Timeline / Item / Editing`,
  `Timeline / Item / Save Error`
- 시간 항목 삭제: `Dialog / Timeline Item Delete`
- 설정 저장: `Settings / Save Bar / Changed`, `Saving`, `Saved`, `Error`
- 설정 확인: `Dialog / Unsaved Settings`, `Dialog / Move Project To Trash`
- 사용자 생성 섹션 삭제: `Dialog / User Section Delete`,
  `Dialog / User Section Delete Error`
- 새 프로젝트 카드: `Hover`, `Focused`, `Disabled`
- 프로젝트 카드: `Hover`, `Focused`, `Selected`
- 프로젝트 카드 메뉴: `Menu / Project Card / Open`
- 로그인 인증: `Auth / Google Button / Processing`,
  `Auth / Google Button / Focused`, `Auth / Status Notice / Error`

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
- 다만 분류 강조색은 라이트에만 있다. 색이 유일한 단서인 자리는 없다 — 노드 안에
  분류 아이콘이 있고 목록에는 이름이 적혀 있어, 두 모드가 전하는 **정보는 같고**
  라이트에서만 색이 한 겹 더 얹힌다.
