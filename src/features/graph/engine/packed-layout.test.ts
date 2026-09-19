/**
 * 기하 배치 계약 테스트.
 *
 * 화면에서는 "배치가 좀 이상하다" 정도로만 보여서 어긋나도 알아채기 어렵다. 그래서
 * 눈으로 확인하기 어려운 성질을 여기서 못 박는다 — 전부 원 안에 들어가는지, 간격이
 * 실제로 균일한지, 원 안에 빈 구멍이 남지 않는지, 같은 입력에 같은 그림인지.
 */

import { describe, expect, it } from "vitest";

import {
  applyPackedLayout,
  radiusFor,
  type LayoutLink,
  type LayoutNode,
} from "./packed-layout";
import { sampleRenderGraph as getRenderGraph } from "./sample-graph";
import type { RenderGraph } from "./render-graph";

/** graph-2d.tsx 의 NODE_MAX_RADIUS 와 같은 값 */
const NODE_RADIUS = 15;
/** packed-layout.ts 의 GAP 을 더한 중심 간 최소 거리 */
const SPACING = 2 * NODE_RADIUS + 52;

interface Placed {
  id: string;
  x: number;
  y: number;
}

/** 배치 결과를 좌표 목록으로 뽑는다. 아직 자리를 못 받은 노드가 있으면 여기서 드러난다 */
function positions(nodes: readonly LayoutNode[]): Placed[] {
  return nodes.map((node) => {
    expect(node.fx, `${node.id} 에 x 자리가 없다`).toBeTypeOf("number");
    expect(node.fy, `${node.id} 에 y 자리가 없다`).toBeTypeOf("number");
    return { id: node.id, x: node.fx!, y: node.fy! };
  });
}

/** 가장 가까운 두 노드 사이 거리. O(n²) 라 작은 그래프에만 쓴다 */
function minimumGap(points: readonly Placed[]): number {
  let min = Infinity;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const d = Math.hypot(
        points[i].x - points[j].x,
        points[i].y - points[j].y,
      );
      if (d < min) min = d;
    }
  }
  return min;
}

/**
 * 원 안에서 노드로부터 가장 먼 지점까지의 거리.
 *
 * 이 값이 간격보다 작으면 "원 안 어디를 찍어도 한 칸 안에 노드가 있다" = 구멍이
 * 없다는 뜻이다. 덩어리를 만들던 시절에는 이 값이 간격의 1.8배까지 벌어졌다.
 */
function largestHole(points: readonly Placed[], radius: number): number {
  const step = radius / 60;
  let worst = 0;
  for (let x = -radius; x <= radius; x += step) {
    for (let y = -radius; y <= radius; y += step) {
      // 테두리는 바깥에 노드가 없어 당연히 멀어지므로 안쪽만 본다.
      if (Math.hypot(x, y) > radius * 0.9) continue;
      let best = Infinity;
      for (const p of points) {
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < best) best = d;
      }
      worst = Math.max(worst, Math.sqrt(best));
    }
  }
  return worst;
}

/** 테스트용 그래프. 허브 하나에 여럿이 붙고 나머지는 사슬로 이어진다 */
function makeGraph(hubs: number, leaves: number, loose: number) {
  const nodes: LayoutNode[] = [];
  const links: LayoutLink[] = [];

  for (let h = 0; h < hubs; h += 1) {
    nodes.push({ id: `hub${h}`, degree: 0 });
    for (let s = 0; s < leaves; s += 1) {
      nodes.push({ id: `leaf${h}_${s}`, degree: 0 });
      links.push({ source: `hub${h}`, target: `leaf${h}_${s}` });
    }
  }
  for (let i = 0; i < loose; i += 1) {
    nodes.push({ id: `free${i}`, degree: 0 });
    if (i > 0) links.push({ source: `free${i - 1}`, target: `free${i}` });
    links.push({ source: `free${i}`, target: `hub${i % hubs}` });
  }

  // 차수는 실제 링크에서 센다 — 렌더 페이로드가 하는 것과 같다.
  const degree = new Map<string, number>();
  for (const link of links) {
    for (const end of [link.source, link.target] as string[]) {
      degree.set(end, (degree.get(end) ?? 0) + 1);
    }
  }
  for (const node of nodes) node.degree = degree.get(node.id) ?? 0;

  return { nodes, links };
}

/** 픽스처 기반 렌더 페이로드를 매번 새 객체로 뽑는다(좌표가 섞이지 않게) */
function freshRenderGraph(): RenderGraph {
  const source = getRenderGraph();
  return {
    nodes: source.nodes.map((node) => ({ ...node })),
    links: source.links.map((link) => ({ ...link })),
  };
}

describe("반지름", () => {
  it("노드가 늘면 반지름도 늘고 밀도는 그대로다", () => {
    const few = radiusFor(100, 50);
    const many = radiusFor(1000, 50);
    expect(many).toBeGreaterThan(few);
    // 넓이가 개수에 비례해야 밀도가 유지된다 = 개수의 제곱근으로 자란다.
    expect(many / few).toBeCloseTo(Math.sqrt(10), 1);
  });

  it("간격을 넓히면 반지름도 그만큼 넓어진다", () => {
    expect(radiusFor(500, 100) / radiusFor(500, 50)).toBeCloseTo(2, 5);
  });
});

describe("배치", () => {
  const graph = makeGraph(6, 8, 60);
  const layout = applyPackedLayout(graph, { nodeRadius: NODE_RADIUS });
  const points = positions(graph.nodes);

  it("모든 노드가 전체 원 안에 들어간다", () => {
    for (const point of points) {
      const distance = Math.hypot(point.x, point.y);
      expect(distance + NODE_RADIUS, point.id).toBeLessThanOrEqual(
        layout.radius + 1e-6,
      );
    }
  });

  it("어떤 두 노드도 서로 겹치지 않는다", () => {
    expect(minimumGap(points)).toBeGreaterThanOrEqual(2 * NODE_RADIUS);
  });

  it("같은 입력이면 같은 그림이 나온다", () => {
    const again = makeGraph(6, 8, 60);
    applyPackedLayout(again, { nodeRadius: NODE_RADIUS });
    expect(positions(again.nodes)).toEqual(points);
  });
});

describe("균일하게 꽉 찬다", () => {
  const graph = freshRenderGraph();
  const layout = applyPackedLayout(graph, { nodeRadius: NODE_RADIUS });
  const points = positions(graph.nodes);

  it("간격이 어디서나 거의 같다", () => {
    // 최근접 거리가 노드마다 크게 다르면 어딘가는 빽빽하고 어딘가는 성기다는 뜻이다.
    const gaps = points.map((p) => {
      let best = Infinity;
      for (const q of points) {
        if (q === p) continue;
        const d = (p.x - q.x) ** 2 + (p.y - q.y) ** 2;
        if (d < best) best = d;
      }
      return Math.sqrt(best);
    });
    const min = Math.min(...gaps);
    const max = Math.max(...gaps);
    expect(min).toBeGreaterThanOrEqual(SPACING * 0.98);
    // 덩어리를 만들던 시절에는 이 비가 3배를 넘었다.
    expect(max / min).toBeLessThan(1.25);
  });

  it("원 안에 간격보다 넓은 빈 구멍이 없다", () => {
    expect(largestHole(points, layout.radius)).toBeLessThan(SPACING);
  });

  it("반지름 어느 띠에서나 밀도가 같다", () => {
    // 균일하면 반지름 r 안의 노드 수가 r² 에 비례한다.
    for (const fraction of [0.25, 0.5, 0.75]) {
      const inside = points.filter(
        (p) => Math.hypot(p.x, p.y) <= layout.radius * fraction,
      ).length;
      const expected = points.length * fraction ** 2;
      expect(Math.abs(inside - expected), `${fraction * 100}%`).toBeLessThan(
        points.length * 0.08,
      );
    }
  });
});

describe("포커스 center 배치", () => {
  /** 원점에서 가까운 순으로 노드 id */
  function byDistanceFromOrigin(nodes: LayoutNode[]): string[] {
    return [...nodes]
      .sort(
        (a, b) =>
          Math.hypot(a.x ?? 0, a.y ?? 0) - Math.hypot(b.x ?? 0, b.y ?? 0),
      )
      .map((node) => node.id);
  }

  it("center 를 주면 그 노드가 한가운데를 차지한다", () => {
    const graph = makeGraph(3, 12, 20);
    // hub0 은 차수가 가장 큰 축에 속하지만, free5 는 잔챙이다.
    applyPackedLayout(graph, {
      nodeRadius: NODE_RADIUS,
      centerIds: ["free5"],
    });

    expect(byDistanceFromOrigin(graph.nodes)[0]).toBe("free5");
  });

  it("center 가 여럿이면 연결이 가장 많은 쪽이 한가운데다", () => {
    const graph = makeGraph(3, 12, 20);
    const degreeOf = (id: string) =>
      graph.nodes.find((node) => node.id === id)!.degree;
    // hub0 이 free5 보다 훨씬 많이 이어져 있다.
    expect(degreeOf("hub0")).toBeGreaterThan(degreeOf("free5"));

    applyPackedLayout(graph, {
      nodeRadius: NODE_RADIUS,
      // 누른 순서를 거꾸로 줘도 차수가 큰 쪽이 가운데여야 한다.
      centerIds: ["free5", "hub0"],
    });

    expect(byDistanceFromOrigin(graph.nodes)[0]).toBe("hub0");
  });

  it("나머지 center 들이 주 center 바로 옆자리를 먼저 가져간다", () => {
    const graph = makeGraph(3, 12, 20);
    // hub0 이 차수가 가장 크므로 주 center 다. free5·free9 는 서로 이어져 있지도,
    // hub0 과 가까운 이웃이지도 않지만 그 옆에 붙어야 한다.
    applyPackedLayout(graph, {
      nodeRadius: NODE_RADIUS,
      centerIds: ["hub0", "free5", "free9"],
    });

    const main = graph.nodes.find((node) => node.id === "hub0")!;
    const closestToMain = [...graph.nodes]
      .filter((node) => node.id !== "hub0")
      .sort(
        (a, b) =>
          Math.hypot((a.x ?? 0) - (main.x ?? 0), (a.y ?? 0) - (main.y ?? 0)) -
          Math.hypot((b.x ?? 0) - (main.x ?? 0), (b.y ?? 0) - (main.y ?? 0)),
      )
      .slice(0, 2)
      .map((node) => node.id);

    // 무엇을 불러모았는지가 그림 한가운데에 모여 보이는 것이 포커스의 요점이다.
    expect([...closestToMain].sort()).toEqual(["free5", "free9"]);
  });

  it("center 를 주지 않으면 지금까지처럼 허브가 가운데다", () => {
    const graph = makeGraph(3, 12, 20);
    applyPackedLayout(graph, { nodeRadius: NODE_RADIUS });

    const middle = byDistanceFromOrigin(graph.nodes)[0];
    const degrees = graph.nodes.map((node) => node.degree);
    const top = Math.max(...degrees);
    expect(graph.nodes.find((node) => node.id === middle)!.degree).toBe(top);
  });

  it("그래프에 없는 center 는 무시한다", () => {
    const graph = makeGraph(2, 5, 5);
    // 필터에 잘려 사라진 center 가 그대로 넘어올 수 있다.
    expect(() =>
      applyPackedLayout(graph, {
        nodeRadius: NODE_RADIUS,
        centerIds: ["없는노드"],
      }),
    ).not.toThrow();
    expect(graph.nodes.every((node) => typeof node.fx === "number")).toBe(true);
  });
});

describe("실제 그래프", () => {
  it("시드 그래프의 모든 노드가 원 안에 겹치지 않고 들어간다", () => {
    const graph = freshRenderGraph();
    const layout = applyPackedLayout(graph, {
      nodeRadius: NODE_RADIUS,
    });
    const points = positions(graph.nodes);

    expect(points).toHaveLength(graph.nodes.length);
    expect(minimumGap(points)).toBeGreaterThanOrEqual(2 * NODE_RADIUS);
    for (const point of points) {
      expect(
        Math.hypot(point.x, point.y) + NODE_RADIUS,
        point.id,
      ).toBeLessThanOrEqual(layout.radius + 1e-6);
    }
  });

  it("에피소드처럼 노드가 줄면 원도 작아진다", () => {
    const whole = freshRenderGraph();
    const part: RenderGraph = { nodes: whole.nodes.slice(0, 40), links: [] };
    const big = applyPackedLayout(whole, {
      nodeRadius: NODE_RADIUS,
    });
    const small = applyPackedLayout(part, {
      nodeRadius: NODE_RADIUS,
    });
    expect(small.radius).toBeLessThan(big.radius);
  });

  it("8,000 노드도 즉시 배치된다", () => {
    // 시드 원고는 수십 노드지만, 장편이 되면 이 자릿수까지 자란다. 예전에는 툴바의
    // 규모 증폭(×30)으로 눈으로 확인했는데, 그 장치를 걷어내면서 여기서 지킨다.
    const graph = makeGraph(200, 30, 1_800);
    expect(graph.nodes.length).toBe(8_000);

    const started = performance.now();
    const layout = applyPackedLayout(graph, {
      nodeRadius: NODE_RADIUS,
    });
    const elapsed = performance.now() - started;

    expect(graph.nodes.every((node) => typeof node.fx === "number")).toBe(true);
    expect(layout.radius).toBeGreaterThan(0);
    // 힘 시뮬레이션은 이 규모에서 수 초가 걸렸다. 기하 배치는 한 번에 끝나야 한다.
    expect(elapsed).toBeLessThan(2000);
  });
});
