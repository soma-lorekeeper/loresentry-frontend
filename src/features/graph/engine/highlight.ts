/**
 * hover 1-hop 강조에 쓰는 집합 계산.
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
  /** hover 한 노드 + 1-hop 이웃 */
  nodes: ReadonlySet<string>;
  /**
   * hover 한 노드에 붙은 엣지. 넘겨받은 링크 객체를 그대로 담는다.
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
  hoveredId: string | null,
): Highlight {
  if (!hoveredId) return EMPTY_HIGHLIGHT;

  const nodes = new Set<string>([hoveredId]);
  const links = new Set<unknown>();

  for (const link of graph.links) {
    const source = endpointId(link.source);
    const target = endpointId(link.target);
    if (source === hoveredId) {
      nodes.add(target);
      links.add(link);
    } else if (target === hoveredId) {
      nodes.add(source);
      links.add(link);
    }
  }

  return { nodes, links };
}
