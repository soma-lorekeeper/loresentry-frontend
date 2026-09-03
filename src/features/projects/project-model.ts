export interface ProjectSummary {
  id: string;
  lastActiveAt: string;
  lastActiveLabel: string;
  lastFileName?: string;
  title: string;
}

export const projectFixtureIds = [
  "glass-garden",
  "winter-letter",
  "orbit-record",
] as const;

export type ProjectFixtureId = (typeof projectFixtureIds)[number];

export const PROJECT_TITLE_MAX_LENGTH = 255;

export type ProjectTitleError = "required" | "too-long";

export function validateProjectTitle(
  title: string,
): ProjectTitleError | undefined {
  const normalized = title.trim();
  if (!normalized) return "required";
  if (normalized.length > PROJECT_TITLE_MAX_LENGTH) return "too-long";
  return undefined;
}

export const projectFixtures = [
  {
    id: "glass-garden",
    lastActiveAt: "2026-09-03T02:48:00.000Z",
    lastActiveLabel: "12분 전 마지막 작업",
    lastFileName: "제17장_돌아오지_않는_밤",
    title: "별빛 아래 마지막 약속 — 장편 프로젝트",
  },
  {
    id: "winter-letter",
    lastActiveAt: "2026-09-02T14:00:00.000Z",
    lastActiveLabel: "어제 마지막 작업",
    lastFileName: "등장인물_관계도",
    title: "겨울 숲에서 온 편지",
  },
  {
    id: "orbit-record",
    lastActiveAt: "2026-08-29T09:30:00.000Z",
    lastActiveLabel: "5일 전 마지막 작업",
    title: "궤도 도시 기록",
  },
] satisfies Array<ProjectSummary & { id: ProjectFixtureId }>;

export function sortProjects(projects: ProjectSummary[]): ProjectSummary[] {
  return [...projects].sort(
    (left, right) =>
      right.lastActiveAt.localeCompare(left.lastActiveAt) ||
      left.title.localeCompare(right.title, "ko"),
  );
}
