import { describe, expect, it } from "vitest";

import {
  activeTabOf,
  createLayout,
  isWorkspaceLayout,
  layoutReducer,
  parseTabId,
  splitOf,
  tabIdFor,
  type DropEdge,
  type WorkspaceLayout,
} from "./layout";

const file = (fileId: string) => ({ kind: "file" as const, fileId });
const tabIds = (layout: WorkspaceLayout, index = 0) =>
  layout.panes[index].tabs.map((t) => t.id);

/** 한 창에 탭 a, b 가 열려 있다. */
function twoTabs() {
  return layoutReducer(createLayout(file("a")), {
    type: "open",
    target: file("b"),
  });
}

/** 좌우로 나뉘어 왼쪽(pane-1)에 a·b, 오른쪽(pane-2)에 c 가 있다. 오른쪽이 활성이다. */
function sideBySide() {
  return layoutReducer(twoTabs(), {
    type: "split",
    edge: "right",
    target: file("c"),
  });
}

describe("workspace layout", () => {
  it("replaces the new tab when the first file opens", () => {
    const next = layoutReducer(createLayout(), {
      type: "open",
      target: file("a"),
    });
    expect(tabIds(next)).toEqual(["file:a"]);
  });

  it("focuses an already open file instead of opening a duplicate", () => {
    let layout = layoutReducer(createLayout(), {
      type: "open",
      target: file("a"),
    });
    layout = layoutReducer(layout, { type: "open", target: { kind: "graph" } });
    layout = layoutReducer(layout, { type: "open", target: file("a") });
    expect(tabIds(layout)).toEqual(["file:a", "graph"]);
    expect(activeTabOf(layout.panes[0]).id).toBe("file:a");
  });

  it("falls back to a new tab when the last tab closes", () => {
    let layout = layoutReducer(createLayout(), {
      type: "open",
      target: file("a"),
    });
    layout = layoutReducer(layout, {
      type: "close",
      paneId: layout.panes[0].id,
      tabId: "file:a",
    });
    expect(layout.panes).toHaveLength(1);
    expect(tabIds(layout)).toEqual(["new"]);
  });

  it("stands the new tab in a pane of its own when every tab has been closed", () => {
    // 화면은 처음 보는 id 의 창을 "새로 생긴 창" 으로 그린다(지니 효과). 탭을 다 닫아 나오는 새 탭은
    // 어느 창이 마지막이었든 늘 그렇게 나와야 하므로, 방금 비워진 창과 다른 id 를 받는다.
    let layout = layoutReducer(createLayout(), {
      type: "open",
      target: file("a"),
    });
    expect(layout.panes[0].id).toBe("pane-1");

    layout = layoutReducer(layout, {
      type: "close",
      paneId: "pane-1",
      tabId: "file:a",
    });
    expect(layout.panes.map((pane) => pane.id)).toEqual(["pane-2"]);
    expect(layout.activePaneId).toBe("pane-2");

    // 마지막에 남은 창이 pane-2 였을 때도 같다.
    layout = layoutReducer(layout, { type: "open", target: file("b") });
    layout = layoutReducer(layout, {
      type: "close",
      paneId: "pane-2",
      tabId: "file:b",
    });
    expect(layout.panes.map((pane) => pane.id)).toEqual(["pane-1"]);
    expect(tabIds(layout)).toEqual(["new"]);
  });

  it("leaves a lone new tab as it is when it is closed", () => {
    // 닫을 것이 없다. 새 창으로 바꿔 세우면 같은 새 탭이 효과와 함께 다시 나온다.
    const layout = createLayout();
    expect(
      layoutReducer(layout, { type: "close", paneId: "pane-1", tabId: "new" }),
    ).toBe(layout);
  });

  it("activates the neighbour of a closed active tab", () => {
    let layout = createLayout(file("a"));
    layout = layoutReducer(layout, { type: "open", target: file("b") });
    layout = layoutReducer(layout, { type: "open", target: file("c") });
    layout = layoutReducer(layout, {
      type: "activate",
      paneId: "pane-1",
      tabId: "file:b",
    });
    layout = layoutReducer(layout, {
      type: "close",
      paneId: "pane-1",
      tabId: "file:b",
    });
    expect(activeTabOf(layout.panes[0]).id).toBe("file:c");
  });

  it("opens a second pane and removes it when its last tab closes", () => {
    let layout = createLayout(file("a"));
    layout = layoutReducer(layout, {
      type: "split",
      edge: "right",
      target: file("b"),
    });
    expect(layout.panes).toHaveLength(2);
    const side = layout.panes[1];
    expect(layout.activePaneId).toBe(side.id);
    layout = layoutReducer(layout, {
      type: "close",
      paneId: side.id,
      tabId: "file:b",
    });
    expect(layout.panes).toHaveLength(1);
    expect(layout.activePaneId).toBe("pane-1");
  });

  it("closes trashed files in every pane", () => {
    let layout = createLayout(file("a"));
    layout = layoutReducer(layout, { type: "open", target: file("b") });
    layout = layoutReducer(layout, {
      type: "split",
      edge: "right",
      target: file("a"),
    });
    layout = layoutReducer(layout, { type: "closeFiles", fileIds: ["a"] });
    expect(layout.panes).toHaveLength(1);
    expect(tabIds(layout)).toEqual(["file:b"]);
  });

  it("round-trips tab ids and rejects malformed stored layouts", () => {
    expect(parseTabId(tabIdFor(file("x")))).toEqual(file("x"));
    expect(parseTabId("graph")).toEqual({ kind: "graph" });
    expect(parseTabId("unknown")).toBeNull();
    expect(isWorkspaceLayout(createLayout())).toBe(true);
    expect(isWorkspaceLayout({ version: 1, panes: [] })).toBe(false);
    expect(isWorkspaceLayout(null)).toBe(false);
  });
});

describe("splitting by dropping on an edge", () => {
  it.each<[DropEdge, "row" | "column", number]>([
    ["left", "row", 0],
    ["right", "row", 1],
    ["top", "column", 0],
    ["bottom", "column", 1],
  ])("puts a new pane on the %s edge", (edge, direction, index) => {
    const layout = layoutReducer(twoTabs(), {
      type: "split",
      edge,
      target: file("c"),
    });

    expect(layout.panes).toHaveLength(2);
    expect(tabIds(layout, index)).toEqual(["file:c"]);
    expect(tabIds(layout, 1 - index)).toEqual(["file:a", "file:b"]);
    expect(layout.activePaneId).toBe(layout.panes[index].id);
    expect(layout.split).toEqual({ direction, ratio: 0.5 });
  });

  it("moves a dragged tab out of its pane instead of copying it", () => {
    const layout = layoutReducer(twoTabs(), {
      type: "split",
      edge: "right",
      target: file("b"),
      from: "pane-1",
    });

    expect(tabIds(layout, 0)).toEqual(["file:a"]);
    expect(tabIds(layout, 1)).toEqual(["file:b"]);
  });

  it("opens a copy when the dropped item is not a tab", () => {
    // 사이드바에서 끌어온 파일은 이미 열려 있어도 옮기지 않고 새 창에 하나 더 연다.
    const layout = layoutReducer(twoTabs(), {
      type: "split",
      edge: "bottom",
      target: file("a"),
    });

    expect(tabIds(layout, 0)).toEqual(["file:a", "file:b"]);
    expect(tabIds(layout, 1)).toEqual(["file:a"]);
  });

  it("does nothing for the only tab of the only pane", () => {
    const layout = createLayout(file("a"));

    expect(
      layoutReducer(layout, {
        type: "split",
        edge: "left",
        target: file("a"),
        from: "pane-1",
      }),
    ).toBe(layout);
  });

  it("gives every new pane one of two stable ids", () => {
    let layout = sideBySide();
    expect(layout.panes.map((p) => p.id)).toEqual(["pane-1", "pane-2"]);

    // 왼쪽 창을 닫은 뒤 다시 나누면 비어 있던 id 를 다시 쓴다.
    layout = layoutReducer(layout, {
      type: "close",
      paneId: "pane-1",
      tabId: "file:a",
    });
    layout = layoutReducer(layout, {
      type: "close",
      paneId: "pane-1",
      tabId: "file:b",
    });
    layout = layoutReducer(layout, {
      type: "split",
      edge: "left",
      target: file("d"),
    });
    expect(layout.panes.map((p) => p.id)).toEqual(["pane-1", "pane-2"]);
  });

  it("re-docks a pane whose only tab is dropped on a crossing edge", () => {
    // 오른쪽 창의 하나뿐인 탭을 위쪽에 놓으면 그 창이 통째로 위로 간다.
    const layout = layoutReducer(sideBySide(), {
      type: "split",
      edge: "top",
      target: file("c"),
      from: "pane-2",
    });

    expect(layout.panes.map((p) => p.id)).toEqual(["pane-2", "pane-1"]);
    expect(layout.split).toEqual({ direction: "column", ratio: 0.5 });
    expect(tabIds(layout, 0)).toEqual(["file:c"]);
    expect(tabIds(layout, 1)).toEqual(["file:a", "file:b"]);
  });

  it("re-docks the whole pane, however many tabs it holds, and shows the dragged tab", () => {
    // 창은 둘까지다. 가장자리는 창을 다시 놓는 자리라, 왼쪽 창의 탭 a 를 아래에 놓으면
    // 그 창이 통째로(a·b) 아래로 간다. 끌어온 a 가 그 창에서 보이는 탭이 된다.
    const layout = layoutReducer(sideBySide(), {
      type: "split",
      edge: "bottom",
      target: file("a"),
      from: "pane-1",
    });

    expect(layout.split).toEqual({ direction: "column", ratio: 0.5 });
    expect(layout.panes.map((p) => p.id)).toEqual(["pane-2", "pane-1"]);
    expect(tabIds(layout, 0)).toEqual(["file:c"]);
    expect(tabIds(layout, 1)).toEqual(["file:a", "file:b"]);
    expect(layout.panes[1].activeTabId).toBe("file:a");
    expect(layout.activePaneId).toBe("pane-1");
  });

  it("swaps the two panes when a tab is dropped on the far edge along the split", () => {
    // 좌우로 나뉜 채 오른쪽 창의 탭을 왼쪽 가장자리에 놓으면 두 창이 자리를 맞바꾼다.
    const layout = layoutReducer(sideBySide(), {
      type: "split",
      edge: "left",
      target: file("c"),
      from: "pane-2",
    });

    expect(layout.panes.map((p) => p.id)).toEqual(["pane-2", "pane-1"]);
    expect(tabIds(layout, 0)).toEqual(["file:c"]);
    expect(tabIds(layout, 1)).toEqual(["file:a", "file:b"]);
    expect(layout.split?.direction).toBe("row");
    expect(layout.activePaneId).toBe("pane-2");
  });

  it("keeps each pane's size when they swap", () => {
    // 왼쪽 30%, 오른쪽 70%. 맞바꾸면 70% 이던 창이 왼쪽에서 여전히 70% 다.
    const uneven = layoutReducer(sideBySide(), {
      type: "setSplitRatio",
      ratio: 0.3,
    });

    const layout = layoutReducer(uneven, {
      type: "split",
      edge: "left",
      target: file("c"),
      from: "pane-2",
    });

    expect(layout.split).toEqual({ direction: "row", ratio: 0.7 });
  });

  it("changes nothing when a pane's tab is dropped on the edge it already stands on", () => {
    const before = sideBySide();

    expect(
      layoutReducer(before, {
        type: "split",
        edge: "right",
        target: file("c"),
        from: "pane-2",
      }),
    ).toBe(before);
  });

  it("opens a dropped file in the pane already on that side along the split", () => {
    // 사이드바의 파일은 창이 아니다. 좌우로 나뉜 채 왼쪽 가장자리에 놓으면 왼쪽 창이 받는다.
    const layout = layoutReducer(sideBySide(), {
      type: "split",
      edge: "left",
      target: file("d"),
    });

    expect(layout.panes.map((p) => p.id)).toEqual(["pane-1", "pane-2"]);
    expect(tabIds(layout, 0)).toEqual(["file:a", "file:b", "file:d"]);
    expect(layout.activePaneId).toBe("pane-1");
  });

  it("opens a dropped file in the pane that is not in use when crossing", () => {
    // 오른쪽(pane-2)이 활성이다. 파일을 위에 놓으면 왼쪽 창이 받아 위로 올라간다.
    const layout = layoutReducer(sideBySide(), {
      type: "split",
      edge: "top",
      target: file("d"),
    });

    expect(layout.panes.map((p) => p.id)).toEqual(["pane-1", "pane-2"]);
    expect(tabIds(layout, 0)).toEqual(["file:a", "file:b", "file:d"]);
    expect(layout.activePaneId).toBe("pane-1");
    expect(layout.split?.direction).toBe("column");
  });
});

describe("moving a tab between panes", () => {
  it("opens the tab in the other pane and focuses it", () => {
    const layout = layoutReducer(sideBySide(), {
      type: "moveTab",
      from: "pane-1",
      tabId: "file:b",
      to: "pane-2",
    });

    expect(tabIds(layout, 0)).toEqual(["file:a"]);
    expect(tabIds(layout, 1)).toEqual(["file:c", "file:b"]);
    expect(layout.activePaneId).toBe("pane-2");
    expect(activeTabOf(layout.panes[1]).id).toBe("file:b");
  });

  it("inserts the tab before the one it was dropped on", () => {
    const layout = layoutReducer(sideBySide(), {
      type: "moveTab",
      from: "pane-1",
      tabId: "file:b",
      to: "pane-2",
      beforeId: "file:c",
    });

    expect(tabIds(layout, 1)).toEqual(["file:b", "file:c"]);
  });

  it("removes the source pane when its last tab leaves", () => {
    const layout = layoutReducer(sideBySide(), {
      type: "moveTab",
      from: "pane-2",
      tabId: "file:c",
      to: "pane-1",
    });

    expect(layout.panes).toHaveLength(1);
    expect(tabIds(layout)).toEqual(["file:a", "file:b", "file:c"]);
    expect(layout.activePaneId).toBe("pane-1");
  });

  it("does not duplicate a tab the destination already has", () => {
    let layout = sideBySide();
    layout = layoutReducer(layout, {
      type: "open",
      target: file("a"),
      paneId: "pane-2",
    });

    layout = layoutReducer(layout, {
      type: "moveTab",
      from: "pane-1",
      tabId: "file:a",
      to: "pane-2",
    });

    expect(tabIds(layout, 0)).toEqual(["file:b"]);
    expect(tabIds(layout, 1)).toEqual(["file:c", "file:a"]);
  });

  it("reorders within one pane, and moves to the end for null", () => {
    let layout = layoutReducer(twoTabs(), { type: "open", target: file("c") });

    layout = layoutReducer(layout, {
      type: "moveTab",
      from: "pane-1",
      tabId: "file:c",
      to: "pane-1",
      beforeId: "file:a",
    });
    expect(tabIds(layout)).toEqual(["file:c", "file:a", "file:b"]);

    layout = layoutReducer(layout, {
      type: "moveTab",
      from: "pane-1",
      tabId: "file:c",
      to: "pane-1",
      beforeId: null,
    });
    expect(tabIds(layout)).toEqual(["file:a", "file:b", "file:c"]);
  });

  it("returns the same layout when there is nothing to move", () => {
    const layout = sideBySide();

    expect(
      layoutReducer(layout, {
        type: "moveTab",
        from: "pane-1",
        tabId: "file:a",
        to: "pane-1",
      }),
    ).toBe(layout);
    expect(
      layoutReducer(layout, {
        type: "moveTab",
        from: "pane-1",
        tabId: "file:missing",
        to: "pane-2",
      }),
    ).toBe(layout);
  });
});

describe("split ratio and sidebar", () => {
  it("clamps the ratio and ignores a value that changes nothing", () => {
    let layout = sideBySide();

    layout = layoutReducer(layout, { type: "setSplitRatio", ratio: 0.05 });
    expect(layout.split?.ratio).toBe(0.2);
    layout = layoutReducer(layout, { type: "setSplitRatio", ratio: 0.6184 });
    expect(layout.split?.ratio).toBe(0.618);
    expect(layoutReducer(layout, { type: "setSplitRatio", ratio: 0.618 })).toBe(
      layout,
    );
  });

  it("has no ratio to set while there is one pane", () => {
    const layout = createLayout(file("a"));

    expect(layoutReducer(layout, { type: "setSplitRatio", ratio: 0.3 })).toBe(
      layout,
    );
  });

  it("reads layouts saved before the split existed as side by side halves", () => {
    const legacy = createLayout(file("a"));
    expect(splitOf(legacy)).toEqual({ direction: "row", ratio: 0.5 });

    // 서버는 배치를 해석하지 않고 그대로 돌려준다. 깨진 값도 여기서 받아낸다.
    const broken = {
      ...legacy,
      split: { direction: "diagonal", ratio: "wide" },
    } as unknown as WorkspaceLayout;
    expect(splitOf(broken)).toEqual({ direction: "row", ratio: 0.5 });
    expect(
      splitOf({ ...legacy, split: { direction: "column", ratio: 7 } }),
    ).toEqual({ direction: "column", ratio: 0.8 });
  });

  it("restores the split with a replaced layout", () => {
    // 투어는 시작할 때의 배치를 통째로 되돌린다. 분할도 함께 돌아와야 한다.
    const before = layoutReducer(sideBySide(), {
      type: "setSplitRatio",
      ratio: 0.3,
    });

    const restored = layoutReducer(createLayout(), {
      type: "replace",
      layout: before,
    });

    expect(splitOf(restored)).toEqual({ direction: "row", ratio: 0.3 });
  });

  it("sets the sidebar to a given state without toggling twice", () => {
    const layout = createLayout();

    expect(layoutReducer(layout, { type: "setSidebar", open: true })).toBe(
      layout,
    );
    expect(
      layoutReducer(layout, { type: "setSidebar", open: false }).sidebarOpen,
    ).toBe(false);
  });
});

describe("opening beside a pane", () => {
  const check = { kind: "setting-check" as const };

  it("deep-links to the setting check view", () => {
    expect(parseTabId("setting-check")).toEqual(check);
  });

  it("splits off a new pane when there is only one", () => {
    const start = layoutReducer(createLayout(file("a")), {
      type: "open",
      target: check,
    });
    const next = layoutReducer(start, {
      type: "openBeside",
      target: file("b"),
      from: "pane-1",
    });
    expect(next.panes).toHaveLength(2);
    expect(tabIds(next, 0)).toEqual(["file:a", "setting-check"]);
    expect(activeTabOf(next.panes[0]).id).toBe("setting-check");
    expect(tabIds(next, 1)).toEqual(["file:b"]);
    expect(next.activePaneId).toBe(next.panes[1].id);
  });

  it("moves the document out of the same pane instead of hiding the view", () => {
    const start = layoutReducer(createLayout(file("a")), {
      type: "open",
      target: check,
    });
    const next = layoutReducer(start, {
      type: "openBeside",
      target: file("a"),
      from: "pane-1",
    });
    expect(tabIds(next, 0)).toEqual(["setting-check"]);
    expect(tabIds(next, 1)).toEqual(["file:a"]);
  });

  it("goes to the tab when the other pane already has it", () => {
    const start = layoutReducer(sideBySide(), {
      type: "open",
      target: check,
      paneId: "pane-1",
    });
    const next = layoutReducer(start, {
      type: "openBeside",
      target: file("c"),
      from: "pane-1",
    });
    expect(next.panes).toHaveLength(2);
    expect(tabIds(next, 1)).toEqual(["file:c"]);
    expect(next.activePaneId).toBe("pane-2");
    expect(activeTabOf(next.panes[0]).id).toBe("setting-check");
  });

  it("opens in the other pane otherwise", () => {
    const start = layoutReducer(sideBySide(), {
      type: "open",
      target: check,
      paneId: "pane-1",
    });
    const next = layoutReducer(start, {
      type: "openBeside",
      target: file("d"),
      from: "pane-1",
    });
    expect(tabIds(next, 1)).toEqual(["file:c", "file:d"]);
    expect(activeTabOf(next.panes[1]).id).toBe("file:d");
  });
});
