---
version: 1
slug: "src-features-workspace-shell-workspace-shell-tsx"
primary_target: "src/features/workspace/shell/workspace-shell.tsx"
related_targets: ["src/features/projects/project-shell.tsx","src/features/documents/document-view.tsx","src/features/auth/login-page.tsx","src/features/onboarding/onboarding-page.tsx"]
---

# App surfaces (projects, workspace, documents, login, onboarding)

Scope: 로그인 뒤 앱 전체와 로그인·온보딩. Visitor mode: Operate (온보딩은 짧은 Persuade 성격). 사용자 선택: 미리보기 후보 A "종류의 색"(2026-10-06), 배치·문구는 유지하되 불필요한 UI·텍스트는 걷어냄.

## Direction contract

THESIS: 회색 책상 위에 흰 작업 면 한 장이 뜨고, 문서는 제 종류의 색을 옅게 두른다. 선으로 나눈 상자 더미와 아이콘 타일 카드를 거부한다.
OWN-WORLD: Pencil 토큰(--lk-*)과 elevation.css 그림자. 책상 #eceef1 / #121517, 시트 흰색 / #1c2023, 안쪽 면 sunken, 고른 항목은 pill+그림자. Pretendard 본문, Wanted Sans 800 제목. 종류 색(data-kind → --kind)이 유일한 채색이고 청록은 행동·포커스에만.
STORY: 작가는 지금 무엇을 고쳤고 어디에 있는지 한눈에 알고, 군더더기 문구 없이 쓰기와 잇기에 집중한다.
FIRST VIEWPORT: 작업공간 — 왼쪽 책상 위 사이드바(프로젝트 전환 pill, 파일 트리), 오른쪽 둥근 흰 시트(탭 막대, 한 줄 도구 막대에 파일 도구 아이콘, 문서 제목 앞 종류 색 점, 종류 색을 깐 속성 표).
FORM: 미리보기 후보 A(구조 후보 중 선택), seed key ba125719. 시그니처: 온보딩 카메라가 설명하는 자리로 창 안을 당겨 온다.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
