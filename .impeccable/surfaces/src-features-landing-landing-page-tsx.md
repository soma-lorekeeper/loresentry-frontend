---
version: 1
slug: "src-features-landing-landing-page-tsx"
primary_target: "src/features/landing/landing-page.tsx"
related_targets: ["src/app/page.tsx"]
---

# Landing (`/`)

Scope: 첫 방문자용 공개 랜딩. Visitor mode: Persuade.

Audience: 웹소설 연재 작가. Action: Google로 시작하기(로그인), 헤더의 서비스 소개·기능·AI 최신화·문의하기. Proof: 실제 앱 화면(시드 "유리 정원의 기록"), SW마에스트로 소속. 후기·수치 없음. Constraints: AI 최신화·AI 챗은 서버 준비 중이므로 "준비 중"을 숨기지 않는다. 앱 로고·문서 종류 색 유지, 현재 UI 결을 확장.

## Direction contract

THESIS: 원고 속 이름 "레나 아르벨" 하나에서 캐릭터 색 실이 내려와, 에디터 → 문서 관리 → 속성 표 → 그래프 → 타임라인 → AI 최신화를 차례로 꿰는 세로 서사. 기능 카드 그리드와 좌우 교대 스크린샷 나열을 거부한다.
OWN-WORLD: 앱 토큰(--lk-*) 그대로, 연회색 바닥과 흰 창, 2px 모서리, Geist UI. 헤드라인만 Wanted Sans 800. 문서 종류 색이 유일한 채색이고 실은 캐릭터 색 2.5px 곡선. 실제 작업공간 창(AppWindow)을 축소해 쓴다.
STORY: 작가는 이곳이 쓰는 곳이자 설정이 이어지는 곳임을 이해하고, 이은 것만 관계가 되며 AI는 제안만 한다고 믿고, Google로 시작한다.
FIRST VIEWPORT: 헤더(로고, 메뉴 4, 로그인·시작하기). 가운데 70px 헤드라인 두 줄, 설명 두 줄, CTA 두 개. 그 아래 폭 1000 기준 에디터 창이 화면 아래로 걸치고, 마지막 문단이 타이핑되며 "레나 아르벨"이 파랗게 밝아지고 실이 시작된다.
FORM: 한 인물 따라가기(surface 후보 중 dealt #2, 사용자 선택), seed key b61f667a. 시그니처: 스크롤로 그려지는 실이 닿는 순간 그 창의 장면이 재생된다.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
