/**
 * 상시 물리 계약 테스트.
 *
 * 여기서 못 박는 것은 **무엇을 걸고 무엇을 걸지 않는가**다. 힘이 하나만 더 붙어도
 * 그래프가 원점으로 쏠리거나 풍선처럼 부푸는데, 화면에서는 "좀 이상하네" 정도로만
 * 보여서 원인을 짚기가 어렵다.
 *
 * d3 가 힘을 제대로 계산하는지는 여기서 볼 일이 아니다. force-graph 인스턴스는
 * 무엇을 심었는지 기록만 하는 가짜로 둔다.
 */

import { describe, expect, it, vi } from "vitest";

import { endpointId } from "./highlight";
import { applyPackedLayout, spacingFor } from "./packed-layout";
import type { LayoutLink, PackedLayout } from "./packed-layout";
import { sampleRenderGraph as getRenderGraph } from "./sample-graph";
import {
  JELLYFISH_ALPHA_DECAY,
  JELLYFISH_VELOCITY_DECAY,
  collideRadius,
  installPhysics,
  restLength,
  type ForceHost,
} from "./physics";

/** 배치가 준 자리. a-b 는 100 떨어져 있고 c 는 3-4-5 삼각형으로 500 이다 */
const HOME: PackedLayout["home"] = new Map([
  ["a", { x: 0, y: 0 }],
  ["b", { x: 100, y: 0 }],
  ["c", { x: 300, y: 400 }],
]);

/** 차수가 클수록 큰 노드. 렌더러가 쓰는 식과 같은 모양이다 */
const nodeRadius = (node: { degree: number }) =>
  Math.min(Math.sqrt(1 + node.degree * 0.22) * 4, 15);

const OPTIONS = { home: HOME, spacing: 82, nodeRadius };

/** 심은 힘을 기록만 하는 가짜 인스턴스 */
function makeHost() {
  const linkForce = {
    distance: vi.fn((accessor: (link: LayoutLink) => number) => {
      void accessor;
      return linkForce;
    }),
    strength: vi.fn((value: number) => {
      void value;
      return linkForce;
    }),
  };
  const installed = new Map<string, unknown>();

  const host = {
    d3Force(name: string, force?: unknown) {
      if (arguments.length === 1) {
        return name === "link" ? linkForce : installed.get(name);
      }
      installed.set(name, force);
      return host;
    },
  };

  return { host: host as ForceHost, linkForce, installed };
}

describe("거는 힘", () => {
  it("엣지마다 배치가 준 길이를 기준으로 삼는다", () => {
    const { host, linkForce } = makeHost();
    installPhysics(host, OPTIONS);

    // 모든 엣지에 같은 거리를 주면 원을 가로지르는 긴 엣지가 줄어들려 해서
    // 그래프가 오그라든다. 엣지마다 제 길이를 알아야 배치가 평형점이 된다.
    const accessor = linkForce.distance.mock.calls[0][0];
    expect(accessor({ source: "a", target: "b" })).toBe(100);
    expect(accessor({ source: "a", target: "c" })).toBe(500);
  });

  it("배치 뒤에 생긴 엣지는 기본 간격을 쓴다", () => {
    const { host, linkForce } = makeHost();
    installPhysics(host, OPTIONS);

    // 문서에서 새로 이은 관계가 여기로 온다. 이웃과 같은 간격이 자연스럽다.
    const accessor = linkForce.distance.mock.calls[0][0];
    expect(accessor({ source: "a", target: "새노드" })).toBe(OPTIONS.spacing);
  });

  it("force-graph 가 노드 객체로 바꿔 넣은 엣지도 읽는다", () => {
    // 첫 렌더 뒤에는 source/target 이 문자열이 아니라 노드 객체다.
    expect(
      restLength({ source: { id: "a" }, target: { id: "b" } }, HOME, 82),
    ).toBe(100);
  });

  it("엣지 힘은 아주 약하다", () => {
    const { host, linkForce } = makeHost();
    installPhysics(host, OPTIONS);

    // 세면 이웃이 손가락에 붙은 것처럼 튀어나온다. 해파리가 아니라 용수철이 된다.
    const strength = linkForce.strength.mock.calls[0][0];
    expect(strength).toBeGreaterThan(0);
    expect(strength).toBeLessThanOrEqual(0.05);
  });

  it("겹침만 막는 충돌을 심는다", () => {
    const { host, installed } = makeHost();
    installPhysics(host, OPTIONS);

    expect(installed.get("collide")).toBeTruthy();
  });

  it("반발 거리가 노드 크기를 따라가고, 그리는 원보다 넓다", () => {
    const { host, installed } = makeHost();
    installPhysics(host, OPTIONS);

    // d3 의 충돌 힘은 반경을 함수로 받아 노드마다 다시 잰다. 상수를 넘기면 잔챙이도
    // 허브만큼 넓게 밀어내서, 눈에 보이는 원과 실제로 차지하는 자리가 어긋난다.
    const collide = installed.get("collide") as { radius(): unknown };
    const radius = collide.radius() as (node: { degree: number }) => number;
    expect(radius({ degree: 100 })).toBeGreaterThan(radius({ degree: 1 }));

    // 원이 서로 스칠 때에야 반응하면 이미 붙은 뒤다. 조금 앞서 비켜야 한다.
    expect(radius({ degree: 5 })).toBeGreaterThan(nodeRadius({ degree: 5 }));
  });

  it("모양을 만드는 다른 힘은 걸지 않는다", () => {
    const { host, installed } = makeHost();
    installPhysics(host, OPTIONS);

    // charge 가 남으면 서로 밀어내며 부풀고, center 가 남으면 원점으로 쏠린다.
    expect(installed.get("charge")).toBeNull();
    expect(installed.get("center")).toBeNull();
    // 그 밖에 우리가 심은 것은 충돌 하나뿐이다.
    expect([...installed.keys()].sort()).toEqual([
      "center",
      "charge",
      "collide",
    ]);
  });

  it("그래프가 바뀌어 다시 불러도 같은 값으로 다시 잡는다", () => {
    const { host, linkForce } = makeHost();
    installPhysics(host, OPTIONS);
    installPhysics(host, OPTIONS);

    // force-graph 가 링크를 갈아끼우면 링크 힘 객체도 새로 만들어진다.
    expect(linkForce.distance).toHaveBeenCalledTimes(2);
    expect(linkForce.strength).toHaveBeenCalledTimes(2);
  });
});

describe("배치가 곧 평형점이다", () => {
  /*
   * 이게 이 파일에서 가장 중요한 성질이다. 배치에서 모든 힘의 오차가 0 이면 그래프가
   * 저 혼자 흘러가지 않고, 끌었다 놓았을 때 원래 모양으로 돌아온다. 화면에서는
   * "몇 초 지나니 원이 뭉개진다" 로만 보여서 원인을 짚기 어렵다.
   */
  /** 배치는 가장 큰 노드를 기준으로 자리를 깐다 — 간격이 균일해야 하기 때문이다 */
  const NODE_RADIUS = 15;
  const SPACING = spacingFor(NODE_RADIUS);

  function layoutRealGraph() {
    const source = getRenderGraph();
    const graph = {
      nodes: source.nodes.map((node) => ({ ...node })),
      links: source.links.map((link) => ({ ...link })),
    };
    const layout = applyPackedLayout(graph, { nodeRadius: NODE_RADIUS });
    return { graph, layout };
  }

  it("모든 엣지가 기준 길이에 정확히 놓여 있다", () => {
    const { graph, layout } = layoutRealGraph();

    for (const link of graph.links) {
      const a = layout.home.get(endpointId(link.source))!;
      const b = layout.home.get(endpointId(link.target))!;
      const actual = Math.hypot(a.x - b.x, a.y - b.y);
      // 기준 거리를 배치에서 재 왔으니 오차가 0 이어야 한다 = 당기지도 밀지도 않는다.
      expect(restLength(link, layout.home, SPACING)).toBeCloseTo(actual, 9);
    }
  });

  it("어떤 두 노드도 반발 거리 안에 들어오지 않는다", () => {
    // 렌더러가 쓰는 크기 식과 같아야 한다 — 보이는 원과 밀어내는 범위가 어긋나면
    // 여기서 재는 여유가 화면과 다른 값이 된다.
    const radiusOf = (node: { degree: number }) =>
      Math.min(Math.sqrt(1 + node.degree * 0.22) * 4, 15);

    const source = getRenderGraph();
    const graph = {
      nodes: source.nodes.map((node) => ({ ...node })),
      links: source.links.map((link) => ({ ...link })),
    };
    const layout = applyPackedLayout(graph, { nodeRadius: NODE_RADIUS });

    const placed = graph.nodes.map((node) => ({
      reach: collideRadius(node, radiusOf),
      at: layout.home.get(node.id)!,
    }));

    let tightest = Infinity;
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = placed[i];
        const b = placed[j];
        const gap = Math.hypot(a.at.x - b.at.x, a.at.y - b.at.y);
        tightest = Math.min(tightest, gap - (a.reach + b.reach));
      }
    }

    /*
     * 반발 거리를 키우다 보면 어느 순간 쉬고 있는 배치까지 서로 밀어내기 시작한다.
     * 그러면 원이 부풀면서 배치가 평형점이라는 성질이 깨진다 — 이 테스트가 그 선을
     * 지킨다. 실측한 한계는 2.73배이고, COLLIDE_RADIUS_SCALE 을 올릴 때 여기가
     * 먼저 빨개져야 한다.
     */
    expect(tightest).toBeGreaterThan(0);
  });
});

describe("느낌을 정하는 값", () => {
  it("식지 않는다", () => {
    // alpha 가 떨어지면 몇 초 만에 굳어 해파리가 아니라 표본이 된다.
    expect(JELLYFISH_ALPHA_DECAY).toBe(0);
  });

  it("d3 기본값보다 더 감쇠시킨다", () => {
    // 기본 0.4 로는 노드가 목표를 지나쳤다 되돌아오기를 반복해 출렁인다.
    expect(JELLYFISH_VELOCITY_DECAY).toBeGreaterThan(0.4);
    // 다만 너무 높이면 관성이 사라져 미끄러지는 느낌이 없어진다.
    expect(JELLYFISH_VELOCITY_DECAY).toBeLessThan(0.8);
  });
});
