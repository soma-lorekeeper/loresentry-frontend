export interface OnboardingStep {
  id:
    | "workspace"
    | "relations"
    | "graph"
    | "timeline"
    | "refresh"
    | "name"
    | "start";
  title: string;
  body: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "workspace",
    title: "작품 하나에\n작업공간 하나",
    body: "회차 원고와 설정 문서가 한 프로젝트에 함께 놓여요.",
  },
  {
    id: "relations",
    title: "속성 표로\n문서를 이어요",
    body: "관련 원고와 장소, 조직을 고르면 그 관계가 그래프와 타임라인이 돼요.",
  },
  {
    id: "graph",
    title: "관계는\n그래프로",
    body: "문서를 고르면 바로 이어진 문서만 밝아져요.",
  },
  {
    id: "timeline",
    title: "누가 몇 화에\n나오는지",
    body: "회차를 열로, 인물과 장소를 행으로 놓고 등장한 회차를 막대로 그려요.",
  },
  {
    id: "refresh",
    title: "새 회차를 쓰면\n그래프 최신화",
    body: "AI가 설정 문서에 바뀔 점을 찾고, 고르는 건 작가예요. 원고는 고치지 않아요.",
  },
  {
    id: "name",
    title: "작가명을\n정해 주세요",
    body: "프로젝트 목록과 작업공간에 보이는 이름이에요.",
  },
  {
    id: "start",
    title: "어디서\n시작할까요?",
    body: "",
  },
];

/**
 * 다시 보기는 안내만 보여 준다. 작가명은 처음 한 번만 정하고, 그 뒤로는 계정 설정에서 바꾼다.
 * 진행 막대는 마지막 "시작 고르기"를 세지 않는다.
 */
export function stepsFor(replay: boolean) {
  return replay
    ? ONBOARDING_STEPS.filter((step) => step.id !== "name")
    : ONBOARDING_STEPS;
}
