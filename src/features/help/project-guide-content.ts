export interface ProjectGuideSection {
  body: string;
  id: string;
  title: string;
}

export interface ProjectGuideTopic {
  description: string;
  id: string;
  keywords: string;
  sections: ProjectGuideSection[];
  title: string;
}

export const projectGuideTopics: ProjectGuideTopic[] = [
  {
    id: "workspace-start",
    title: "작업공간 시작하기",
    description: "프로젝트, 사이드바와 탭의 기본 사용법",
    keywords: "프로젝트 사이드바 탭 시작",
    sections: [
      {
        id: "workspace-overview",
        title: "작업공간 둘러보기",
        body: "왼쪽 사이드바에서 프로젝트와 파일 기능을 찾고, 가운데 영역에서 현재 탭의 내용을 편집합니다. 필요한 경우 오른쪽에 AI 대화나 메모 패널을 열 수 있습니다.",
      },
      {
        id: "workspace-tabs",
        title: "탭으로 이동하기",
        body: "사이드바 항목을 선택하면 이미 열린 탭으로 이동하거나 새 탭을 엽니다. 탭 이름과 선택 표시를 함께 확인해 현재 위치를 놓치지 않도록 합니다.",
      },
      {
        id: "workspace-next",
        title: "첫 기록 시작하기",
        body: "새 파일을 만든 뒤 제목과 본문을 작성하세요. 저장 상태가 완료로 바뀐 것을 확인한 다음 다른 탭으로 이동하면 됩니다.",
      },
    ],
  },
  {
    id: "files-properties",
    title: "파일과 속성 문서",
    description: "파일을 만들고 정보를 구조화하는 방법",
    keywords: "파일 폴더 속성",
    sections: [
      {
        id: "files-create",
        title: "파일 만들기",
        body: "파일 섹션의 추가 메뉴에서 원하는 문서 유형을 선택합니다. 새 파일은 현재 프로젝트 안에 만들어지며 이름을 바로 편집할 수 있습니다.",
      },
      {
        id: "files-properties",
        title: "속성 정리하기",
        body: "인물, 장소와 사건 문서의 속성 행에 값을 입력해 설정을 구조화합니다. 파일 참조 속성은 같은 프로젝트의 관련 문서를 연결합니다.",
      },
      {
        id: "files-organize",
        title: "폴더로 정리하기",
        body: "폴더를 만들고 파일을 이동해 긴 목록을 정리하세요. 즐겨찾기에는 자주 여는 문서만 모아 둘 수 있습니다.",
      },
    ],
  },
  {
    id: "manuscript",
    title: "원고 작성",
    description: "원고 편집, 저장 상태와 버전 관리",
    keywords: "원고 편집 저장 버전",
    sections: [
      {
        id: "manuscript-write",
        title: "본문 작성하기",
        body: "원고 파일을 열면 제목 아래의 편집 영역에서 본문을 작성할 수 있습니다. 문단 사이의 흐름을 확인하며 한 장면씩 기록하세요.",
      },
      {
        id: "manuscript-save",
        title: "저장 상태 확인하기",
        body: "편집 중에는 저장 상태가 화면에 표시됩니다. 저장 오류가 나타나면 입력한 내용은 유지되므로 같은 위치에서 다시 시도할 수 있습니다.",
      },
      {
        id: "manuscript-memo",
        title: "메모와 함께 쓰기",
        body: "원고를 떠나지 않고 메모 패널을 열어 장면의 목적이나 수정할 내용을 적을 수 있습니다.",
      },
    ],
  },
  {
    id: "search-graph",
    title: "검색과 그래프",
    description: "필요한 기록과 연결 관계를 찾는 방법",
    keywords: "검색 그래프 연결",
    sections: [
      {
        id: "search-query",
        title: "프로젝트 검색하기",
        body: "검색에서 제목과 본문에 포함된 단어를 입력하면 일치하는 파일과 메모를 함께 확인할 수 있습니다.",
      },
      {
        id: "search-results",
        title: "결과로 이동하기",
        body: "결과의 종류와 위치를 확인한 뒤 선택하면 해당 문서가 새 탭으로 열립니다. 검색어는 탭 안에 유지됩니다.",
      },
      {
        id: "search-graph",
        title: "연결 관계 살펴보기",
        body: "그래프에서는 파일 사이의 참조를 시각적으로 탐색합니다. 선택한 항목의 연결만 좁혀 보면 설정의 빈틈을 찾기 쉽습니다.",
      },
    ],
  },
  {
    id: "memo-timeline",
    title: "메모와 시간 흐름",
    description: "아이디어와 사건 순서를 함께 관리하기",
    keywords: "메모 시간 흐름 사건",
    sections: [
      {
        id: "memo-capture",
        title: "아이디어 기록하기",
        body: "프로젝트 메모에는 작품 전체의 아이디어를, 파일 메모에는 현재 문서에 관한 생각을 기록합니다.",
      },
      {
        id: "memo-scope",
        title: "메모 범위 구분하기",
        body: "메모 카드의 범위와 연결 파일을 확인하면 같은 제목의 메모도 어떤 문맥에서 작성했는지 구분할 수 있습니다.",
      },
      {
        id: "memo-timeline",
        title: "사건 순서 정리하기",
        body: "사건의 날짜나 정렬 순서를 편집해 이야기의 시간 흐름을 구성합니다. 날짜가 없는 사건도 별도 순서로 배치할 수 있습니다.",
      },
    ],
  },
  {
    id: "trash-restore",
    title: "휴지통과 복원",
    description: "삭제한 파일과 프로젝트를 안전하게 관리하기",
    keywords: "삭제 휴지통 복원",
    sections: [
      {
        id: "trash-move",
        title: "휴지통으로 이동하기",
        body: "삭제가 필요한 항목은 먼저 휴지통으로 이동합니다. 확인 대화상자에서 대상 이름과 복원 가능 여부를 확인하세요.",
      },
      {
        id: "trash-restore",
        title: "다시 복원하기",
        body: "휴지통에서 복원을 선택하면 항목이 원래 프로젝트로 돌아갑니다. 처리 오류가 생겨도 대상은 휴지통에 유지됩니다.",
      },
      {
        id: "trash-delete",
        title: "영구 삭제하기",
        body: "영구 삭제는 되돌릴 수 없습니다. 별도 확인을 거친 뒤 처리하며, 완료 전에는 대화상자를 닫거나 요청을 반복할 수 없습니다.",
      },
    ],
  },
];

export function findProjectGuideTopic(topicId?: string | null) {
  return projectGuideTopics.find((topic) => topic.id === topicId);
}
