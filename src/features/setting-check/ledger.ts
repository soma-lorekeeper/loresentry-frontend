import type { DocumentType } from "@/domain/document-types";
import type { DocumentNode, FileNode, FolderNode } from "@/domain/models";
import type {
  SettingCheckRead,
  SettingCheckRun,
  SettingCheckStage,
  SettingCheckSummary,
} from "@/domain/setting-check";
import { t } from "@/i18n";

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

/** 처음 열 때 고를 회차: 점검 중인 회차, 가장 최근에 점검한 회차, 맨 위 회차 순이다 */
export function defaultChapter(
  chapters: readonly DocumentNode[],
  summary: SettingCheckSummary | undefined,
): string | null {
  const ids = new Set(chapters.map((chapter) => chapter.id));
  if (summary?.running && ids.has(summary.running.documentId))
    return summary.running.documentId;
  const recent = [...(summary?.chapters ?? [])]
    .filter((chapter) => ids.has(chapter.documentId))
    .sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt))[0];
  return recent?.documentId ?? chapters[0]?.id ?? null;
}

/** "12화 · 균열의 밤" 처럼 회차 번호가 앞에 붙은 원고 제목은 번호만 쓴다 */
export function shortTitle(title: string, docType: DocumentType): string {
  if (docType !== "manuscript") return title;
  const [head] = title.split(" · ");
  return head && head !== title ? head : title;
}

export function stageLabel(stage: SettingCheckStage | null): string {
  if (stage === "FINDING") return t("어긋남 찾는 중");
  if (stage === "JUDGING") return t("다시 확인하는 중");
  return t("앞 회차 읽는 중");
}

function rangeLabel(read: SettingCheckRead) {
  const from = read.fromOrdinal || 1;
  const to = read.toOrdinal || read.manuscripts;
  return from === to
    ? t("{number}화", { number: from })
    : t("{from}–{to}화", { from, to });
}

/** 무엇을 읽었는지. "찾지 않은 것" 과 "없는 것" 을 가르는 줄이다 */
export function readLabel(read: SettingCheckRead, reading = false): string {
  if (read.manuscripts > 0)
    return reading
      ? t("{range}와 설정 문서 {count}개를 읽고 있어요.", {
          range: rangeLabel(read),
          count: read.settings,
        })
      : t("{range}와 설정 문서 {count}개를 읽었어요", {
          range: rangeLabel(read),
          count: read.settings,
        });
  return reading
    ? t("설정 문서 {count}개를 읽고 있어요.", { count: read.settings })
    : t("설정 문서 {count}개를 읽었어요", { count: read.settings });
}

export function readStarted(read: SettingCheckRead) {
  return read.settings > 0 || read.manuscripts > 0;
}
