import { describe, expect, it } from "vitest";

import { genieGeometry, genieQuads, quadTransform, type Quad } from "./genie";

/** 오른쪽 절반에 서는 창(뷰포트 좌표). */
const PANE = { left: 900, top: 10, width: 480, height: 700 };
/** 왼쪽 사이드바의 파일 줄. 창보다 왼쪽·아래에 있다. */
const ROW = { left: 12, top: 520, width: 300, height: 28 };
const SLICE = 48;

const xs = (quad: Quad) => Object.values(quad).map((point) => point.x);
const ys = (quad: Quad) => Object.values(quad).map((point) => point.y);
/** 조각의 가로·세로 범위 */
const extent = (quad: Quad) => ({
  left: Math.min(...xs(quad)),
  right: Math.max(...xs(quad)),
  top: Math.min(...ys(quad)),
  bottom: Math.max(...ys(quad)),
});

describe("genieGeometry", () => {
  it("flows sideways into the edge of a button beside the pane", () => {
    const geometry = genieGeometry(PANE, ROW, SLICE);

    expect(geometry.axis).toBe("x");
    // 단추가 창의 왼쪽에 있다. 창은 단추의 오른쪽 가장자리로 드나든다.
    expect(geometry.sign).toBe(-1);
    expect(geometry.edge).toBe(ROW.left + ROW.width);
    // 480px 을 48px 씩 썬다. 먼 쪽(오른쪽) 변부터 센다.
    expect(geometry.slices).toHaveLength(10);
    expect(geometry.slices[0]).toEqual({
      left: 432,
      top: 0,
      width: 48,
      height: 700,
    });
    expect(geometry.slices.at(-1)!.left).toBe(0);
  });

  it("cuts thicker slices rather than more than the limit", () => {
    const geometry = genieGeometry(PANE, ROW, SLICE, 4);

    expect(geometry.slices).toHaveLength(4);
    expect(geometry.slices[0]).toEqual({
      left: 360,
      top: 0,
      width: 120,
      height: 700,
    });
  });

  it("flows downward out of a tab above the pane", () => {
    const tab = { left: 400, top: 14, width: 120, height: 36 };
    const below = { left: 330, top: 365, width: 1100, height: 345 };

    const geometry = genieGeometry(below, tab, SLICE);

    expect(geometry.axis).toBe("y");
    expect(geometry.sign).toBe(-1);
    expect(geometry.edge).toBe(tab.top + tab.height);
    // 먼 쪽(아래) 변부터 센다.
    expect(geometry.slices[0].top).toBeCloseTo(345 - geometry.slices[0].height);
  });

  /**
   * 하나뿐인 창의 탭을 끌어 새 창을 만들면, 그 탭은 새 창이 설 자리 안에 있다. 창이 제 안에서
   * 나올 수는 없으니 탭을 창의 바로 위로 밀어 올려, 위에서 내려오게 한다.
   */
  it("moves a button that sits inside the pane to just outside it", () => {
    const tab = { left: 400, top: 14, width: 120, height: 36 };
    const pane = { left: 330, top: 10, width: 545, height: 700 };

    const geometry = genieGeometry(pane, tab, SLICE);

    expect(geometry.axis).toBe("y");
    expect(geometry.source).toEqual({ ...tab, top: pane.top - tab.height });
    expect(geometry.edge).toBe(pane.top);
  });
});

describe("genieQuads", () => {
  const geometry = genieGeometry(PANE, ROW, SLICE);

  it("ends with every slice exactly where it belongs in the pane", () => {
    const quads = genieQuads(PANE, geometry, 1);

    quads.forEach((quad, index) => {
      const slice = geometry.slices[index];
      const box = extent(quad);
      expect(box.left).toBeCloseTo(PANE.left + slice.left);
      expect(box.right).toBeCloseTo(PANE.left + slice.left + slice.width);
      expect(box.top).toBeCloseTo(PANE.top);
      expect(box.bottom).toBeCloseTo(PANE.top + PANE.height);
      // 뒤집히지 않았다: 왼쪽 위 꼭짓점이 정말 왼쪽 위다.
      expect(quad.topLeft).toEqual({ x: box.left, y: box.top });
    });
  });

  it("starts with the whole pane tucked behind the button's edge", () => {
    const quads = genieQuads(PANE, geometry, 0);

    for (const quad of quads) {
      const box = extent(quad);
      // 단추의 오른쪽 가장자리 너머(왼쪽)에, 단추의 높이 안에 눌려 있다. 이 부분은 가려진다.
      expect(box.right).toBeLessThanOrEqual(geometry.edge + 0.001);
      expect(box.left).toBeGreaterThanOrEqual(ROW.left - 0.001);
      expect(box.top).toBeGreaterThanOrEqual(ROW.top - 0.001);
      expect(box.bottom).toBeLessThanOrEqual(ROW.top + ROW.height + 0.001);
    }
  });

  /**
   * 미끄러져 나오는 중의 모양이 지니다. 조각들은 서로 이어진 채 단추에서 창 쪽으로 늘어서고,
   * 단추에 가까운 조각일수록 좁다(단추의 높이), 멀수록 넓다(창의 높이).
   */
  it("pours out as a funnel: narrow at the button, widening toward the pane", () => {
    const quads = genieQuads(PANE, geometry, 0.35);
    // 아직 단추 밖으로 나온 조각들만 본다(나머지는 가려져 있다).
    const out = quads.filter((quad) => extent(quad).right > geometry.edge + 1);
    expect(out.length).toBeGreaterThan(2);

    const heights = out.map((quad) => {
      const box = extent(quad);
      return box.bottom - box.top;
    });
    // 조각은 먼 쪽(앞머리)부터 센다. 뒤로 갈수록 단추에 가깝고, 좁아진다.
    expect(heights).toEqual([...heights].sort((a, b) => b - a));
    expect(heights.at(-1)!).toBeLessThan(PANE.height / 2);

    // 이웃한 조각은 변을 함께 쓴다. 틈이 없다.
    for (let index = 0; index + 1 < quads.length; index += 1) {
      expect(quads[index].topLeft.x).toBeCloseTo(quads[index + 1].topRight.x);
      expect(quads[index].topLeft.y).toBeCloseTo(quads[index + 1].topRight.y);
      expect(quads[index].bottomLeft.y).toBeCloseTo(
        quads[index + 1].bottomRight.y,
      );
    }
  });

  /**
   * 꺼내는 순서는 "미끄러져 나온 뒤 곡선이 펴진다" 다. 미끄러짐이 끝난 때(전체의 70%)에는
   * 앞머리가 제자리에 닿아 있지만, 곡선은 아직 다 펴지지 않아 뒤쪽이 좁다.
   */
  it("finishes sliding before the curves have straightened", () => {
    const quads = genieQuads(PANE, geometry, 0.7);
    const head = extent(quads[0]);
    const tail = extent(quads.at(-1)!);

    expect(head.right).toBeCloseTo(PANE.left + PANE.width);
    expect(tail.left).toBeCloseTo(PANE.left);
    // 뒤쪽 조각의 단추 쪽 변은 아직 창의 높이에 못 미친다.
    const tailEdge = quads.at(-1)!.bottomLeft.y - quads.at(-1)!.topLeft.y;
    expect(tailEdge).toBeLessThan(PANE.height - 1);
    expect(tailEdge).toBeGreaterThan(PANE.height / 2);
  });
});

describe("quadTransform", () => {
  /** `matrix3d(...)` 을 풀어, 사각형 안의 점이 화면의 어디로 가는지 계산한다. */
  function apply(transform: string, x: number, y: number) {
    const m = transform.slice("matrix3d(".length, -1).split(",").map(Number);
    const w = m[3] * x + m[7] * y + m[15];
    return {
      x: (m[0] * x + m[4] * y + m[12]) / w,
      y: (m[1] * x + m[5] * y + m[13]) / w,
    };
  }

  it("carries the corners of a rectangle onto the corners of the quad", () => {
    // 왼쪽이 좁고 오른쪽이 넓은 사다리꼴. 늘이기·기울이기만으로는 만들 수 없는 모양이다.
    const quad: Quad = {
      topLeft: { x: 100, y: 300 },
      bottomLeft: { x: 100, y: 330 },
      topRight: { x: 148, y: 250 },
      bottomRight: { x: 148, y: 400 },
    };

    const transform = quadTransform(48, 700, quad);

    for (const [x, y, corner] of [
      [0, 0, quad.topLeft],
      [48, 0, quad.topRight],
      [48, 700, quad.bottomRight],
      [0, 700, quad.bottomLeft],
    ] as const) {
      const moved = apply(transform, x, y);
      expect(moved.x).toBeCloseTo(corner.x, 6);
      expect(moved.y).toBeCloseTo(corner.y, 6);
    }
  });

  it("is a plain move for a slice already in place", () => {
    const quad: Quad = {
      topLeft: { x: 900, y: 10 },
      topRight: { x: 948, y: 10 },
      bottomLeft: { x: 900, y: 710 },
      bottomRight: { x: 948, y: 710 },
    };

    expect(quadTransform(48, 700, quad)).toBe(
      "matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 900, 10, 0, 1)",
    );
  });
});
