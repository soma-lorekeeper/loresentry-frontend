/**
 * 연출 계약 테스트.
 *
 * 애니메이션은 눈으로 보면 "대충 맞는 것 같다"까지밖에 확인이 안 된다. 여기서
 * 못 박는 것은 **끝났을 때**다 — 좌표가 계산된 자리를 정확히 찍고, 그러고 나서
 * 못이 뽑혀 물리로 넘어가야 한다. 못이 남으면 그래프가 굳어버린다.
 *
 * rAF 와 시계를 직접 쥐고 돌린다. 실제 프레임을 기다리면 테스트가 느려지고,
 * 무엇보다 "1,100ms 에 끝난다"를 확인할 방법이 없다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LayoutNode, PackedLayout } from "./packed-layout";
import {
  COLLAPSE_MS,
  EXPAND_MS,
  FIRST_EXPAND_MS,
  revealPoint,
  startReveal,
} from "./reveal";

/** 시계와 rAF 를 손으로 돌리는 장치 */
function makeClock() {
  let now = 0;
  let pending: FrameRequestCallback[] = [];

  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pending.push(callback);
    return pending.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});

  return {
    /** ms 만큼 시계를 밀고 예약된 프레임을 한 번 돌린다 */
    tick(ms: number) {
      now += ms;
      const due = pending;
      pending = [];
      for (const callback of due) callback(now);
    },
    get frameCount() {
      return pending.length;
    },
  };
}

function makeNodes(count: number): LayoutNode[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `n${i}`,
    degree: 0,
  }));
}

/** 노드를 원 위에 고르게 앉히는 목표 자리 */
function makeHome(nodes: LayoutNode[]): PackedLayout["home"] {
  const home = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, index) => {
    home.set(node.id, { x: 100 * (index + 1), y: 50 * (index + 1) });
  });
  return home;
}

describe("보간", () => {
  it("t=0 이면 시작점", () => {
    expect(revealPoint({ x: 1, y: 2 }, { x: 9, y: 9 }, 0)).toEqual({
      x: 1,
      y: 2,
    });
  });

  it("t=1 이면 도착점을 정확히 찍는다", () => {
    expect(revealPoint({ x: 1, y: 2 }, { x: 9, y: 8 }, 1)).toEqual({
      x: 9,
      y: 8,
    });
  });

  it("중간값은 두 점 사이에 있다", () => {
    const mid = revealPoint({ x: 0, y: 0 }, { x: 10, y: 20 }, 0.5);
    expect(mid).toEqual({ x: 5, y: 10 });
  });
});

describe("수축 → 펼침", () => {
  let clock: ReturnType<typeof makeClock>;

  beforeEach(() => {
    clock = makeClock();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("첫 진입은 중심에서 시작한다", () => {
    const nodes = makeNodes(3);
    startReveal(nodes, makeHome(nodes), { first: true });

    // 아직 한 프레임도 돌지 않았지만 좌표는 이미 중심에 모여 있어야 한다.
    // 그러지 않으면 첫 프레임에 계산된 자리가 한 번 번쩍이고 나서 모인다.
    expect(nodes.every((node) => node.x === 0 && node.y === 0)).toBe(true);
  });

  it("첫 진입은 1,100ms 에 계산된 자리를 정확히 찍는다", () => {
    const nodes = makeNodes(3);
    const home = makeHome(nodes);
    let done = false;
    startReveal(nodes, home, { first: true }, () => {
      done = true;
    });

    clock.tick(FIRST_EXPAND_MS - 1);
    expect(done).toBe(false);

    clock.tick(1);
    expect(done).toBe(true);
    for (const node of nodes) {
      const spot = home.get(node.id)!;
      expect(node.x).toBe(spot.x);
      expect(node.y).toBe(spot.y);
    }
  });

  it("첫 진입이 아니면 수축을 먼저 하고 그다음 펼친다", () => {
    const nodes = makeNodes(2);
    // 어딘가에 이미 자리를 잡고 있는 상태.
    nodes[0].x = 400;
    nodes[0].y = 0;
    nodes[1].x = -400;
    nodes[1].y = 0;
    const home = makeHome(nodes);
    let done = false;
    startReveal(nodes, home, { first: false }, () => {
      done = true;
    });

    // 수축 절반. 원래 자리와 중심 사이 어딘가에 있어야 한다.
    clock.tick(COLLAPSE_MS / 2);
    expect(nodes[0].x).toBeGreaterThan(0);
    expect(nodes[0].x).toBeLessThan(400);

    // 수축 끝. 중심에 모인다.
    clock.tick(COLLAPSE_MS / 2);
    expect(nodes[0].x).toBe(0);
    expect(nodes[1].x).toBe(0);
    expect(done).toBe(false);

    // 펼침 끝.
    clock.tick(EXPAND_MS);
    expect(done).toBe(true);
    for (const node of nodes) {
      expect(node.x).toBe(home.get(node.id)!.x);
    }
  });

  it("끝나면 못을 뽑아 물리에 넘긴다", () => {
    const nodes = makeNodes(2);
    const home = makeHome(nodes);
    startReveal(nodes, home, { first: true });
    clock.tick(FIRST_EXPAND_MS);

    for (const node of nodes) {
      const spot = home.get(node.id)!;
      // 좌표는 계산된 자리를 정확히 찍고,
      expect(node.x).toBe(spot.x);
      expect(node.y).toBe(spot.y);
      // 못은 뽑혀 있어야 한다 — fx 가 남으면 d3 가 그 자리에 붙들어 굳는다.
      expect(node.fx).toBeUndefined();
      expect(node.fy).toBeUndefined();
    }
  });

  it("도는 동안에는 못박혀 있다", () => {
    const nodes = makeNodes(2);
    startReveal(nodes, makeHome(nodes), { first: true });
    clock.tick(FIRST_EXPAND_MS / 2);

    // 연출과 힘이 서로 밀면 그림이 떨린다. 다 펼칠 때까지는 우리가 좌표를 쥔다.
    expect(nodes.every((node) => typeof node.fx === "number")).toBe(true);
  });

  it("멈추면 그 뒤로 좌표를 건드리지 않는다", () => {
    const nodes = makeNodes(1);
    const home = makeHome(nodes);
    const stop = startReveal(nodes, home, { first: true });

    clock.tick(FIRST_EXPAND_MS / 2);
    const halfway = nodes[0].x;
    stop();
    clock.tick(FIRST_EXPAND_MS);

    // 필터를 연달아 누르면 이전 연출이 남아 새 좌표를 덮어쓸 수 있다.
    expect(nodes[0].x).toBe(halfway);
  });

  it("home 에 없는 노드는 중심으로 간다", () => {
    const nodes = makeNodes(1);
    startReveal(nodes, new Map(), { first: true });
    clock.tick(FIRST_EXPAND_MS);
    expect(nodes[0].x).toBe(0);
    expect(nodes[0].y).toBe(0);
  });
});
