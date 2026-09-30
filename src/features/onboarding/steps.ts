export interface OnboardingStep {
  id: "projects" | "write" | "graph" | "refresh" | "start";
  title: string;
  body: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "projects",
    title: "이야기마다\n프로젝트를 하나씩",
    body: "작품마다 프로젝트를 만들어요. 원고, 설정 문서, 메모, AI 대화는 프로젝트 안에서만 오가서 다른 작품과 섞이지 않아요.",
  },
  {
    id: "write",
    title: "원고를 쓰고,\n설정을 곁에 두세요",
    body: "회차 원고는 에피소드로 묶고, 인물·장소·아이템은 설정 문서로 정리해요. 설정 문서의 속성 표에서 다른 문서를 골라 관계를 이어 주세요.",
  },
  {
    id: "graph",
    title: "이어 둔 관계는\n그래프와 타임라인이 돼요",
    body: "관계를 이어 두면 그래프에서 인물과 장소가 어떻게 얽혀 있는지 한눈에 보여요. 타임라인에서는 누가 몇 화에 등장하는지 막대로 읽을 수 있어요.",
  },
  {
    id: "refresh",
    title: "새 회차를 쓰면\nAI가 설정을 챙겨요",
    body: "그래프 최신화를 누르면 AI가 새 원고를 읽고 설정 문서에 바뀔 점을 제안해요. 무엇을 반영할지는 직접 고르고, 원고는 AI가 고치지 않아요.",
  },
  {
    id: "start",
    title: "어디서\n시작할까요?",
    body: "예시 프로젝트에서 지금 본 기능을 직접 눌러 보거나, 빈 프로젝트에서 첫 원고를 쓸 수 있어요. 이 안내는 사용 가이드에서 언제든 다시 볼 수 있어요.",
  },
];

/** 진행 막대가 세는 설명 단계 수. 마지막 "시작 고르기"는 세지 않는다. */
export const TOUR_LENGTH = ONBOARDING_STEPS.length - 1;
