/**
 * 렌더 페이로드와 그 캐시.
 *
 * 서버가 준 프로젝트 그래프(ProjectGraph)를 렌더러가 바로 먹을 수 있는 모양으로
 * 옮긴다 — 노드마다 차수를 미리 세어 붙이고, 엣지는 source/target 두 끝과 관계
 * 속성 키만 남긴다.
 *
 * 만든 페이로드를 원본 객체에 매달아 캐시한다. force-graph 는 노드 객체에
 * x/y/vx/vy 를 직접 써넣으므로, 같은 객체를 계속 넘겨야 탭을 오갔다 돌아와도 그림이
 * 그대로다. 원본이 바뀌면(쿼리를 다시 받아오면) 캐시가 자연히 새로 만들어져 좌표가
 * 초기화된다.
 */

import type { ProjectGraph } from "@/domain/models";

import { buildAdjacency } from "./adjacency";
import type { NodeKind } from "./types";

export interface RenderNode {
  id: string;
  /**
   * 원본 노드 id.
   *
   * 그래프 뷰에서는 언제나 id 와 같다. 타임라인이 한 노드를 회차마다 되풀이해 그릴 때
   * 원본을 가리킬 열쇠가 따로 필요해서 같은 필드를 둔다.
   */
  baseId: string;
  kind: NodeKind;
  name: string;
  degree: number;
  /** 소속 회차 덩어리. 그래프 뷰는 쓰지 않는다 */
  cluster: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface RenderLink {
  /** force-graph 가 첫 렌더에서 문자열을 노드 객체로 바꿔 넣는다 */
  source: string | RenderNode;
  target: string | RenderNode;
  /** 관계 속성 키 */
  key: string;
  /** 사용자가 관계에 붙인 설명. 엣지 위 이름표에 쓴다 */
  description?: string;
}

export interface RenderGraph {
  nodes: RenderNode[];
  links: RenderLink[];
}

export function buildRenderGraph(graph: ProjectGraph): RenderGraph {
  const adjacency = buildAdjacency(graph);
  const nodes: RenderNode[] = graph.nodes.map((node) => ({
    id: node.id,
    baseId: node.id,
    kind: node.docType,
    name: node.title,
    degree: adjacency.degree.get(node.id) ?? 0,
    cluster: 0,
  }));
  const links: RenderLink[] = graph.edges.map((edge) => ({
    source: edge.source,
    target: edge.target,
    key: edge.key,
    description: edge.description,
  }));
  return { nodes, links };
}

const cache = new WeakMap<ProjectGraph, RenderGraph>();

/** 렌더 페이로드. 같은 원본이면 **같은 객체**를 돌려준다 */
export function getRenderGraph(graph: ProjectGraph): RenderGraph {
  let cached = cache.get(graph);
  if (!cached) {
    cached = buildRenderGraph(graph);
    cache.set(graph, cached);
  }
  return cached;
}
