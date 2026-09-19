export const WORKSPACE_VIEW_KINDS = [
  "new",
  "search",
  "graph",
  "timeline",
  "memo",
  "trash",
  "settings",
  "help",
] as const;

export type WorkspaceViewKind = (typeof WORKSPACE_VIEW_KINDS)[number];

export type WorkspaceTarget =
  { kind: WorkspaceViewKind } | { kind: "file"; fileId: string };

export interface WorkspaceTab {
  id: string;
  target: WorkspaceTarget;
}

export interface WorkspacePane {
  id: string;
  tabs: WorkspaceTab[];
  activeTabId: string;
}

export type MemoDock = "right" | "below";

export interface WorkspacePanels {
  memoOpen: boolean;
  memoDock: MemoDock;
  memoRightWidth: number;
  memoBelowHeight: number;
  aiChatOpen: boolean;
}

// 요구사항 §3: 프로젝트를 다시 열면 그래프 보기(분류 필터·에피소드)도 복원한다.
// kinds 가 null 이면 아직 사용자가 고른 적이 없다는 뜻이고, 그래프 규모로 기본값을 정한다.
export interface GraphViewState {
  kinds: string[] | null;
  episodeIds: string[];
}

export interface WorkspaceLayout {
  version: 1;
  panes: WorkspacePane[];
  activePaneId: string;
  sidebarOpen: boolean;
  panels: WorkspacePanels;
  graphView?: GraphViewState;
}

export const MAX_PANES = 2;

export const DEFAULT_PANELS: WorkspacePanels = {
  memoOpen: false,
  memoDock: "right",
  memoRightWidth: 320,
  memoBelowHeight: 240,
  aiChatOpen: false,
};

export function tabIdFor(target: WorkspaceTarget): string {
  return target.kind === "file" ? `file:${target.fileId}` : target.kind;
}

export function parseTabId(tabId: string): WorkspaceTarget | null {
  if (tabId.startsWith("file:")) {
    const fileId = tabId.slice("file:".length);
    return fileId ? { kind: "file", fileId } : null;
  }
  return (WORKSPACE_VIEW_KINDS as readonly string[]).includes(tabId)
    ? { kind: tabId as WorkspaceViewKind }
    : null;
}

function tab(target: WorkspaceTarget): WorkspaceTab {
  return { id: tabIdFor(target), target };
}

function pane(id: string, target: WorkspaceTarget): WorkspacePane {
  const first = tab(target);
  return { id, tabs: [first], activeTabId: first.id };
}

export function createLayout(
  initial: WorkspaceTarget = { kind: "new" },
): WorkspaceLayout {
  return {
    version: 1,
    panes: [pane("pane-1", initial)],
    activePaneId: "pane-1",
    sidebarOpen: true,
    panels: { ...DEFAULT_PANELS },
  };
}

export type LayoutAction =
  | { type: "open"; target: WorkspaceTarget; paneId?: string }
  | { type: "activate"; paneId: string; tabId: string }
  | { type: "close"; paneId: string; tabId: string }
  | { type: "reorder"; paneId: string; sourceId: string; targetId: string }
  | { type: "openToSide"; target: WorkspaceTarget }
  | { type: "focusPane"; paneId: string }
  | { type: "closeFiles"; fileIds: string[] }
  | { type: "toggleSidebar" }
  | { type: "setPanels"; panels: Partial<WorkspacePanels> }
  | { type: "setGraphView"; graphView: GraphViewState }
  | { type: "replace"; layout: WorkspaceLayout };

function updatePane(
  layout: WorkspaceLayout,
  paneId: string,
  update: (pane: WorkspacePane) => WorkspacePane | null,
): WorkspaceLayout {
  const panes = layout.panes.flatMap((current) => {
    if (current.id !== paneId) return [current];
    const next = update(current);
    return next ? [next] : [];
  });
  if (panes.length === 0) return createLayoutFrom(layout);
  const activePaneId = panes.some((p) => p.id === layout.activePaneId)
    ? layout.activePaneId
    : panes[panes.length - 1].id;
  return { ...layout, panes, activePaneId };
}

function createLayoutFrom(layout: WorkspaceLayout): WorkspaceLayout {
  const fresh = createLayout();
  return { ...layout, panes: fresh.panes, activePaneId: fresh.activePaneId };
}

function openInPane(
  pane: WorkspacePane,
  target: WorkspaceTarget,
): WorkspacePane {
  const next = tab(target);
  if (pane.tabs.some((t) => t.id === next.id)) {
    return { ...pane, activeTabId: next.id };
  }
  const active = pane.tabs.find((t) => t.id === pane.activeTabId);
  const tabs =
    active?.target.kind === "new"
      ? pane.tabs.map((t) => (t.id === active.id ? next : t))
      : [...pane.tabs, next];
  return { ...pane, tabs, activeTabId: next.id };
}

function closeInPane(pane: WorkspacePane, tabId: string): WorkspacePane | null {
  const index = pane.tabs.findIndex((t) => t.id === tabId);
  if (index < 0) return pane;
  const tabs = pane.tabs.filter((t) => t.id !== tabId);
  if (tabs.length === 0) return null;
  const activeTabId =
    pane.activeTabId === tabId
      ? tabs[Math.min(index, tabs.length - 1)].id
      : pane.activeTabId;
  return { ...pane, tabs, activeTabId };
}

export function layoutReducer(
  layout: WorkspaceLayout,
  action: LayoutAction,
): WorkspaceLayout {
  switch (action.type) {
    case "open": {
      const paneId = action.paneId ?? layout.activePaneId;
      return {
        ...updatePane(layout, paneId, (p) => openInPane(p, action.target)),
        activePaneId: paneId,
      };
    }
    case "activate":
      return {
        ...updatePane(layout, action.paneId, (p) =>
          p.tabs.some((t) => t.id === action.tabId)
            ? { ...p, activeTabId: action.tabId }
            : p,
        ),
        activePaneId: action.paneId,
      };
    case "close":
      return updatePane(layout, action.paneId, (p) =>
        closeInPane(p, action.tabId),
      );
    case "reorder":
      return updatePane(layout, action.paneId, (p) => {
        const from = p.tabs.findIndex((t) => t.id === action.sourceId);
        const to = p.tabs.findIndex((t) => t.id === action.targetId);
        if (from < 0 || to < 0 || from === to) return p;
        const tabs = [...p.tabs];
        const [moved] = tabs.splice(from, 1);
        tabs.splice(to, 0, moved);
        return { ...p, tabs };
      });
    case "openToSide": {
      if (layout.panes.length >= MAX_PANES) {
        const other =
          layout.panes.find((p) => p.id !== layout.activePaneId) ??
          layout.panes[0];
        return layoutReducer(layout, {
          type: "open",
          target: action.target,
          paneId: other.id,
        });
      }
      const id = `pane-${Date.now().toString(36)}`;
      return {
        ...layout,
        panes: [...layout.panes, pane(id, action.target)],
        activePaneId: id,
      };
    }
    case "focusPane":
      return layout.panes.some((p) => p.id === action.paneId)
        ? { ...layout, activePaneId: action.paneId }
        : layout;
    case "closeFiles": {
      const ids = new Set(action.fileIds.map((id) => `file:${id}`));
      let next = layout;
      for (const p of layout.panes) {
        for (const t of p.tabs) {
          if (ids.has(t.id)) {
            next = layoutReducer(next, {
              type: "close",
              paneId: p.id,
              tabId: t.id,
            });
          }
        }
      }
      return next;
    }
    case "toggleSidebar":
      return { ...layout, sidebarOpen: !layout.sidebarOpen };
    case "setGraphView":
      return { ...layout, graphView: action.graphView };
    case "setPanels":
      return { ...layout, panels: { ...layout.panels, ...action.panels } };
    case "replace":
      return action.layout;
  }
}

export function activeTabOf(pane: WorkspacePane): WorkspaceTab {
  return pane.tabs.find((t) => t.id === pane.activeTabId) ?? pane.tabs[0];
}

export function isWorkspaceLayout(value: unknown): value is WorkspaceLayout {
  if (!value || typeof value !== "object") return false;
  const layout = value as Partial<WorkspaceLayout>;
  return (
    layout.version === 1 &&
    Array.isArray(layout.panes) &&
    layout.panes.length > 0 &&
    layout.panes.every(
      (p) =>
        Array.isArray(p.tabs) &&
        p.tabs.length > 0 &&
        p.tabs.every((t) => parseTabId(t.id) !== null),
    )
  );
}
