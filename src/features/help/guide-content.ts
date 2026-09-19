import type { IconName } from "@/design-system/icons/icon";

export interface GuideSection {
  id: string;
  title: string;
  body: string;
}

export interface GuideTopic {
  id: string;
  icon: IconName;
  title: string;
  summary: string;
  lead: string;
  updatedAt: string;
  readMinutes: number;
  facts: Array<{ label: string; value: string }>;
  sections: GuideSection[];
  related: string[];
}

export const GUIDE_TOPICS: GuideTopic[] = [
  {
    id: "start",
    icon: "rocket",
    title: "작업공간 시작하기",
    summary: "프로젝트 생성부터 첫 원고까지",
    lead: "프로젝트는 이야기의 원고, 설정, 인물, 메모를 한곳에 모아두는 작업 공간입니다.",
    updatedAt: "2026-08-30",
    readMinutes: 2,
    facts: [
      { label: "시작하는 곳", value: "프로젝트 목록" },
      { label: "필요한 것", value: "프로젝트 제목" },
      { label: "저장", value: "자동 저장" },
    ],
    sections: [
      {
        id: "choose",
        title: "새 프로젝트 선택",
        body: "프로젝트 목록의 첫 카드에서 새 이야기를 시작합니다.",
      },
      {
        id: "name",
        title: "프로젝트 이름 입력",
        body: "작업을 구분하기 쉬운 이름을 입력하고 생성합니다.",
      },
      {
        id: "write",
        title: "첫 원고 작성",
        body: "작업공간에서 원고를 만들고 자동 저장 상태를 확인합니다.",
      },
    ],
    related: ["files", "writing"],
  },
  {
    id: "files",
    icon: "file-text",
    title: "파일과 속성 문서",
    summary: "자료를 구조화하고 연결하기",
    lead: "설정·세계관·장소 같은 문서는 제목, 사용자 정의 속성, 내용으로 구성됩니다.",
    updatedAt: "2026-08-30",
    readMinutes: 2,
    facts: [
      { label: "문서 종류", value: "속성 문서" },
      { label: "만드는 곳", value: "사이드바 파일 영역" },
      { label: "저장", value: "자동 저장" },
    ],
    sections: [
      {
        id: "create",
        title: "파일 만들기",
        body: "사이드바 파일 영역의 더보기에서 원하는 파일을 만듭니다.",
      },
      {
        id: "property",
        title: "속성 추가하기",
        body: "속성 추가를 선택하고 텍스트나 다른 파일 참조 형식을 고릅니다.",
      },
      {
        id: "link",
        title: "파일 연결하기",
        body: "원고·설정·세계관·장소 등 프로젝트 안의 파일을 서로 연결할 수 있습니다.",
      },
      {
        id: "status",
        title: "저장 상태 확인",
        body: "편집 내용은 상단 상태에서 저장 중, 저장됨, 오류로 확인합니다.",
      },
    ],
    related: ["writing", "explore"],
  },
  {
    id: "writing",
    icon: "pen-line",
    title: "원고 작성",
    summary: "집중해서 쓰고 저장 상태 확인하기",
    lead: "원고는 제목과 서식 있는 본문으로 구성되며, 저장 버튼 없이 자동으로 저장됩니다.",
    updatedAt: "2026-08-30",
    readMinutes: 3,
    facts: [
      { label: "문서 종류", value: "원고" },
      { label: "만드는 곳", value: "원고 폴더와 에피소드" },
      { label: "저장", value: "자동 저장 · 버전 기록" },
    ],
    sections: [
      {
        id: "episode",
        title: "에피소드 만들기",
        body: "원고 폴더에서 에피소드를 만들고 그 안에 회차 원고를 둡니다.",
      },
      {
        id: "format",
        title: "서식 사용하기",
        body: "도구 막대에서 굵게, 기울임, 목록, 들여쓰기를 적용합니다.",
      },
      {
        id: "find",
        title: "찾기와 바꾸기",
        body: "찾기·바꾸기로 반복되는 표현을 한 번에 고칩니다.",
      },
      {
        id: "version",
        title: "버전 되돌리기",
        body: "버전 기록에서 과거 상태를 현재 문서와 비교하고 복원합니다.",
      },
    ],
    related: ["files", "memo"],
  },
  {
    id: "explore",
    icon: "search",
    title: "검색과 그래프",
    summary: "프로젝트 전체를 탐색하기",
    lead: "검색은 제목과 본문을, 그래프는 문서 사이에 명시한 관계를 보여 줍니다.",
    updatedAt: "2026-08-30",
    readMinutes: 2,
    facts: [
      { label: "검색 대상", value: "활성 원고·설정 문서" },
      { label: "그래프 근거", value: "속성 표의 관계" },
      { label: "복원", value: "카메라·필터·선택 노드" },
    ],
    sections: [
      {
        id: "search",
        title: "문서 검색하기",
        body: "사이드바의 검색에서 제목과 본문을 함께 찾습니다.",
      },
      {
        id: "graph",
        title: "그래프 둘러보기",
        body: "노드를 선택하면 직접 연결된 문서가 강조됩니다.",
      },
      {
        id: "filter",
        title: "필터와 에피소드",
        body: "분류 필터와 에피소드 범위로 보고 싶은 관계만 남깁니다.",
      },
    ],
    related: ["files", "memo"],
  },
  {
    id: "memo",
    icon: "sticky-note",
    title: "메모와 타임라인",
    summary: "아이디어와 사건 순서 관리하기",
    lead: "메모는 프로젝트 전체나 파일 하나에 남기고, 타임라인은 회차별 등장을 한눈에 보여 줍니다.",
    updatedAt: "2026-08-30",
    readMinutes: 2,
    facts: [
      { label: "메모 범위", value: "프로젝트 · 파일" },
      { label: "타임라인 축", value: "문서 × 회차" },
      { label: "저장", value: "자동 저장" },
    ],
    sections: [
      {
        id: "project-memo",
        title: "프로젝트 메모",
        body: "사이드바의 메모에서 프로젝트 전체에 대한 메모를 여러 개 남깁니다.",
      },
      {
        id: "file-memo",
        title: "파일 메모",
        body: "파일 머리의 메모 버튼으로 문서 옆이나 아래에 메모 패널을 엽니다.",
      },
      {
        id: "timeline",
        title: "타임라인 읽기",
        body: "행은 설정 문서, 열은 회차입니다. 막대가 이어진 구간이 등장 구간입니다.",
      },
    ],
    related: ["writing", "explore"],
  },
  {
    id: "trash",
    icon: "trash-2",
    title: "휴지통과 복원",
    summary: "삭제한 항목을 안전하게 복원하기",
    lead: "삭제한 파일과 프로젝트는 휴지통에 보관되며, 복원하거나 확인 후 영구 삭제할 수 있습니다.",
    updatedAt: "2026-08-30",
    readMinutes: 1,
    facts: [
      { label: "보관 위치", value: "프로젝트별 휴지통" },
      { label: "복원 위치", value: "원래 위치" },
      { label: "영구 삭제", value: "확인 후 삭제" },
    ],
    sections: [
      {
        id: "move",
        title: "휴지통으로 이동",
        body: "파일 메뉴나 카드 메뉴에서 휴지통으로 이동합니다.",
      },
      {
        id: "restore",
        title: "복원하기",
        body: "원래 위치가 사라졌다면 파일 영역 최상위로 돌아옵니다.",
      },
      {
        id: "delete",
        title: "영구 삭제",
        body: "영구 삭제한 항목은 다시 복원할 수 없습니다.",
      },
    ],
    related: ["files", "start"],
  },
];

export function findTopic(topicId: string | null) {
  return GUIDE_TOPICS.find((topic) => topic.id === topicId) ?? null;
}

export function searchTopics(query: string, topics = GUIDE_TOPICS) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return topics;
  return topics.filter((topic) =>
    [
      topic.title,
      topic.summary,
      topic.lead,
      ...topic.sections.map((s) => `${s.title} ${s.body}`),
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(needle),
  );
}
