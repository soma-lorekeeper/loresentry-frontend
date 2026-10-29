import type { DocumentType } from "@/domain/document-types";
import type { DocumentNode, FileNode, FolderNode } from "@/domain/models";
import type {
  SettingCheckRun,
  SettingCheckSummary,
} from "@/domain/setting-check";

export interface LedgerGroup {
  id: string;
  /** 에피소드 폴더. 원고 폴더 바로 아래 회차는 null 이다 */
  episode: FolderNode | null;
  chapters: DocumentNode[];
}

/**
 * 원고 회차를 에피소드별로 묶는다. 파일 트리의 순서를 뒤집어 최근 에피소드·최근 회차가 위에 온다 —
 * 작가가 점검하는 것은 대개 방금 쓴 회차다.
 */
export function ledgerGroups(nodes: readonly FileNode[]): LedgerGroup[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const groups: LedgerGroup[] = [];
  for (const node of nodes) {
    if (node.kind !== "document" || node.docType !== "manuscript") continue;
    const parent = node.parentId ? byId.get(node.parentId) : undefined;
    const episode =
      parent?.kind === "folder" && parent.role === "episode" ? parent : null;
    const id = episode?.id ?? `root:${node.parentId ?? ""}`;
    const last = groups[groups.length - 1];
    if (last && last.id === id) last.chapters.push(node);
    else groups.push({ id, episode, chapters: [node] });
  }
  return groups
    .reverse()
    .map((group) => ({ ...group, chapters: [...group.chapters].reverse() }));
}

export type ChapterStatus =
  | { kind: "running"; run: SettingCheckRun }
  | { kind: "unchecked" }
  | { kind: "changed"; run: SettingCheckRun }
  | { kind: "open"; run: SettingCheckRun }
  | { kind: "intended"; run: SettingCheckRun }
  | { kind: "clean"; run: SettingCheckRun }
  | { kind: "failed"; run: SettingCheckRun }
  | { kind: "cancelled"; run: SettingCheckRun };

/**
 * 회차 줄의 상태. 점검한 판보다 회차가 새로우면 결과가 무엇이든 "점검 뒤 고침" 이다 — 그 결과는
 * 지금 원고에 대한 것이 아니다.
 */
export function chapterStatus(
  documentId: string,
  revisionNo: number,
  summary: SettingCheckSummary | undefined,
): ChapterStatus {
  const running = summary?.running;
  if (running?.documentId === documentId)
    return { kind: "running", run: running };
  const latest = summary?.chapters.find(
    (chapter) => chapter.documentId === documentId,
  )?.latest;
  if (!latest) return { kind: "unchecked" };
  switch (latest.status) {
    case "RUNNING":
      return { kind: "running", run: latest };
    case "FAILED":
      return { kind: "failed", run: latest };
    case "CANCELLED":
      return { kind: "cancelled", run: latest };
    case "DONE":
      if (revisionNo > latest.revisionNo)
        return { kind: "changed", run: latest };
      if (latest.counts.open > 0) return { kind: "open", run: latest };
      if (latest.counts.intended > 0) return { kind: "intended", run: latest };
      return { kind: "clean", run: latest };
  }
}

/** 사이드바 배지. 회차마다 최신 점검이 끝났으면 그 "확인할 것" 을 더한다 */
export function openCount(summary: SettingCheckSummary | undefined): number {
  return (summary?.chapters ?? []).reduce(
    (sum, chapter) =>
      chapter.latest.status === "DONE" ? sum + chapter.latest.counts.open : sum,
    0,
  );
}

/**
 * 처음 화면의 지난 점검. 회차마다 가장 최근 점검을 최근 순으로 놓고, 휴지통에 간 회차는 뺀다.
 * 도는 점검이 요약의 회차 목록보다 새로우면 그것이 그 회차의 줄이 된다.
 */
export function historyOf(
  summary: SettingCheckSummary | undefined,
  chapters: readonly DocumentNode[],
): Array<{ chapter: DocumentNode; run: SettingCheckRun }> {
  const byId = new Map(chapters.map((chapter) => [chapter.id, chapter]));
  const latest = new Map<string, SettingCheckRun>();
  for (const { documentId, latest: run } of summary?.chapters ?? [])
    latest.set(documentId, run);
  const running = summary?.running;
  if (running) latest.set(running.documentId, running);
  return [...latest.values()]
    .filter((run) => byId.has(run.documentId))
    .sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id),
    )
    .map((run) => ({ chapter: byId.get(run.documentId)!, run }));
}

/** 회차의 가장 최근 점검. 도는 점검이 있으면 그것이다 */
export function latestRun(
  summary: SettingCheckSummary | undefined,
  documentId: string,
): SettingCheckRun | null {
  if (summary?.running?.documentId === documentId) return summary.running;
  return (
    summary?.chapters.find((chapter) => chapter.documentId === documentId)
      ?.latest ?? null
  );
}

/** "12화 · 균열의 밤" 처럼 회차 번호가 앞에 붙은 원고 제목은 번호만 쓴다 */
export function shortTitle(title: string, docType: DocumentType): string {
  if (docType !== "manuscript") return title;
  const [head] = title.split(" · ");
  return head && head !== title ? head : title;
}
