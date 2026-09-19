import { describe, expect, it } from "vitest";

import {
  activeTabOf,
  createLayout,
  isWorkspaceLayout,
  layoutReducer,
  parseTabId,
  tabIdFor,
  type WorkspaceLayout,
} from "./layout";

const file = (fileId: string) => ({ kind: "file" as const, fileId });
const tabIds = (layout: WorkspaceLayout, index = 0) =>
  layout.panes[index].tabs.map((t) => t.id);

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
    layout = layoutReducer(layout, { type: "openToSide", target: file("b") });
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

  it("reuses the other pane once the split limit is reached", () => {
    let layout = createLayout(file("a"));
    layout = layoutReducer(layout, { type: "openToSide", target: file("b") });
    layout = layoutReducer(layout, { type: "focusPane", paneId: "pane-1" });
    layout = layoutReducer(layout, { type: "openToSide", target: file("c") });
    expect(layout.panes).toHaveLength(2);
    expect(tabIds(layout, 1)).toEqual(["file:b", "file:c"]);
  });

  it("closes trashed files in every pane", () => {
    let layout = createLayout(file("a"));
    layout = layoutReducer(layout, { type: "open", target: file("b") });
    layout = layoutReducer(layout, { type: "openToSide", target: file("a") });
    layout = layoutReducer(layout, { type: "closeFiles", fileIds: ["a"] });
    expect(layout.panes).toHaveLength(1);
    expect(tabIds(layout)).toEqual(["file:b"]);
  });

  it("reorders tabs within a pane", () => {
    let layout = createLayout(file("a"));
    layout = layoutReducer(layout, { type: "open", target: file("b") });
    layout = layoutReducer(layout, { type: "open", target: file("c") });
    layout = layoutReducer(layout, {
      type: "reorder",
      paneId: "pane-1",
      sourceId: "file:c",
      targetId: "file:a",
    });
    expect(tabIds(layout)).toEqual(["file:c", "file:a", "file:b"]);
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
