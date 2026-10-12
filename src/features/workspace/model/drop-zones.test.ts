import { describe, expect, it } from "vitest";

import {
  landingShare,
  offeredZones,
  previewRect,
  sameZone,
  zoneAt,
  type OfferedZones,
  type Rect,
} from "./drop-zones";
import { createLayout, layoutReducer, type WorkspaceLayout } from "./layout";

const file = (fileId: string) => ({ kind: "file" as const, fileId });

/** 한 창에 탭 a, b */
function onePane(): WorkspaceLayout {
  return layoutReducer(createLayout(file("a")), {
    type: "open",
    target: file("b"),
  });
}

/** 좌우로 나뉘어 왼쪽(pane-1)에 a·b, 오른쪽(pane-2)에 c */
function sideBySide(): WorkspaceLayout {
  return layoutReducer(onePane(), {
    type: "split",
    edge: "right",
    target: file("c"),
  });
}

const AREA: Rect = { left: 0, top: 0, width: 1000, height: 600 };
const ONE = new Map([["pane-1", AREA]]);
const TWO = new Map<string, Rect>([
  ["pane-1", { left: 0, top: 0, width: 495, height: 600 }],
  ["pane-2", { left: 505, top: 0, width: 495, height: 600 }],
]);

describe("offeredZones", () => {
  it("offers every edge to a tab of a single pane, but not its own pane", () => {
    expect(
      offeredZones(onePane(), { target: file("a"), from: "pane-1" }),
    ).toEqual({ edges: ["left", "right", "top", "bottom"], panes: [] });
  });

  it("lets a sidebar file open in the single pane or beside it", () => {
    expect(offeredZones(onePane(), { target: file("z") })).toEqual({
      edges: ["left", "right", "top", "bottom"],
      panes: ["pane-1"],
    });
  });

  it("offers nothing to the only tab of the only pane", () => {
    expect(
      offeredZones(createLayout(file("a")), {
        target: file("a"),
        from: "pane-1",
      }),
    ).toEqual({ edges: [], panes: [] });
  });

  it("offers a tab the other pane and every edge its own pane is not standing on", () => {
    // 왼쪽 창의 탭이다. 위·아래는 방향을 바꾸고, 오른쪽은 두 창을 맞바꾼다. 왼쪽은 제자리다.
    expect(
      offeredZones(sideBySide(), { target: file("a"), from: "pane-1" }),
    ).toEqual({
      edges: ["top", "bottom", "right"],
      panes: ["pane-2"],
      swap: "right",
    });
    // 오른쪽 창의 탭이면 맞바꾸는 쪽이 왼쪽이다.
    expect(
      offeredZones(sideBySide(), { target: file("c"), from: "pane-2" }).swap,
    ).toBe("left");
  });

  it("swaps along a stacked split too", () => {
    const stacked = layoutReducer(onePane(), {
      type: "split",
      edge: "bottom",
      target: file("c"),
    });

    expect(
      offeredZones(stacked, { target: file("a"), from: "pane-1" }),
    ).toEqual({
      edges: ["left", "right", "bottom"],
      panes: ["pane-2"],
      swap: "bottom",
    });
  });

  it("offers both panes to a sidebar file, and the edges that cross a stacked split", () => {
    const stacked = layoutReducer(onePane(), {
      type: "split",
      edge: "bottom",
      target: file("c"),
    });

    expect(offeredZones(stacked, { target: file("z") })).toEqual({
      edges: ["left", "right"],
      panes: ["pane-1", "pane-2"],
    });
  });
});

describe("zoneAt", () => {
  const all: OfferedZones = {
    edges: ["left", "right", "top", "bottom"],
    panes: ["pane-1"],
  };

  it("picks the edge whose band the pointer is in", () => {
    // 띠는 그 축의 3분의 1 이다: 가로 333px, 세로 200px.
    expect(zoneAt({ x: 40, y: 300 }, AREA, ONE, all)).toEqual({
      kind: "edge",
      edge: "left",
    });
    expect(zoneAt({ x: 980, y: 300 }, AREA, ONE, all)).toEqual({
      kind: "edge",
      edge: "right",
    });
    expect(zoneAt({ x: 500, y: 20 }, AREA, ONE, all)).toEqual({
      kind: "edge",
      edge: "top",
    });
    expect(zoneAt({ x: 500, y: 590 }, AREA, ONE, all)).toEqual({
      kind: "edge",
      edge: "bottom",
    });
  });

  it("takes an edge well before the pointer reaches it", () => {
    // 가장자리에 바짝 붙이지 않아도 된다. 영역의 바깥 3분의 1 이면 그쪽이다.
    expect(zoneAt({ x: 300, y: 300 }, AREA, ONE, all)).toEqual({
      kind: "edge",
      edge: "left",
    });
    expect(zoneAt({ x: 500, y: 180 }, AREA, ONE, all)).toEqual({
      kind: "edge",
      edge: "top",
    });
  });

  it("falls to the pane in the middle", () => {
    expect(zoneAt({ x: 500, y: 300 }, AREA, ONE, all)).toEqual({
      kind: "pane",
      paneId: "pane-1",
    });
  });

  it("resolves a corner to the edge the pointer is nearer, measured against each band", () => {
    // 왼쪽 띠 333px 가운데 100px(30%), 위쪽 띠 200px 가운데 20px(10%) → 위쪽.
    expect(zoneAt({ x: 100, y: 20 }, AREA, ONE, all)).toEqual({
      kind: "edge",
      edge: "top",
    });
  });

  it("returns nothing outside the area", () => {
    expect(zoneAt({ x: -5, y: 300 }, AREA, ONE, all)).toBeNull();
  });

  it("splits the whole area between the edges when there is no pane to drop into", () => {
    // 하나뿐인 창의 탭은 제 창 안에 놓을 수 없다. 가운데를 비워 두지 않고, 어디에 놓든
    // 가장 가까운 가장자리로 간다.
    const tabOnly: OfferedZones = {
      edges: ["left", "right", "top", "bottom"],
      panes: [],
    };

    expect(zoneAt({ x: 400, y: 300 }, AREA, ONE, tabOnly)).toEqual({
      kind: "edge",
      edge: "left",
    });
    expect(zoneAt({ x: 600, y: 300 }, AREA, ONE, tabOnly)).toEqual({
      kind: "edge",
      edge: "right",
    });
    expect(zoneAt({ x: 500, y: 250 }, AREA, ONE, tabOnly)).toEqual({
      kind: "edge",
      edge: "top",
    });
    expect(zoneAt({ x: 500, y: 350 }, AREA, ONE, tabOnly)).toEqual({
      kind: "edge",
      edge: "bottom",
    });
  });

  describe("with two panes and a tab from the left one", () => {
    const offered: OfferedZones = {
      edges: ["top", "bottom", "right"],
      panes: ["pane-2"],
      swap: "right",
    };

    it("swaps on the outer half of the other pane and moves the tab on its inner half", () => {
      // 오른쪽 창은 505…1000 이다. 바깥쪽 절반(752.5 부터)이 맞바꾸기다.
      expect(zoneAt({ x: 900, y: 300 }, AREA, TWO, offered)).toEqual({
        kind: "edge",
        edge: "right",
      });
      expect(zoneAt({ x: 600, y: 300 }, AREA, TWO, offered)).toEqual({
        kind: "pane",
        paneId: "pane-2",
      });
    });

    it("offers nothing in the middle of the tab's own pane, but still the crossing edges", () => {
      expect(zoneAt({ x: 200, y: 300 }, AREA, TWO, offered)).toBeNull();
      expect(zoneAt({ x: 200, y: 60 }, AREA, TWO, offered)).toEqual({
        kind: "edge",
        edge: "top",
      });
    });

    it("keeps room to move the tab into a pane that has been made small", () => {
      // 오른쪽 창이 200px 뿐이다. 맞바꾸는 띠도 그 절반(100px)이라 안쪽 절반은 옮기기로 남는다.
      const uneven = new Map<string, Rect>([
        ["pane-1", { left: 0, top: 0, width: 790, height: 600 }],
        ["pane-2", { left: 800, top: 0, width: 200, height: 600 }],
      ]);

      expect(zoneAt({ x: 850, y: 300 }, AREA, uneven, offered)).toEqual({
        kind: "pane",
        paneId: "pane-2",
      });
      expect(zoneAt({ x: 950, y: 300 }, AREA, uneven, offered)).toEqual({
        kind: "edge",
        edge: "right",
      });
    });
  });

  it("gives the gap between two panes to the nearer one", () => {
    const offered: OfferedZones = { edges: [], panes: ["pane-1", "pane-2"] };

    expect(zoneAt({ x: 498, y: 300 }, AREA, TWO, offered)).toEqual({
      kind: "pane",
      paneId: "pane-1",
    });
    expect(zoneAt({ x: 503, y: 300 }, AREA, TWO, offered)).toEqual({
      kind: "pane",
      paneId: "pane-2",
    });
  });

  it("holds an edge a little past its band so the preview does not flicker", () => {
    const left = { kind: "edge", edge: "left" } as const;

    // 띠(333px)를 8px 벗어났다. 잡고 있던 가장자리면 유지하고, 아니면 창으로 넘어간다.
    expect(zoneAt({ x: 341, y: 300 }, AREA, ONE, all, left)).toEqual(left);
    expect(zoneAt({ x: 341, y: 300 }, AREA, ONE, all)).toEqual({
      kind: "pane",
      paneId: "pane-1",
    });
  });
});

describe("previewRect", () => {
  it("shows the half a new sheet will take, leaving half the gap", () => {
    expect(previewRect({ kind: "edge", edge: "left" }, AREA, ONE, 10)).toEqual({
      left: 0,
      top: 0,
      width: 495,
      height: 600,
    });
    expect(previewRect({ kind: "edge", edge: "right" }, AREA, ONE, 10)).toEqual(
      { left: 505, top: 0, width: 495, height: 600 },
    );
    expect(previewRect({ kind: "edge", edge: "top" }, AREA, ONE, 10)).toEqual({
      left: 0,
      top: 0,
      width: 1000,
      height: 295,
    });
    expect(
      previewRect({ kind: "edge", edge: "bottom" }, AREA, ONE, 10),
    ).toEqual({ left: 0, top: 305, width: 1000, height: 295 });
  });

  it("covers the pane itself for a pane zone", () => {
    expect(
      previewRect({ kind: "pane", paneId: "pane-2" }, AREA, TWO, 10),
    ).toEqual(TWO.get("pane-2"));
  });

  it("sizes an edge by the share the pane will have there", () => {
    // 30% 를 차지하던 창이 오른쪽으로 가면, 미리보기도 오른쪽 30% 다.
    expect(
      previewRect({ kind: "edge", edge: "right" }, AREA, TWO, 10, 0.3),
    ).toEqual({ left: 703, top: 0, width: 297, height: 600 });
  });
});

describe("landingShare", () => {
  it("is half for a new split", () => {
    expect(landingShare(onePane(), { target: file("z") }, "left")).toBe(0.5);
  });

  it("is the pane's own size when two panes swap", () => {
    // 왼쪽 30%, 오른쪽 70%. 왼쪽 창의 탭을 오른쪽 끝에 놓으면 그 창은 오른쪽에서도 30% 다.
    const uneven = layoutReducer(sideBySide(), {
      type: "setSplitRatio",
      ratio: 0.3,
    });

    expect(
      landingShare(uneven, { target: file("a"), from: "pane-1" }, "right"),
    ).toBeCloseTo(0.3);
  });

  it("is half again when the split turns", () => {
    const uneven = layoutReducer(sideBySide(), {
      type: "setSplitRatio",
      ratio: 0.3,
    });

    expect(
      landingShare(uneven, { target: file("a"), from: "pane-1" }, "top"),
    ).toBe(0.5);
  });
});

describe("sameZone", () => {
  it("compares zones by where they are", () => {
    expect(sameZone(null, null)).toBe(true);
    expect(sameZone({ kind: "edge", edge: "top" }, null)).toBe(false);
    expect(
      sameZone({ kind: "edge", edge: "top" }, { kind: "edge", edge: "top" }),
    ).toBe(true);
    expect(
      sameZone(
        { kind: "pane", paneId: "pane-1" },
        { kind: "pane", paneId: "pane-2" },
      ),
    ).toBe(false);
  });
});
