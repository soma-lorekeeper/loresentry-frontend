export interface OnboardingStep {
  id: "workspace" | "relations" | "graph" | "timeline" | "refresh" | "start";
  title: string;
  body: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "workspace",
    title: "작품 하나에\n작업공간 하나",
    body: "프로젝트를 열면 왼쪽 파일에 회차 원고와 캐릭터·장소·조직 같은 설정 문서가 함께 놓여요. 원고, 설정, 메모, AI 대화는 이 프로젝트 안에서만 오가요.",
  },
  {
    id: "relations",
    title: "설정 문서의\n속성 표로 잇기",
    body: "설정 문서의 속성 표에서 관련 원고와 장소, 조직을 골라 연결해요. 이렇게 이어 둔 관계가 그래프와 타임라인의 근거가 돼요.",
  },
  {
    id: "graph",
    title: "관계는\n그래프로 보여요",
    body: "문서는 노드, 관계는 선이 돼요. 노드를 고르면 바로 이어진 문서만 밝아지고, 에피소드 범위와 문서 유형으로 걸러 볼 수 있어요.",
  },
  {
    id: "timeline",
    title: "누가 몇 화에\n나오는지 타임라인으로",
    body: "회차를 열로, 인물과 장소를 행으로 놓고 연결된 회차를 막대로 그려요. 에피소드를 골라 범위를 좁힐 수도 있어요.",
  },
  {
    id: "refresh",
    title: "새 회차를 쓰면\n그래프 최신화",
    body: "AI가 새 원고를 읽고 설정 문서에 바뀔 점을 찾아요. 현재 버전과 신규 버전을 나란히 보고 항목마다 고르면 돼요. AI는 원고를 고치지 않아요.",
  },
  {
    id: "start",
    title: "어디서\n시작할까요?",
    body: "예시 프로젝트에서 지금 본 화면을 직접 눌러 보거나, 빈 프로젝트에서 첫 원고를 쓸 수 있어요. 이 안내는 사용 가이드에서 언제든 다시 볼 수 있어요.",
  },
];

/** 진행 막대가 세는 설명 단계 수. 마지막 "시작 고르기"는 세지 않는다. */
export const TOUR_LENGTH = ONBOARDING_STEPS.length - 1;
