export interface TrashedProjectSummary {
  id: string;
  title: string;
  trashedAt: string;
  trashedAtLabel: string;
}

export const trashedProjectFixtures: TrashedProjectSummary[] = [
  {
    id: "paper-moon",
    title: "종이 달 아래의 약속",
    trashedAt: "2026-09-03T03:20:00.000Z",
    trashedAtLabel: "2026년 9월 3일 오후 12:20",
  },
  {
    id: "summer-archive",
    title: "여름 끝의 기록",
    trashedAt: "2026-09-01T09:10:00.000Z",
    trashedAtLabel: "2026년 9월 1일 오후 6:10",
  },
  {
    id: "silent-station",
    title: "침묵의 정거장",
    trashedAt: "2026-08-28T15:40:00.000Z",
    trashedAtLabel: "2026년 8월 29일 오전 12:40",
  },
];

export function sortTrashedProjects(
  projects: TrashedProjectSummary[],
): TrashedProjectSummary[] {
  return [...projects].sort(
    (left, right) =>
      right.trashedAt.localeCompare(left.trashedAt) ||
      left.title.localeCompare(right.title, "ko"),
  );
}
