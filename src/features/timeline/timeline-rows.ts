/**
 * 타임라인 표의 데이터.
 *
 * 축이 **엔티티 × 회차**다. 한 줄이 인물·장소·사물 하나이고, 가로로 회차가 흐른다.
 *
 * 회차를 세로축으로 두었던 예전 설계(어항)를 버린 이유는 두 가지다.
 *
 *  1) **회차 문서와 겹친다.** "이 회차에 누가 나왔나"는 회차 문서의 관련 인물·장소·
 *     사물 줄이 이미 답한다. 회차를 축으로 삼으면 그 목록을 그림으로 다시 그리는 셈이다.
 *  2) **시간을 못 읽는다.** 타임라인에서만 답할 수 있는 질문은 "이 인물이 언제
 *     들어와서 언제 사라졌나", "이 설정을 깔아놓고 몇 화째 안 건드렸나"인데, 회차가
 *     축이면 한 노드의 자취가 여러 칸에 흩어져 보이지 않는다.
 *
 * 축을 뒤집으면 이름을 **왼쪽에 한 번만** 쓰게 되는 이득도 따라온다. 회차마다 이름을
 * 되풀이하지 않으니 이름이 겹칠 자리가 아예 없고, 칸 안에는 막대만 남는다.
 */

import {
  DOCUMENT_TYPE_META,
  SETTING_DOCUMENT_TYPES,
} from "@/domain/document-types";
import type { GraphNode, ProjectGraph } from "@/domain/models";
import { buildAdjacency } from "@/features/graph/engine/adjacency";
import type { NodeKind } from "@/features/graph/engine/types";

/** 에피소드가 배정되지 않은 회차 구간에 붙이는 이름 */
export const UNASSIGNED_EPISODE = "(에피소드 없음)";

/** 회차 하나 = 표의 열 하나 */
export interface TimelineColumn {
  chapterId: string;
  /** 회차 순번(0부터). 실험 레포의 회차 번호 자리다 */
  number: number;
  /** "5화". 원고 제목의 " · " 앞부분이고, 없으면 제목 전체다 */
  name: string;
  title: string;
}

/** 연속으로 등장한 구간. 열 순번이고 양 끝을 포함한다 */
export interface Run {
  from: number;
  to: number;
}

/** 엔티티 하나 = 표의 줄 하나 */
export interface TimelineRow {
  nodeId: string;
  name: string;
  kind: NodeKind;
  /** 이 노드가 나온 열 순번들. 오름차순 */
  columns: number[];
  /** 연속 등장을 묶은 막대들 */
  runs: Run[];
  /** 첫 등장과 마지막 등장. 그 사이의 공백을 옅은 선으로 잇는다 */
  first: number;
  last: number;
}

/**
 * 폴더의 신원.
 *
 * 예전에는 분류가 곧 폴더였다. 즐겨찾기 폴더가 생기면서 둘을 갈랐다 — 즐겨찾기는
 * 분류를 가로질러 담으므로 `NodeKind` 로는 가리킬 수 없다.
 */
export type GroupId = NodeKind | "favorites";

/** 즐겨찾기 폴더의 신원. 분류 이름과 겹치지 않으면 된다 */
export const FAVORITES_GROUP = "favorites";

/** 표에서 접었다 펼 수 있는 단위 */
export interface TimelineGroup {
  id: GroupId;
  /**
   * 폴더 아이콘 색을 정하는 분류. 즐겨찾기는 분류가 없어 null 이고, 그때는
   * 자기 색(--favorite)을 쓴다 — 일곱 파스텔 중 하나를 빌리면 "이건 무슨
   * 분류지"로 읽힌다.
   */
  kind: NodeKind | null;
  label: string;
  rows: TimelineRow[];
}

/** 에피소드 구간. 열 머리글 위에 띠로 얹고 세로 구분선을 긋는다 */
export interface EpisodeSpan {
  episodeId: string | null;
  name: string;
  /** 양 끝을 포함하는 열 순번 */
  from: number;
  to: number;
}

export interface TimelineTable {
  columns: TimelineColumn[];
  groups: TimelineGroup[];
  episodes: EpisodeSpan[];
  /** 줄 수 합계. 계측 줄이 쓴다 */
  rowCount: number;
}

/**
 * 이어진 열 순번을 막대로 묶는다.
 *
 * `[1,2,3,7,8]` 이면 `[{1,3}, {7,8}]` 이다. 사이가 비면 막대가 끊기고, 그 끊김이
 * "몇 화째 안 나왔다"를 눈에 보이게 하는 정보다.
 */
function toRuns(columns: readonly number[]): Run[] {
  const runs: Run[] = [];
  for (const column of columns) {
    const last = runs[runs.length - 1];
    if (last && column === last.to + 1) last.to = column;
    else runs.push({ from: column, to: column });
  }
  return runs;
}

/** "12화 · 균열의 밤" → "12화" */
export function chapterLabel(title: string) {
  return title.split(" · ")[0]?.trim() || title;
}

/**
 * 회차 순서.
 *
 * 서버가 준 노드 순서(파일 트리 순서)에서 원고만 뽑는다. 에피소드 폴더 안의 회차가
 * 에피소드 순서대로 먼저 오고, 에피소드에 들지 않은 원고가 뒤따른다.
 */
export function chaptersOf(graph: ProjectGraph): GraphNode[] {
  const byId = new Map(graph.nodes.map((node) => [node.id, node] as const));
  const inEpisodes = graph.episodes
    .flatMap((episode) => episode.chapterIds)
    .map((id) => byId.get(id))
    .filter((node): node is GraphNode => Boolean(node));
  const assigned = new Set(inEpisodes.map((node) => node.id));
  const rest = graph.nodes.filter(
    (node) => node.docType === "manuscript" && !assigned.has(node.id),
  );
  return [...inEpisodes, ...rest];
}

/**
 * 표를 만든다.
 *
 * `chapters` 는 회차 순으로 정렬되어 있어야 한다. `data` 는 등장을 찾기 위한 전체
 * 그래프다 — 회차와 엔티티를 잇는 엣지가 곧 "그 회차에 나왔다"는 뜻이다.
 *
 * `favorites` 가 비어 있지 않으면 맨 앞에 즐겨찾기 폴더가 생긴다.
 */
export function buildTimelineTable(
  chapters: readonly GraphNode[],
  data: ProjectGraph,
  favorites: ReadonlySet<string> = new Set(),
): TimelineTable {
  const adjacency = buildAdjacency(data);
  const nodeById = new Map(data.nodes.map((node) => [node.id, node] as const));
  const episodeOf = new Map<string, { id: string; title: string }>();
  for (const episode of data.episodes) {
    for (const chapterId of episode.chapterIds)
      episodeOf.set(chapterId, { id: episode.id, title: episode.title });
  }

  const columns: TimelineColumn[] = chapters.map((chapter, index) => ({
    chapterId: chapter.id,
    number: index,
    name: chapterLabel(chapter.title),
    title: chapter.title,
  }));

  // 노드 id -> 등장한 열 순번들. 회차를 순서대로 훑으므로 자연히 오름차순이 된다.
  const appearances = new Map<string, number[]>();
  chapters.forEach((chapter, index) => {
    for (const neighborId of adjacency.neighbors.get(chapter.id) ?? []) {
      const neighbor = nodeById.get(neighborId);
      // 회차끼리의 관계는 등장이 아니다 — 진행 순서는 열 자체가 보여준다.
      if (!neighbor || neighbor.docType === "manuscript") continue;
      const list = appearances.get(neighborId);
      if (list) list.push(index);
      else appearances.set(neighborId, [index]);
    }
  });

  const rows: TimelineRow[] = [];
  for (const [nodeId, columnIndexes] of appearances) {
    const node = nodeById.get(nodeId) as GraphNode;
    rows.push({
      nodeId,
      name: node.title,
      kind: node.docType,
      columns: columnIndexes,
      runs: toRuns(columnIndexes),
      first: columnIndexes[0],
      last: columnIndexes[columnIndexes.length - 1],
    });
  }

  /*
   * 폴더 안의 순서는 **등장 횟수가 많은 순**이다.
   *
   * 엔티티 대부분이 몇 회만 나오므로, 정렬하지 않으면 한 번 스치고 마는 노드가
   * 주역과 뒤섞여 표가 읽히지 않는다. 자주 나온 순으로 두면 위쪽 몇십 줄에 이야기의
   * 뼈대가 모인다. 횟수가 같으면 먼저 나온 순, 그다음 이름 순이라 매번 같은 표다.
   */
  const byAppearance = (a: TimelineRow, b: TimelineRow) =>
    b.columns.length - a.columns.length ||
    a.first - b.first ||
    (a.name < b.name ? -1 : 1);

  /*
   * 즐겨찾기는 맨 앞에 제 폴더로 모이고, **원래 분류 폴더에서는 빠진다.**
   *
   * 양쪽에 다 두면 같은 막대가 표에 두 줄 그려진다. 표가 길어지는 것보다, 같은 것이
   * 두 번 보여 등장 횟수를 잘못 읽게 되는 쪽이 문제다. 사이드바는 반대로 원래 폴더에
   * 남기는데, 거기 폴더는 문서를 찾는 목록이라 성격이 다르다.
   */
  const groups: TimelineGroup[] = [];
  const starred = rows.filter((row) => favorites.has(row.nodeId));
  if (starred.length > 0) {
    groups.push({
      id: FAVORITES_GROUP,
      kind: null,
      label: "즐겨찾기",
      rows: starred.sort(byAppearance),
    });
  }

  for (const kind of SETTING_DOCUMENT_TYPES) {
    const inKind = rows
      .filter((row) => row.kind === kind && !favorites.has(row.nodeId))
      .sort(byAppearance);
    // 빈 폴더는 만들지 않는다. 담긴 것이 없는 줄은 접었다 펼 값어치가 없다.
    if (inKind.length > 0) {
      groups.push({
        id: kind,
        kind,
        label: DOCUMENT_TYPE_META[kind].label,
        rows: inKind,
      });
    }
  }

  // 에피소드가 바뀌는 지점에서 구간을 끊는다. 배정되지 않은 회차도 자기 구간을
  // 갖는다 — 사이드바 트리가 하는 것과 같은 규칙이다.
  const episodes: EpisodeSpan[] = [];
  chapters.forEach((chapter, index) => {
    const episode = episodeOf.get(chapter.id) ?? null;
    const current = episodes[episodes.length - 1];
    if (current && current.episodeId === (episode?.id ?? null))
      current.to = index;
    else
      episodes.push({
        episodeId: episode?.id ?? null,
        name: episode?.title ?? UNASSIGNED_EPISODE,
        from: index,
        to: index,
      });
  });

  return {
    columns,
    groups,
    episodes,
    rowCount: rows.length,
  };
}

/**
 * 방향키 한 번에 옮겨갈 회차.
 *
 * 좌우는 한 칸, 위아래는 **에피소드 단위**다. 회차가 서른 개를 넘으면 한 칸씩
 * 넘기는 것만으로는 멀리 못 가는데, 에피소드가 이야기의 자연스러운 단락이라
 * 그 단위로 건너뛰는 편이 손에 맞는다.
 */
export function stepColumn(
  table: TimelineTable,
  current: number,
  dx: number,
  dy: number,
): number {
  if (table.columns.length === 0) return 0;

  if (dy !== 0) {
    const index = table.episodes.findIndex(
      (episode) => current >= episode.from && current <= episode.to,
    );
    if (index < 0) return current;
    // 아래로 갈 때는 다음 에피소드의 첫 회차, 위로 갈 때는 이 에피소드의 첫 회차로.
    // 이미 첫 회차에 서 있으면 그때 이전 에피소드로 넘어간다 — 긴 에피소드 한가운데
    // 에서 위를 눌렀을 때 곧바로 두 단락 앞으로 튀지 않게 한다.
    if (dy > 0) return table.episodes[index + 1]?.from ?? current;
    if (current > table.episodes[index].from) return table.episodes[index].from;
    return table.episodes[index - 1]?.from ?? current;
  }

  return Math.min(Math.max(current + dx, 0), table.columns.length - 1);
}
