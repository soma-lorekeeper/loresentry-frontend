/**
 * 에피소드 단위 서브그래프.
 *
 * 강조가 아니라 **페이로드 자체를 걸러서** 넘긴다 — 고른 에피소드의 회차와 거기
 * 직접 연결된 노드만 남고 나머지는 아예 사라진다.
 *
 * 분류 필터·포커스(view-graph.ts)는 이 결과 위에 다시 얹힌다 — 에피소드로 범위를
 * 좁힌 다음, 그 안에서 분류를 고르고 한 노드 주변을 파고드는 순서다.
 */

import type { ProjectGraph } from "@/domain/models";

import { buildAdjacency } from "./adjacency";
import type { RenderGraph, RenderLink, RenderNode } from "./render-graph";

function build(
  graph: ProjectGraph,
  episodeIds: readonly string[],
): RenderGraph {
  const adjacency = buildAdjacency(graph);
  // 여러 에피소드를 한꺼번에 받는다. 에피소드 순서(서버가 준 순서)대로 다시 세워야
  // 덩어리 번호가 이야기 순서를 따른다 — 고른 차례대로 이어 붙이면 순서가 흔들린다.
  const chapters = graph.episodes
    .filter((episode) => episodeIds.includes(episode.id))
    .flatMap((episode) => episode.chapterIds);

  // 회차 + 회차의 1-hop 이웃만 남긴다.
  const keep = new Set<string>();
  for (const chapter of chapters) {
    keep.add(chapter);
    for (const neighbor of adjacency.neighbors.get(chapter) ?? []) {
      keep.add(neighbor);
    }
  }

  const clusterOf = new Map<string, number>();
  chapters.forEach((chapter, index) => clusterOf.set(chapter, index));

  const nodes: RenderNode[] = [];
  for (const node of graph.nodes) {
    if (!keep.has(node.id)) continue;
    // 이웃은 여러 회차에 걸칠 수 있다. 이 에피소드 안에서 가장 먼저 닿는 회차에 붙인다.
    const chapter =
      node.docType === "manuscript"
        ? node.id
        : (chapters.find((id) => adjacency.neighbors.get(id)?.has(node.id)) ??
          chapters[0]);

    nodes.push({
      id: node.id,
      baseId: node.id,
      kind: node.docType,
      name: node.title,
      degree: adjacency.degree.get(node.id) ?? 0,
      cluster: (chapter && clusterOf.get(chapter)) || 0,
    });
  }

  // 양 끝이 모두 살아남은 엣지만 가져온다.
  const links: RenderLink[] = graph.edges
    .filter((edge) => keep.has(edge.source) && keep.has(edge.target))
    .map((edge) => ({
      source: edge.source,
      target: edge.target,
      key: edge.key,
      description: edge.description,
    }));

  return { nodes, links };
}

// 좌표를 잃지 않으려고 캐시한다(render-graph.ts 의 getRenderGraph 와 같은 이유).
// 원본 그래프가 바뀌면 통째로 버린다.
const cache = new WeakMap<ProjectGraph, Map<string, RenderGraph>>();

/** 고른 에피소드들의 회차와 그 1-hop 만 남긴 그래프 */
export function getEpisodeGraph(
  graph: ProjectGraph,
  episodeIds: readonly string[],
): RenderGraph {
  let byKey = cache.get(graph);
  if (!byKey) {
    byKey = new Map();
    cache.set(graph, byKey);
  }
  // 고른 조합이 곧 열쇠다. 순서가 달라도 같은 조합이면 같은 그래프여야 한다.
  const key = [...episodeIds].sort().join("|");
  let cached = byKey.get(key);
  if (!cached) {
    cached = build(graph, episodeIds);
    byKey.set(key, cached);
  }
  return cached;
}
