/**
 * 지금 화면에 그릴 그래프를 고르는 두 단계 — 분류 필터와 1-hop 포커스.
 *
 * 둘 다 **숨기는 게 아니라 걸러낸다**. 노드를 투명하게 만들어 두면 배치는 여전히
 * 그 노드 자리를 비워 두므로 원이 듬성해지고, 인물만 보려고 걸렀는데 그림이 그대로인
 * 이상한 화면이 된다. 걸러낸 페이로드를 새로 넘기면 배치가 남은 노드 수에 맞는
 * 작은 원을 다시 그린다(packed-layout.ts).
 *
 * 순서는 `필터 → 포커스` 다. 인물만 남긴 다음 그 안에서 한 노드 주변을 파고드는 게
 * 자연스럽고, 반대로 하면 포커스로 데려온 이웃이 필터에 다시 잘려 나가 "눌렀는데
 * 아무것도 안 나온다"가 된다.
 *
 * **새 노드·링크 객체를 만들지 않는다.** 원본을 걸러 새 배열에만 담는다.
 *  - 링크는 highlight.ts 가 객체 identity 로 비교한다(`highlight.links.has(link)`).
 *  - 노드는 force-graph 가 링크의 source/target 을 객체로 치환해 둔 것을 공유해야 한다.
 * 좌표가 뷰마다 섞일 걱정은 없다 — applyPackedLayout 이 매번 전부 덮어쓴다.
 */

import { endpointId } from "./highlight";
import type { RenderGraph, RenderLink } from "./render-graph";
import type { NodeKind } from "./types";

/** 양 끝이 모두 살아남은 링크만 남긴다. 두 단계가 공유하는 마무리 */
function linksWithin(
  links: readonly RenderLink[],
  kept: ReadonlySet<string>,
): RenderLink[] {
  return links.filter(
    (link) =>
      kept.has(endpointId(link.source)) && kept.has(endpointId(link.target)),
  );
}

/**
 * 고른 분류만 남긴 서브그래프.
 *
 * 전부 골랐으면 원본을 **그대로** 돌려준다 — 같은 객체여야 배치가 다시 돌지 않는다.
 */
export function filterByKind(
  graph: RenderGraph,
  kinds: ReadonlySet<NodeKind>,
): RenderGraph {
  const nodes = graph.nodes.filter((node) => kinds.has(node.kind));
  if (nodes.length === graph.nodes.length) return graph;

  const kept = new Set(nodes.map((node) => node.id));
  return { nodes, links: linksWithin(graph.links, kept) };
}

/**
 * center 들과 그 1-hop 이웃만 남긴 서브그래프.
 *
 * 엣지는 **살아남은 노드 사이의 것을 전부** 남긴다. center 로 뻗는 바퀴살만 남기면
 * 구조가 지나치게 단순해져서, 불러모은 무리 안에서 누가 누구와 엮여 있는지가 사라진다.
 *
 * centerIds 가 비어 있으면 원본을 그대로 돌려준다(포커스 없음).
 */
export function focusSubgraph(
  graph: RenderGraph,
  centerIds: readonly string[],
): RenderGraph {
  if (centerIds.length === 0) return graph;

  const present = new Set(graph.nodes.map((node) => node.id));
  const centers = new Set(centerIds);
  const kept = new Set<string>();
  // 필터에 잘려 이미 없는 center 는 건너뛴다.
  for (const id of centerIds) if (present.has(id)) kept.add(id);

  for (const link of graph.links) {
    const source = endpointId(link.source);
    const target = endpointId(link.target);
    if (centers.has(source)) kept.add(target);
    if (centers.has(target)) kept.add(source);
  }

  const nodes = graph.nodes.filter((node) => kept.has(node.id));
  return { nodes, links: linksWithin(graph.links, kept) };
}

/**
 * 포커스 목록을 토글한다.
 *
 * 이미 center 면 **그 하나만** 빠지고 나머지 center 는 남는다. 마지막 하나가 빠지면
 * 빈 배열이 되어 전체 그래프로 돌아간다. 새로 누른 노드는 뒤에 붙어, 누른 순서가
 * 그대로 보존된다.
 */
export function toggleFocus(
  centerIds: readonly string[],
  nodeId: string,
): string[] {
  return centerIds.includes(nodeId)
    ? centerIds.filter((id) => id !== nodeId)
    : [...centerIds, nodeId];
}

/**
 * 필터 결과와 포커스 결과를 **각각** 캐시한다. 같은 조건이면 같은 객체를 돌려준다.
 *
 * 이 identity 가 곧 "다시 그릴 때다"라는 신호다 — 렌더러는 이 객체가 바뀔 때만
 * 배치를 다시 계산하고 애니메이션을 재생한다. 캐시가 없으면 hover 처럼 아무 상관
 * 없는 리렌더에서도 화면이 매번 다시 펼쳐진다.
 *
 * 두 단을 한 캐시에 담지 않는 이유는, 화면이 두 결과를 **동시에** 쓰기 때문이다 —
 * 캔버스는 포커스까지 적용된 것을, 검색 목록은 필터까지만 적용된 것을 본다. 한 칸
 * 짜리 캐시 하나면 둘이 번갈아 서로를 밀어내 매 렌더 새 객체가 나온다.
 *
 * 각 캐시는 마지막 한 벌만 들고 있는다. 오갈 수 있는 조합이 (분류 조합 × center
 * 조합)이라 전부 담아두면 끝이 없고, 실제로 필요한 건 "직전과 같은가" 하나다.
 */
let filterCache: { base: RenderGraph; key: string; view: RenderGraph } | null =
  null;
let focusCache: { base: RenderGraph; key: string; view: RenderGraph } | null =
  null;

/** 분류 필터까지만 적용한 그래프. 검색 목록이 이걸 본다 */
export function getFilteredGraph(
  base: RenderGraph,
  kinds: ReadonlySet<NodeKind>,
): RenderGraph {
  // 집합은 매 렌더 새 객체로 오므로 내용으로 키를 만든다.
  const key = [...kinds].sort().join("|");
  if (filterCache && filterCache.base === base && filterCache.key === key) {
    return filterCache.view;
  }
  const view = filterByKind(base, kinds);
  filterCache = { base, key, view };
  return view;
}

/** 포커스까지 적용한 그래프. 캔버스가 이걸 본다 */
export function getFocusedGraph(
  filtered: RenderGraph,
  centerIds: readonly string[],
): RenderGraph {
  const key = centerIds.join("|");
  if (focusCache && focusCache.base === filtered && focusCache.key === key) {
    return focusCache.view;
  }
  const view = focusSubgraph(filtered, centerIds);
  focusCache = { base: filtered, key, view };
  return view;
}
