import { describe, expect, it } from "vitest";

import { computeHighlight, EMPTY_HIGHLIGHT } from "./highlight";

// a — b — c,  d — e,  f(외톨이)
const AB = { source: "a", target: "b" };
const BC = { source: "b", target: "c" };
const DE = { source: "d", target: "e" };
const graph = { links: [AB, BC, DE] };

describe("computeHighlight", () => {
  it("lights nothing when no node is selected", () => {
    expect(computeHighlight(graph, [])).toBe(EMPTY_HIGHLIGHT);
  });

  it("lights one node with its direct neighbors and their edges", () => {
    const highlight = computeHighlight(graph, ["a"]);

    expect([...highlight.nodes].sort()).toEqual(["a", "b"]);
    expect(highlight.links.has(AB)).toBe(true);
    expect(highlight.links.has(BC)).toBe(false);
  });

  it("unions the neighborhoods of every selected node", () => {
    const highlight = computeHighlight(graph, ["a", "d"]);

    expect([...highlight.nodes].sort()).toEqual(["a", "b", "d", "e"]);
    expect(highlight.links.has(AB)).toBe(true);
    expect(highlight.links.has(DE)).toBe(true);
    // 고른 노드 어느 쪽에도 붙지 않은 엣지는 켜지지 않는다.
    expect(highlight.links.has(BC)).toBe(false);
  });

  it("keeps growing as a third node is added", () => {
    const highlight = computeHighlight(graph, ["a", "d", "c"]);

    expect([...highlight.nodes].sort()).toEqual(["a", "b", "c", "d", "e"]);
    expect(highlight.links.size).toBe(3);
  });

  it("keeps a selected node lit even when it has no edges", () => {
    const highlight = computeHighlight(graph, ["f"]);

    expect([...highlight.nodes]).toEqual(["f"]);
    expect(highlight.links.size).toBe(0);
  });

  it("reads edges whose ends were replaced by node objects", () => {
    // force-graph 는 첫 렌더에서 문자열을 노드 객체로 바꿔 넣는다.
    const link = { source: { id: "a" }, target: { id: "b" } };
    const highlight = computeHighlight({ links: [link] }, ["b"]);

    expect([...highlight.nodes].sort()).toEqual(["a", "b"]);
    expect(highlight.links.has(link)).toBe(true);
  });
});
