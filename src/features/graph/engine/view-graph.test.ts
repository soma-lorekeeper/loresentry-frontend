/**
 * 필터·포커스 계약 테스트.
 *
 * 화면에서는 "노드가 좀 적네" 정도로만 보여서 규칙이 어긋나도 알아채기 어렵다.
 * 특히 캐시 identity 는 눈으로 확인할 방법이 아예 없는데(같은 그림이 두 번 그려질
 * 뿐이다), 이게 깨지면 마우스를 움직일 때마다 화면이 다시 펼쳐진다.
 */

import { describe, expect, it } from "vitest";

import { endpointId } from "./highlight";
import type { RenderGraph } from "./render-graph";
import { sampleRenderGraph as getRenderGraph } from "./sample-graph";
import { NODE_KINDS, type NodeKind } from "./types";
import {
  filterByKind,
  focusSubgraph,
  getFilteredGraph,
  getFocusedGraph,
  toggleFocus,
} from "./view-graph";

const ALL_KINDS = new Set<NodeKind>(NODE_KINDS);

/** 손으로 짠 작은 그래프. 규칙을 눈으로 따라갈 수 있는 크기로 둔다 */
function tinyGraph(): RenderGraph {
  const make = (id: string, kind: NodeKind) => ({
    id,
    baseId: id,
    kind,
    name: id,
    degree: 0,
    cluster: 0,
  });

  return {
    nodes: [
      make("hub", "character"),
      make("a", "character"),
      make("b", "place"),
      make("c", "item"),
      make("far", "character"),
    ],
    links: [
      { source: "hub", target: "a", key: "k" },
      { source: "hub", target: "b", key: "k" },
      { source: "a", target: "b", key: "k" }, // 이웃끼리의 엣지
      { source: "c", target: "far", key: "k" }, // hub 와 무관한 쪽
    ],
  };
}

function ids(graph: RenderGraph): string[] {
  return graph.nodes.map((node) => node.id).sort();
}

function linkPairs(graph: RenderGraph): string[] {
  return graph.links
    .map((link) => `${endpointId(link.source)}-${endpointId(link.target)}`)
    .sort();
}

describe("분류 필터", () => {
  it("고른 분류만 남는다", () => {
    const view = filterByKind(tinyGraph(), new Set<NodeKind>(["character"]));
    expect(ids(view)).toEqual(["a", "far", "hub"]);
  });

  it("한쪽 끝이 잘린 엣지는 함께 사라진다", () => {
    const view = filterByKind(tinyGraph(), new Set<NodeKind>(["character"]));
    // hub-b, a-b 는 b(장소)가 없어졌고, c-far 는 c(사물)가 없어졌다.
    expect(linkPairs(view)).toEqual(["hub-a"]);
  });

  it("전부 고르면 원본 객체를 그대로 돌려준다", () => {
    const graph = tinyGraph();
    expect(filterByKind(graph, ALL_KINDS)).toBe(graph);
  });

  it("아무것도 안 고르면 빈 그래프가 된다", () => {
    const view = filterByKind(tinyGraph(), new Set<NodeKind>());
    expect(view.nodes).toHaveLength(0);
    expect(view.links).toHaveLength(0);
  });
});

describe("1-hop 포커스", () => {
  it("center 와 그 이웃만 남는다", () => {
    const view = focusSubgraph(tinyGraph(), ["hub"]);
    expect(ids(view)).toEqual(["a", "b", "hub"]);
  });

  it("이웃끼리 이어진 엣지도 남는다", () => {
    const view = focusSubgraph(tinyGraph(), ["hub"]);
    // a-b 는 어느 쪽도 center 가 아니지만 둘 다 살아남았으므로 그린다.
    expect(linkPairs(view)).toEqual(["a-b", "hub-a", "hub-b"]);
  });

  it("center 가 여럿이면 각자의 1-hop 이 합쳐진다", () => {
    const view = focusSubgraph(tinyGraph(), ["hub", "c"]);
    expect(ids(view)).toEqual(["a", "b", "c", "far", "hub"]);
  });

  it("이웃이 없는 center 는 자기 혼자 남는다", () => {
    const view = focusSubgraph(tinyGraph(), ["far"]);
    expect(ids(view)).toEqual(["c", "far"]);
  });

  it("center 가 없으면 원본 객체를 그대로 돌려준다", () => {
    const graph = tinyGraph();
    expect(focusSubgraph(graph, [])).toBe(graph);
  });

  it("필터에 잘려 사라진 center 는 무시한다", () => {
    // 인물만 남긴 뒤 장소 b 를 center 로 주면, b 는 이미 없다.
    const filtered = filterByKind(
      tinyGraph(),
      new Set<NodeKind>(["character"]),
    );
    const view = focusSubgraph(filtered, ["b"]);
    expect(ids(view)).toEqual([]);
  });
});

describe("포커스 토글", () => {
  it("새 노드는 뒤에 붙어 누른 순서가 남는다", () => {
    expect(toggleFocus(["hub"], "c")).toEqual(["hub", "c"]);
  });

  it("이미 center 면 그 하나만 빠진다", () => {
    expect(toggleFocus(["hub", "c", "far"], "c")).toEqual(["hub", "far"]);
  });

  it("마지막 하나가 빠지면 빈 배열이 된다", () => {
    expect(toggleFocus(["hub"], "hub")).toEqual([]);
  });

  it("원본 배열을 건드리지 않는다", () => {
    const before = ["hub"];
    toggleFocus(before, "c");
    expect(before).toEqual(["hub"]);
  });
});

describe("캐시", () => {
  it("같은 조건이면 같은 객체를 돌려준다", () => {
    const base = tinyGraph();
    const kinds = new Set<NodeKind>(["character"]);
    const first = getFocusedGraph(getFilteredGraph(base, kinds), ["hub"]);
    // 집합·배열은 매번 새 객체로 오지만 내용이 같으면 결과도 같아야 한다.
    const second = getFocusedGraph(
      getFilteredGraph(base, new Set<NodeKind>(["character"])),
      ["hub"],
    );
    expect(second).toBe(first);
  });

  it("분류가 달라지면 새 객체를 만든다", () => {
    const base = tinyGraph();
    const first = getFilteredGraph(base, new Set<NodeKind>(["character"]));
    const second = getFilteredGraph(base, new Set<NodeKind>(["place"]));
    expect(second).not.toBe(first);
  });

  it("포커스가 달라지면 새 객체를 만든다", () => {
    const base = tinyGraph();
    const filtered = getFilteredGraph(base, ALL_KINDS);
    const first = getFocusedGraph(filtered, ["hub"]);
    const second = getFocusedGraph(filtered, ["hub", "c"]);
    expect(second).not.toBe(first);
  });

  it("두 단을 번갈아 불러도 서로를 밀어내지 않는다", () => {
    // 화면은 두 결과를 동시에 쓴다 — 캔버스는 포커스까지, 검색 목록은 필터까지.
    // 한 칸짜리 캐시 하나였다면 여기서 매번 새 객체가 나와 연출이 계속 재생된다.
    const base = tinyGraph();
    const kinds = new Set<NodeKind>(["character", "place"]);

    const filteredA = getFilteredGraph(base, kinds);
    const focusedA = getFocusedGraph(filteredA, ["hub"]);
    const filteredB = getFilteredGraph(base, kinds);
    const focusedB = getFocusedGraph(filteredB, ["hub"]);

    expect(filteredB).toBe(filteredA);
    expect(focusedB).toBe(focusedA);
  });

  it("조건이 없으면 원본을 그대로 통과시킨다", () => {
    const base = tinyGraph();
    expect(getFocusedGraph(getFilteredGraph(base, ALL_KINDS), [])).toBe(base);
  });
});

describe("실제 그래프", () => {
  it("인물만 남기면 인물 노드만 나온다", () => {
    const view = filterByKind(
      getRenderGraph(),
      new Set<NodeKind>(["character"]),
    );
    expect(view.nodes.length).toBeGreaterThan(0);
    expect(view.nodes.every((node) => node.kind === "character")).toBe(true);
    expect(view.nodes.length).toBeLessThan(getRenderGraph().nodes.length);
  });

  it("레나를 포커스하면 그 이웃이 전부 들어온다", () => {
    const base = getRenderGraph();
    const view = focusSubgraph(base, ["glass-garden:c-lena"]);
    const neighbors = new Set<string>();
    for (const link of base.links) {
      const source = endpointId(link.source);
      const target = endpointId(link.target);
      if (source === "glass-garden:c-lena") neighbors.add(target);
      if (target === "glass-garden:c-lena") neighbors.add(source);
    }
    // center 자신 + 이웃 전부.
    expect(view.nodes.length).toBe(neighbors.size + 1);
  });
});
