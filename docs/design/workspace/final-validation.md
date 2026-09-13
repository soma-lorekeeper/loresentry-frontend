# 작업공간 최종 검증 및 구현 인계

이 문서는 `lorekeeper.pen`과 `lorekeeper.lib.pen`의 최종 검증 결과와 frontend
구현 기준을 기록한다. 집계 기준은 2026-08-30에 저장된 디자인이다.

## 디자인 시스템 감사

### 집계 결과

| 대상 | 검증 항목 | 결과 |
| --- | --- | --- |
| `lorekeeper.lib.pen` | 디자인 변수 | 33개: 색상 13개, 숫자 19개, 문자열 1개 |
| `lorekeeper.lib.pen` | 테마 | `mode = dark \| light`; 색상 변수 13개가 모두 두 모드 값을 가짐 |
| `lorekeeper.lib.pen` | 재사용 컴포넌트 | 92개; 최상위 노드 92개가 모두 재사용 컴포넌트 |
| `lorekeeper.lib.pen` | 내부 컴포넌트 참조 | 239개; 끊어진 참조 0개 |
| `lorekeeper.lib.pen` | 중복 이름·placeholder | 각각 0개 |
| `lorekeeper.pen` | 화면 | 82개; 모두 `1440 × 900` |
| `lorekeeper.pen` | 디자인 변수 | `b:`로 가져온 변수 33개; 로컬 변수 0개, 누락 참조 0개 |
| `lorekeeper.pen` | 재사용 컴포넌트 | `b:`로 가져온 컴포넌트 92개; 로컬 컴포넌트 0개 |
| `lorekeeper.pen` | 컴포넌트 참조 | 전체 818개, 화면 안 579개; 끊어진 참조 0개 |
| `lorekeeper.pen` | 비라이브러리 참조·placeholder | 각각 0개 |

다크와 라이트 모드는 별도 컴포넌트 집합을 만들지 않는다. 하나의 컴포넌트와 같은
33개 변수 이름을 공유하고 `mode` 값만 바꾼다.

### 직접값 예외

다음 직접값은 공통 의미를 가진 디자인 변수로 대체하지 않는다.

- `#00000000`은 투명 영역, `#00000055`·`#00000066`은 그림자,
  `#00000088`·`#00000099`는 대화상자 배경 차단막이다. 테마에 따라 의미가
  달라지는 표면색이나 상태색이 아니다.
- 화면 프레임의 위치·크기·안쪽 여백과 컴포넌트 내부의 미세 간격 `2`·`3`은
  화면 구성 또는 아이콘 광학 보정값이다. 공통 간격 역할에는 `space-*` 변수만
  사용한다.
- 글자 굵기는 정보 위계를 표현하는 컴포넌트 속성이다. 테마별 값이 아니며,
  아이콘 굵기는 `icon-weight-default`를 참조한다.
- 도움말 문서의 표시 제목 `26`·`28`, 본문 행간 `1.7`과 설정 화면 제목 `24`는
  화면 콘텐츠 위계에 한정한다. 재사용 컴포넌트의 본문·제목 크기는
  `font-size-*`와 `line-height-*` 변수를 참조한다.

구조 서명을 비교했을 때 다음 두 쌍은 시각 구조가 같지만 구현 의미가 달라 별도
상태 컴포넌트로 유지한다.

- `Sidebar / Workspace / File Create Inline`과
  `Sidebar / Workspace / Folder Create Inline`: 생성되는 도메인 객체와 완료 후
  동작이 다르다.
- `Memo / Project Card`와 `Memo / Editor Card / Saving`: 전자는 프로젝트 메모의
  데이터 범위이고 후자는 편집기의 저장 진행 상태다.

### 감사 중 보완

즐겨찾기, 파일, 사용자 생성 섹션의 더보기 메뉴에 빠져 있던 `섹션 추가`를 세
공통 메뉴 컴포넌트에 반영했다. 선택하면 현재 섹션 바로 아래에 사용자 생성 섹션을
만들고 이름 입력을 시작한다. 다음 화면에서 같은 라이브러리 참조와 레이아웃을
확인했다.

- `22 · Workspace · Favorites Menu Open` (`tZZM3`)
- `23 · Workspace · Files Menu Open` (`oPs13`)
- `27 · Workspace · User Section Menu Open` (`PAM02`)

## 상태 완결성

| 화면군 | 기본·빈 상태 | 주요 상호작용 | 오류·확인 |
| --- | --- | --- | --- |
| 새 탭 | `08` 기본, `09` 최근 작업 없음 | 파일 생성·가져오기 진입 | 생성 실패는 해당 인라인 입력에서 유지·재시도 |
| 원고·AI 챗·파일 메모 | `10` 기본, `19` 새 세션 없음 | `11`~`17`, `26`, `82`~`85` | `18` 세션 삭제 확인 |
| 사이드바·탭·휴지통 | `21`~`36` | 메뉴, 탭 넘침·재정렬, 생성·이름 변경·드래그 | `37`, `86`, `87` 확인·실패 |
| 검색 | `38` 기본, `41` 결과 없음 | `39` 입력, `40` 결과 | `42` 오류 |
| 프로젝트·파일 메모 | `43`·`44` 기본, `45`·`46` 빈 상태 | `47`~`49` 생성·메뉴 | `50` 삭제 확인, `51` 저장 오류 |
| 속성 문서 | `52`~`55`, `59`~`62` 기본·빈 상태 | `56`·`57`·`63` 유형 선택·저장 중 | `58`·`64` 저장 오류 |
| 이벤트 시간 흐름 | `65` 기본, `66` 빈 상태 | `67` 선택, `68` 편집 | `69` 삭제 확인, `88` 저장 오류 |
| 프로젝트 설정 | `70` 기본 | `71`~`73` 변경·저장 중·저장 완료 | `74`~`76` 저장 오류·확인 |
| 도움말 | `77` 기본, `89` 검색 결과 없음 | `78`~`80` 주제·본문·외부 이동 | `81` 외부 이동 오류, `90` 본문 불러오기 오류 |

그래프 화면은 동료가 설계하는 별도 후속 범위이며 이 화면 수와 상태 검증에서
제외한다.

## 키보드와 포커스

| 화면군 | 진입과 이동 순서 | 닫기·완료 후 복귀 |
| --- | --- | --- |
| 사이드바와 섹션 메뉴 | 현재 항목에서 시작해 섹션 헤더와 항목 순서로 `Tab`; 열린 메뉴는 방향키, `Home`·`End`, `Enter` 사용 | `Esc`는 메뉴를 연 더보기 버튼으로 복귀; 생성은 새 이름 입력, 삭제 성공은 이동 결과로 복귀 |
| 탭 바와 새 탭 | 활성 탭, 탭 닫기, 새 탭, AI 챗 순서; 탭 목록은 좌우 방향키 | 탭 닫기는 다음 탭, 마지막 탭이면 새 탭 제목으로 복귀 |
| 검색·그래프 | 검색 입력, 필터, 결과 또는 그래프, 상세 행동 순서 | 파일을 열면 제목 또는 마지막 편집 위치로 이동; `Esc`는 그래프 선택을 해제하고 그래프로 복귀 |
| AI 챗·메모 | 세션 선택, 세션 행동, 대화, 입력 순서; 메모는 범위, 추가, 카드 순서 | 패널 닫기는 열기 버튼, 메뉴·대화상자 취소는 원래 행동으로 복귀 |
| 속성 문서·시간 흐름 | 제목, 속성, 추가, 시간 항목, 내용 순서; 시간 항목은 위·아래 방향키 | 편집 취소는 원래 항목, 삭제 성공은 다음·이전 항목 또는 추가 버튼으로 복귀 |
| 설정·도움말 | 설정 입력과 저장 행동 순서; 도움말은 뒤로가기, 검색, 주제, 피드백 순서 | 확인 취소는 마지막 입력·위험 행동, 외부 이동 후에는 피드백 카드로 복귀 |

모든 확인 대화상자는 포커스를 내부에 가두고 기본 포커스를 취소 행동에 둔다.
`Esc`는 변경을 적용하지 않고 대화상자를 연 행동으로 돌려보낸다.

## 비색상 상태 표현

- 선택 상태는 테두리와 체크 아이콘 또는 굵은 레이블을 함께 사용한다.
- 파일 유형과 시간 유형은 아이콘, 유형 이름과 값을 함께 표시한다.
- 저장 중·저장 완료·오류는 상태 아이콘과 문구를 함께 표시한다.
- 오류는 설명과 `다시 시도`를 제공하고 사용자의 입력을 유지한다.
- 위험 행동은 구분선, 행동 이름과 확인 대화상자를 사용한다.
- 외부 이동은 외부 링크 아이콘과 `새 탭에서 열림` 문구를 함께 사용한다.

## 대비와 레이아웃

다크·라이트 모드에서 대표 텍스트, 아이콘과 강조색 조합을 WCAG 명도 대비로
계산했다.

| 조합 | 다크 | 라이트 |
| --- | ---: | ---: |
| 기본 글자 / 기본 표면 | 13.49:1 | 16.52:1 |
| 보조 글자 / 기본 표면 | 6.09:1 | 5.76:1 |
| 아이콘 / 기본 표면 | 8.46:1 | 6.43:1 |
| 강조색 / 기본 표면 | 8.54:1 | 5.86:1 |
| 강조색 위 글자 / 강조색 | 10.14:1 | 5.86:1 |

일반 텍스트 기준 4.5:1과 비텍스트 UI 기준 3:1을 모두 충족한다. Pencil에서 실제로
표시되는 노드만 대상으로 82개 화면을 자동 순회했으며 잘림, 경계 이탈,
의도하지 않은 화면 크기와 남은 placeholder는 모두 0건이다. 비표시 상태의 자식은
레이아웃 결과에 포함하지 않았다.

## 화면 ID 레지스트리

화면 번호와 Pencil 노드 ID는 구현·검수에서 사용하는 고정 식별자다. 20번은 기존
식별자 호환을 위해 비워 두며 뒤 화면을 다시 번호 매기지 않는다.

| 번호 | 화면 | Pencil ID |
| ---: | --- | --- |
| 08 | New Tab · Default | `dtvaQ` |
| 09 | New Tab · No Recent Files | `TMBRe` |
| 10 | Manuscript Editor · Default | `A9Wrm` |
| 11 | Manuscript Editor · AI Chat Open | `iHWvC` |
| 12 | Manuscript Editor · Memo · Work Selected | `BGPNV` |
| 13 | Manuscript Editor · Memo · Manuscript Selected | `dm2JC` |
| 14 | Manuscript Editor · Memo · Below Docked | `GY3eJ` |
| 15 | Manuscript Editor · AI Chat · Session List Open | `azx8U` |
| 16 | Manuscript Editor · AI Chat · Session Menu Open | `qJBRZ` |
| 17 | Manuscript Editor · AI Chat · Session Rename | `W0bpE` |
| 18 | Manuscript Editor · AI Chat · Delete Confirmation | `V3QwF1` |
| 19 | Manuscript Editor · AI Chat · New Session Empty | `RFf3u` |
| 21 | Workspace · Project Switcher Open | `YXcOP` |
| 22 | Workspace · Favorites Menu Open | `tZZM3` |
| 23 | Workspace · Files Menu Open | `oPs13` |
| 24 | Workspace · Tabs Overflow | `Q6a0ol` |
| 25 | Workspace · Tab Reorder | `TeBAK` |
| 26 | Manuscript Editor · Memo Closed · Focus Returned | `sVEg1` |
| 27 | Workspace · User Section Menu Open | `PAM02` |
| 28 | Workspace · File Menu Open | `bleTW` |
| 29 | Workspace · Folder Menu Open | `CVOQc` |
| 30 | Workspace · Trash | `NSDvO` |
| 31 | Workspace · File Create Inline | `jwhkD` |
| 32 | Workspace · Folder Create Inline | `m7kHy` |
| 33 | Workspace · Item Rename Inline | `H9zx7` |
| 34 | Workspace · Item Dragging | `LmEmI` |
| 35 | Workspace · Folder Drop Target | `CMK2T` |
| 36 | Workspace · Favorites Drop Target | `GkSbZ` |
| 37 | Workspace · Trash · Permanent Delete Confirmation | `so8pS` |
| 38 | Workspace · Search · Default | `KVKU8` |
| 39 | Workspace · Search · Input | `GqRoM` |
| 40 | Workspace · Search · Results | `sj1mq` |
| 41 | Workspace · Search · No Results | `gEeY1` |
| 42 | Workspace · Search · Error | `fJm26` |
| 43 | Workspace · Memo · Project | `rWDeP` |
| 44 | Workspace · Memo · File | `o14lL6` |
| 45 | Workspace · Memo · Project Empty | `x8Kpea` |
| 46 | Workspace · Memo · File Empty | `G84QG` |
| 47 | Workspace · Memo · Project New | `RIcSo` |
| 48 | Workspace · Memo · Project Menu Open | `OdGCt` |
| 49 | Workspace · Memo · File Menu Open | `JuOfu` |
| 50 | Workspace · Memo · Delete Confirmation | `d5neDp` |
| 51 | Workspace · Memo · Save Error | `xUHSQ` |
| 52 | Property Document · Setting · Default | `V3E9p` |
| 53 | Property Document · Worldbuilding · Default | `Cr1QM` |
| 54 | Property Document · Place · Default | `A9aCt` |
| 55 | Property Document · Worldbuilding · Empty | `B194Dr` |
| 56 | Property Document · Place · Property Type Open | `Y7tLK` |
| 57 | Property Document · Setting · Saving | `XWX3g` |
| 58 | Property Document · Setting · Save Error | `N05XrO` |
| 59 | Property Document · Character · Default | `S0KR3j` |
| 60 | Property Document · Organization · Default | `HRRGt` |
| 61 | Property Document · Item · Default | `aEeBT` |
| 62 | Property Document · Character · Empty | `ZooEr` |
| 63 | Property Document · Organization · Property Type Open | `R5JCCJ` |
| 64 | Property Document · Item · Save Error | `t3UXM` |
| 65 | Event Timeline · Default | `dCMXt` |
| 66 | Event Timeline · Empty | `PeNqe` |
| 67 | Event Timeline · Selected | `EYGdy` |
| 68 | Event Timeline · Editing | `PmbP9` |
| 69 | Event Timeline · Delete Confirmation | `NcFHe` |
| 70 | Workspace Settings · Default | `EHbKj` |
| 71 | Workspace Settings · Changed | `WFeMQ` |
| 72 | Workspace Settings · Saving | `Mk1yl` |
| 73 | Workspace Settings · Saved | `iEh4S` |
| 74 | Workspace Settings · Save Error | `JfCF1` |
| 75 | Workspace Settings · Unsaved Confirmation | `b5Rlml` |
| 76 | Workspace Settings · Move To Trash Confirmation | `X9umV` |
| 77 | Workspace Help · Default | `Zp4Gq` |
| 78 | Workspace Help · Guide Topics | `p11tW` |
| 79 | Workspace Help · Guide Article | `ZpiZx` |
| 80 | Workspace Help · Feedback Opened | `HIJlb` |
| 81 | Workspace Help · Feedback Open Error | `RxYQ5` |
| 82 | Manuscript Editor · Memo · Right Resized | `o0mGAk` |
| 83 | Manuscript Editor · Memo · Below Resized | `qCzrF` |
| 84 | Manuscript Editor · AI Chat + Memo Below | `peKgW` |
| 85 | Manuscript Editor · Narrow · Memo Collapsed | `B6O42H` |
| 86 | Workspace · User Section Delete Confirmation | `eO5kL` |
| 87 | Workspace · User Section Delete Error | `F9oF1` |
| 88 | Event Timeline · Save Error | `v90GPC` |
| 89 | Workspace Help · Guide Search Empty | `oAP5s` |
| 90 | Workspace Help · Guide Load Error | `i4zE54` |

## frontend 구현 기준

1. `lorekeeper.lib.pen`의 33개 변수를 코드 토큰의 단일 원본으로 사용한다. 의미가
   있는 색상·간격·반경·글자 크기에는 직접값을 새로 만들지 않는다.
2. 92개 라이브러리 컴포넌트의 이름을 코드 컴포넌트와 상태 이름의 기준으로
   사용한다. 화면별 텍스트·아이콘·크기는 속성으로 전달하고 컴포넌트를 복제하지
   않는다.
3. 화면 ID는 Route 목록이 아니라 상태별 시각 기준이다. 하나의 Route나 탭이 기본,
   빈 상태, 상호작용, 저장 상태, 오류와 확인 화면 여러 개에 대응할 수 있다.
4. 화면 전환과 데이터 변경은 각 기능 문서의 Workflow를 따른다. 오류가 발생하면
   입력과 선택 맥락을 유지하고 같은 위치에서 다시 시도할 수 있어야 한다.
5. 다크와 라이트는 같은 DOM 구조와 컴포넌트를 유지하고 `mode` 토큰만 전환한다.
   **구현에서는 화면별 라이트 복제본을 만들지 않는다.** Pencil 문서에 라이트 프레임이
   1:1로 있는 것은 디자인 검토용이다 — 토큰만 바꾼 화면이 실제로 어떻게 보이는지는
   그려 보지 않으면 알 수 없기 때문이고, 그 프레임에서 구현으로 넘어오는 것은 값뿐이다.
   예외는 `color-node-*` 일곱 개로, 라이트에만 분류 색상이 있다.
6. 키보드 순서, 포커스 복귀, 비색상 상태 표현과 대비 기준은 이 문서의 검증 결과를
   완료 조건으로 사용한다.
7. 고정 폭·높이와 화면 전용 안쪽 여백은 화면 구성값이다. 공통 스타일 토큰으로
   승격하지 않으며, 앞서 기록한 직접값 예외만 허용한다.
8. 디자인과 구현이 다를 때 기능 문서의 행동 규칙, 이 문서의 상태표, 해당 Pencil
   화면 ID, 라이브러리 컴포넌트 순서로 기준을 확인한다.

## 범위와 후속 작업

- 이 인계 범위는 데스크톱 통합 작업공간과 파일 편집 화면이다. 로그인, 랜딩,
  프로젝트 목록은 각자의 기존 디자인 문서를 따른다.
- 그래프의 행동·데이터 규칙은 문서에 있지만 시각 디자인은 동료가 담당하는 별도
  후속 Deliverable이다. frontend는 해당 시각안을 받기 전 임의로 그래프를
  디자인하지 않는다.
- 다크·라이트 변수와 Pencil 라이트 프레임은 완료됐다. 모바일·태블릿 전용 레이아웃은
  제공하지 않는다. 테마는 같은 화면 구조의 토큰 전환으로 구현한다 — 라이트 프레임은
  구현 대상이 아니라 값의 검증 자산이다.
- 협업, 멤버·권한, 분할 화면, AI 모델 설정과 파일 유형별 템플릿은 각 기능 문서의
  초기 범위 제외 항목이며 별도 Deliverable로 결정한다.
- frontend 코드 구현, API 계약과 서버 저장·동기화는 디자인 인계 이후의 작업
  이슈에서 수행한다.

## 사용자 확인 기록

사용자 확인은 이 문서의 82개 화면, 33개 변수, 92개 컴포넌트, 상태·접근성 기준과
위 제외 범위를 대상으로 받으며 응답을 `LOREKEEPER-370`에 기록한다.
