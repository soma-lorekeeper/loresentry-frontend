/**
 * 타임라인 표 캐시.
 *
 * 표는 순수 계산이지만 등장 관계를 매 렌더마다 다시 훑을 이유가 없다. 같은 조건이면
 * 같은 객체를 돌려주어 리렌더에서 표가 다시 만들어지지 않게 한다.
 */

import type { ProjectGraph } from "@/domain/models";

import {
  buildTimelineTable,
  chaptersOf,
  type TimelineTable,
} from "./timeline-rows";

const cache = new WeakMap<ProjectGraph, Map<string, TimelineTable>>();

/**
 * episodeIds 가 null 이면 전체 회차를 늘어놓는다(에피소드가 배정되지 않은 회차 포함).
 *
 * 원본 그래프가 바뀌면(다시 받아오면) 캐시가 통째로 새로 만들어진다. 즐겨찾기는
 * 그래프 밖에 살기 때문에 열쇠에 넣는다 — 빠뜨리면 별을 켜도 폴더가 안 생긴다.
 */
export function getTimeline(
  graph: ProjectGraph,
  episodeIds: readonly string[] | null,
  favorites: ReadonlySet<string>,
): TimelineTable {
  let byKey = cache.get(graph);
  if (!byKey) {
    byKey = new Map();
    cache.set(graph, byKey);
  }
  const key = `${episodeIds ? [...episodeIds].sort().join("|") : "all"}#${[...favorites].sort().join("|")}`;
  let cached = byKey.get(key);
  if (!cached) {
    const all = chaptersOf(graph);
    const chapters = episodeIds
      ? all.filter((chapter) =>
          graph.episodes.some(
            (episode) =>
              episodeIds.includes(episode.id) &&
              episode.chapterIds.includes(chapter.id),
          ),
        )
      : all;
    cached = buildTimelineTable(chapters, graph, favorites);
    byKey.set(key, cached);
  }
  return cached;
}
