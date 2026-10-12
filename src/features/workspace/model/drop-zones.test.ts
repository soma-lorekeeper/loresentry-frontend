import { describe, expect, it } from "vitest";

import {
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

  it("offers the other pane and the crossing edges once there are two panes", () => {
    expect(
      offeredZones(sideBySide(), { target: file("a"), from: "pane-1" }),
    ).toEqual({ edges: ["top", "bottom"], panes: ["pane-2"] });
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
    // 띠는 그 축의 22% 다: 가로 200px(상한), 세로 132px.
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

  it("falls to the pane in the middle", () => {
    expect(zoneAt({ x: 500, y: 300 }, AREA, ONE, all)).toEqual({
      kind: "pane",
      paneId: "pane-1",
    });
  });

  it("resolves a corner to the band the pointer is deeper inside", () => {
    // 왼쪽 띠 200px 가운데 100px(절반), 위쪽 띠 132px 가운데 20px(약 15%) → 위쪽.
    expect(zoneAt({ x: 100, y: 20 }, AREA, ONE, all)).toEqual({
      kind: "edge",
      edge: "top",
    });
  });

  it("returns nothing outside the area or over a pane that is not offered", () => {
    expect(zoneAt({ x: -5, y: 300 }, AREA, ONE, all)).toBeNull();
    // 같은 창의 탭은 제 창 안에 놓을 수 없다.
    const tabOnly: OfferedZones = {
      edges: ["left", "right", "top", "bottom"],
      panes: [],
    };
    expect(zoneAt({ x: 500, y: 300 }, AREA, ONE, tabOnly)).toBeNull();
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

    // 띠(200px)를 8px 벗어났다. 잡고 있던 가장자리면 유지하고, 아니면 창으로 넘어간다.
    expect(zoneAt({ x: 208, y: 300 }, AREA, ONE, all, left)).toEqual(left);
    expect(zoneAt({ x: 208, y: 300 }, AREA, ONE, all)).toEqual({
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
