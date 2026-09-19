/**
 * 1-hop 이웃 인덱스.
 *
 * 그래프의 hover 강조와 문서의 "연결된 항목"이 같은 인덱스를 쓴다 — 화면 두 곳이
 * 같은 사실을 보여주므로 계산도 한 곳에서만 한다.
 */

import type { GraphData } from "./types";

type GraphEdge = GraphData["edges"][number];

export interface Adjacency {
  /** 노드 id -> 방향 무관 이웃 id 집합 */
  neighbors: ReadonlyMap<string, ReadonlySet<string>>;
  /** 노드 id -> 그 노드에 붙은 엣지 (나가는 것과 들어오는 것 모두) */
  incident: ReadonlyMap<string, readonly GraphEdge[]>;
  /** 노드 id -> 차수. 노드 크기 계산에 쓴다 */
  degree: ReadonlyMap<string, number>;
}

export function buildAdjacency(data: GraphData): Adjacency {
  const neighbors = new Map<string, Set<string>>();
  const incident = new Map<string, GraphEdge[]>();

  for (const node of data.nodes) {
    neighbors.set(node.id, new Set());
    incident.set(node.id, []);
  }

  for (const edge of data.edges) {
    neighbors.get(edge.source)?.add(edge.target);
    neighbors.get(edge.target)?.add(edge.source);
    incident.get(edge.source)?.push(edge);
    incident.get(edge.target)?.push(edge);
  }

  const degree = new Map<string, number>();
  for (const [id, set] of neighbors) degree.set(id, set.size);

  return { neighbors, incident, degree };
}
