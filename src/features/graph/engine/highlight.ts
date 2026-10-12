/**
 * 누른 노드들의 1-hop 강조에 쓰는 집합 계산.
 *
 * 노드를 여러 개 고르면 각 노드의 1-hop 을 **합친다**(OR). "레나와 이어진 것" 과
 * "북쪽 온실과 이어진 것" 을 한 화면에서 함께 보려는 것이라, 둘 다와 이어진 것만 남기는
 * 교집합이 아니다.
 *
 * 증폭된 그래프에서는 원본 인접 인덱스를 그대로 못 쓴다(복제본 id 가 다르다).
 * 그래서 렌더 페이로드의 링크에서 직접 뽑는다. 링크는 force-graph 가 첫 렌더에서
 * source/target 을 문자열에서 노드 객체로 바꿔치므로 양쪽 형태를 모두 받아낸다.
 */

/** 강조 계산에 필요한 최소 형태. 그래프 뷰와 타임라인 뷰가 같은 함수를 쓴다 */
export interface HighlightLink {
  source: string | { id: string };
  target: string | { id: string };
}

export function endpointId(end: string | { id: string }): string {
  return typeof end === "string" ? end : end.id;
}

export interface Highlight {
  /** 누른 노드들 + 각각의 1-hop 이웃 */
  nodes: ReadonlySet<string>;
  /**
   * 누른 노드 가운데 하나에라도 붙은 엣지. 넘겨받은 링크 객체를 그대로 담는다.
   *
   * 담기는 타입이 뷰마다 달라(RenderLink / TimelineLink) unknown 으로 둔다.
   * 쓰는 쪽은 has() 로 "이 링크가 강조 대상인가"만 물으므로 이걸로 충분하다.
   */
  links: ReadonlySet<unknown>;
}

export const EMPTY_HIGHLIGHT: Highlight = {
  nodes: new Set(),
  links: new Set(),
};

export function computeHighlight(
  graph: { links: readonly HighlightLink[] },
  activeIds: Iterable<string>,
): Highlight {
  const active = new Set(activeIds);
  if (active.size === 0) return EMPTY_HIGHLIGHT;

  // 고른 노드는 이웃이 하나도 없어도 강조 대상이다.
  const nodes = new Set<string>(active);
  const links = new Set<unknown>();

  for (const link of graph.links) {
    const source = endpointId(link.source);
    const target = endpointId(link.target);
    // 양 끝 가운데 하나라도 고른 노드면 그 엣지와 반대쪽 끝이 함께 켜진다.
    if (active.has(source) || active.has(target)) {
      nodes.add(source);
      nodes.add(target);
      links.add(link);
    }
  }

  return { nodes, links };
}
