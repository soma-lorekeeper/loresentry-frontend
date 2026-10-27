export const WORKSPACE_VIEW_KINDS = [
  "new",
  "search",
  "graph",
  "timeline",
  "memo",
  "setting-check",
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
}

// 요구사항 §3: 프로젝트를 다시 열면 그래프 보기(분류 필터·에피소드)도 복원한다.
// kinds 가 null 이면 아직 사용자가 고른 적이 없다는 뜻이고, 그래프 규모로 기본값을 정한다.
export interface GraphViewState {
  kinds: string[] | null;
  episodeIds: string[];
}

/** 두 창을 나란히(row) 놓을지 위아래(column)로 쌓을지 */
export type SplitDirection = "row" | "column";

/** 작업 영역의 네 가장자리. 탭이나 파일을 끌어다 놓는 자리다 */
export type DropEdge = "left" | "right" | "top" | "bottom";

/**
 * 창이 둘일 때의 배치. `panes` 배열의 순서가 곧 화면 순서다 — 첫 번째가 왼쪽(row) 또는
 * 위(column)이고, `ratio` 는 그 첫 번째 창이 차지하는 몫이다.
 */
export interface WorkspaceSplit {
  direction: SplitDirection;
  ratio: number;
}

/** 한쪽 창이 지나치게 좁아지지 않게 비율을 묶는다. 새로 나누면 반반이다 */
export const SPLIT_RATIO = { min: 0.2, max: 0.8, initial: 0.5 };

export interface WorkspaceLayout {
  version: 1;
  panes: WorkspacePane[];
  activePaneId: string;
  sidebarOpen: boolean;
  panels: WorkspacePanels;
  graphView?: GraphViewState;
  /**
   * 창이 둘일 때의 방향과 비율. 이 필드가 생기기 전에 저장된 배치에는 없으므로 읽을 때는
   * 반드시 {@link splitOf} 를 거친다 — 없으면 예전 모습 그대로 좌우 반반이다.
   */
  split?: WorkspaceSplit;
}

function clampRatio(ratio: number) {
  const bounded = Math.min(SPLIT_RATIO.max, Math.max(SPLIT_RATIO.min, ratio));
  // 소수 셋째 자리까지만 둔다. 끌 때마다 긴 소수가 저장되면 같은 배치가 다른 값으로 보인다.
  return Math.round(bounded * 1000) / 1000;
}

/**
 * 지금 배치의 분할. 저장된 값이 없거나 모양이 이상하면 좌우 반반으로 읽는다.
 * 서버는 배치 JSON 을 해석하지 않고 그대로 돌려주므로 옛 값·깨진 값을 여기서 받아낸다.
 */
export function splitOf(layout: WorkspaceLayout): WorkspaceSplit {
  const split = layout.split as Partial<WorkspaceSplit> | undefined;
  return {
    direction: split?.direction === "column" ? "column" : "row",
    ratio:
      typeof split?.ratio === "number" && Number.isFinite(split.ratio)
        ? clampRatio(split.ratio)
        : SPLIT_RATIO.initial,
  };
}

export const DEFAULT_PANELS: WorkspacePanels = {
  memoOpen: false,
  memoDock: "right",
  memoRightWidth: 320,
  memoBelowHeight: 240,
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
  /**
   * 작업 영역의 한 가장자리에 놓았다. `from` 은 끌어온 탭이 있던 창이고, 사이드바의
   * 파일처럼 탭이 아닌 것을 놓았으면 없다(그때는 옮기지 않고 새로 연다).
   */
  | { type: "split"; edge: DropEdge; target: WorkspaceTarget; from?: string }
  /**
   * 탭을 다른 창으로(또는 같은 창의 다른 자리로) 옮긴다. `beforeId` 는 그 탭 앞에 끼우라는
   * 뜻이고, null 이면 맨 끝이다. 생략하면 "그 창에 연다" — 빈 새 탭이 있으면 그 자리를 쓴다.
   */
  | {
      type: "moveTab";
      from: string;
      tabId: string;
      to: string;
      beforeId?: string | null;
    }
  /**
   * `from` 창 옆에 연다. 다른 창에 이미 있으면 그 탭으로 가고, `from` 창에만 있으면 옆 창으로
   * 옮긴다. 창이 하나면 오른쪽에 새 창을 세운다.
   */
  | { type: "openBeside"; target: WorkspaceTarget; from: string }
  | { type: "setSplitRatio"; ratio: number }
  | { type: "focusPane"; paneId: string }
  | { type: "closeFiles"; fileIds: string[] }
  | { type: "toggleSidebar" }
  /** 사이드바를 정해진 상태로 둔다. 이미 그 상태면 아무 일도 없다 */
  | { type: "setSidebar"; open: boolean }
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
  if (panes.length === 0) return emptiedLayout(layout, paneId);
  const activePaneId = panes.some((p) => p.id === layout.activePaneId)
    ? layout.activePaneId
    : panes[panes.length - 1].id;
  return { ...layout, panes, activePaneId };
}

/**
 * 탭이 모두 닫혔을 때의 배치. 새 탭 하나가 든 창 하나다.
 *
 * <p>그 창에는 방금 비워진 창(`emptied`)과 **다른 id** 를 준다. 비워진 창이 이어지는 것이 아니라
 * 새 창이 서는 것이고, 화면도 그렇게 그린다 — 처음 보는 id 의 창은 지니 효과로 나온다
 * (shell/use-pane-motion.ts). 늘 `pane-1` 을 주면 마지막에 남았던 창이 어느 쪽이었느냐에 따라
 * 효과가 나왔다 안 나왔다 한다.
 */
function emptiedLayout(
  layout: WorkspaceLayout,
  emptied: string,
): WorkspaceLayout {
  const fresh = pane(freePaneId(layout.panes.filter((p) => p.id === emptied)), {
    kind: "new",
  });
  return { ...layout, panes: [fresh], activePaneId: fresh.id };
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

/**
 * 새 창에 줄 id. 창은 많아야 둘이라 `pane-1`·`pane-2` 가운데 비어 있는 것을 쓴다.
 * 시각을 섞어 만들면 같은 배치가 매번 다른 id 를 갖게 되어, 창을 다시 배치할 때마다
 * 그 안의 화면이 통째로 새로 만들어진다.
 */
function freePaneId(panes: readonly WorkspacePane[]): string {
  return panes.some((p) => p.id === "pane-1") ? "pane-2" : "pane-1";
}

function directionOf(edge: DropEdge): SplitDirection {
  return edge === "left" || edge === "right" ? "row" : "column";
}

/** 그 가장자리에 놓인 창이 배열의 앞(왼쪽·위)에 서는가 */
function leads(edge: DropEdge): boolean {
  return edge === "left" || edge === "top";
}

/** 탭 하나를 `beforeId` 앞에 끼운다. null 이면 맨 끝이다. 끼운 탭이 활성 탭이 된다 */
function insertInPane(
  pane: WorkspacePane,
  moved: WorkspaceTab,
  beforeId: string | null,
): WorkspacePane {
  const tabs = pane.tabs.filter((t) => t.id !== moved.id);
  const at = beforeId ? tabs.findIndex((t) => t.id === beforeId) : -1;
  tabs.splice(at < 0 ? tabs.length : at, 0, moved);
  return { ...pane, tabs, activeTabId: moved.id };
}

/**
 * 가장자리에 놓기.
 *
 * <p>창이 하나면 그 가장자리에 새 창이 생긴다. 창은 둘까지라, 이미 둘이면 더 늘리지 않는다.
 * 그때 가장자리는 **창을 다시 놓는 자리**다 — 탭 하나를 다른 창으로 보내는 것은 가장자리가
 * 아니라 그 창 안(또는 탭 막대)에 놓는 일이다(`moveTab`).
 * <ul>
 *   <li><b>탭을 끌어왔으면</b> 그 탭이 있던 창이 통째로 그 가장자리에 서고, 다른 창이 맞은편에
 *       선다. 같은 축의 맞은편이면 두 창이 자리를 맞바꾸고(크기는 저마다 그대로), 직교하는
 *       가장자리면 분할 방향이 바뀐다(반반으로). 끌어온 탭이 그 창에서 보이는 탭이 된다.
 *   <li><b>사이드바의 파일이면</b> 그 가장자리에 서는 창이 받는다. 같은 축이면 이미 그쪽에 있는
 *       창이고, 직교하면 지금 쓰지 않는 창이 받아 그 가장자리로 간다.
 * </ul>
 */
function splitAt(
  layout: WorkspaceLayout,
  edge: DropEdge,
  target: WorkspaceTarget,
  from: string | undefined,
): WorkspaceLayout {
  const moved = tab(target);
  const source = layout.panes.find((p) => p.id === from);
  // 끌어온 탭이 실제로 그 창에 있어야 "옮기기"다. 아니면 새로 여는 것이다.
  const moving = source?.tabs.some((t) => t.id === moved.id) ?? false;
  const direction = directionOf(edge);

  if (layout.panes.length === 1) {
    const only = layout.panes[0];
    const rest = moving ? closeInPane(only, moved.id) : only;
    // 하나뿐인 창의 하나뿐인 탭은 나눌 것이 없다.
    if (!rest) return layout;
    const created = pane(freePaneId(layout.panes), target);
    return {
      ...layout,
      panes: leads(edge) ? [created, rest] : [rest, created],
      activePaneId: created.id,
      split: { direction, ratio: SPLIT_RATIO.initial },
    };
  }

  const [first, second] = layout.panes;
  const current = splitOf(layout);
  const along = direction === current.direction;

  if (moving) {
    // 탭이 있던 창을 통째로 그 가장자리에 세운다. id 를 지켜 화면을 다시 만들지 않는다.
    const other = source === first ? second : first;
    const standing = { ...source!, activeTabId: moved.id };
    const panes = leads(edge) ? [standing, other] : [other, standing];
    // 이미 그 가장자리에 서 있고 보이는 탭도 같으면 바뀔 것이 없다.
    if (along && panes[0].id === first.id && source!.activeTabId === moved.id) {
      return layout;
    }
    // 맞바꿀 때는 두 창이 제 크기를 지킨다. 축이 바뀌면 크기를 옮길 수 없어 반반으로 둔다.
    const share = source === first ? current.ratio : 1 - current.ratio;
    return {
      ...layout,
      panes,
      activePaneId: source!.id,
      split: {
        direction,
        ratio: along
          ? clampRatio(leads(edge) ? share : 1 - share)
          : SPLIT_RATIO.initial,
      },
    };
  }

  if (along) {
    // 같은 축: 이미 그 가장자리에 있는 창이 받는다.
    return layoutReducer(layout, {
      type: "open",
      target,
      paneId: (leads(edge) ? first : second).id,
    });
  }
  // 직교하는 축: 지금 쓰지 않는 창이 받아 그 가장자리로 간다.
  const receiver = first.id === layout.activePaneId ? second : first;
  const keeper = receiver === first ? second : first;
  const received = openInPane(receiver, target);
  return {
    ...layout,
    panes: leads(edge) ? [received, keeper] : [keeper, received],
    activePaneId: received.id,
    split: { direction, ratio: SPLIT_RATIO.initial },
  };
}

function moveTab(
  layout: WorkspaceLayout,
  from: string,
  tabId: string,
  to: string,
  beforeId: string | null | undefined,
): WorkspaceLayout {
  const source = layout.panes.find((p) => p.id === from);
  const destination = layout.panes.find((p) => p.id === to);
  const moved = source?.tabs.find((t) => t.id === tabId);
  if (!source || !destination || !moved) return layout;

  if (source === destination) {
    // 같은 창 안에서는 자리만 바꾼다. 자리를 주지 않았으면 바꿀 것이 없다.
    if (beforeId === undefined || beforeId === tabId) return layout;
    return updatePane(layout, from, (p) => insertInPane(p, moved, beforeId));
  }

  const panes = layout.panes.flatMap((current) => {
    if (current === source) {
      // 탭을 내준 창이 비면 창도 사라진다.
      const rest = closeInPane(current, tabId);
      return rest ? [rest] : [];
    }
    if (current === destination) {
      return [
        beforeId === undefined
          ? openInPane(current, moved.target)
          : insertInPane(current, moved, beforeId),
      ];
    }
    return [current];
  });
  return { ...layout, panes, activePaneId: to };
}

function openBeside(
  layout: WorkspaceLayout,
  target: WorkspaceTarget,
  from: string,
): WorkspaceLayout {
  const id = tabIdFor(target);
  const other = layout.panes.find((p) => p.id !== from);
  if (!other) return splitAt(layout, "right", target, from);
  if (other.tabs.some((t) => t.id === id)) {
    return layoutReducer(layout, {
      type: "activate",
      paneId: other.id,
      tabId: id,
    });
  }
  const source = layout.panes.find((p) => p.id === from);
  if (source?.tabs.some((t) => t.id === id)) {
    return moveTab(layout, from, id, other.id, undefined);
  }
  return layoutReducer(layout, { type: "open", target, paneId: other.id });
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
    case "close": {
      // 남은 것이 새 탭 하나뿐이면 닫을 것이 없다. 그대로 둔다 — 닫는다고 새 창을 세우면 같은
      // 새 탭이 효과와 함께 다시 나온다.
      const [only] = layout.panes.length === 1 ? layout.panes[0].tabs : [];
      if (
        layout.panes[0]?.tabs.length === 1 &&
        only?.id === action.tabId &&
        only.target.kind === "new"
      ) {
        return layout;
      }
      return updatePane(layout, action.paneId, (p) =>
        closeInPane(p, action.tabId),
      );
    }
    case "split":
      return splitAt(layout, action.edge, action.target, action.from);
    case "openBeside":
      return openBeside(layout, action.target, action.from);
    case "moveTab":
      return moveTab(
        layout,
        action.from,
        action.tabId,
        action.to,
        action.beforeId,
      );
    case "setSplitRatio": {
      // 창이 하나면 나눌 비율이 없다. 같은 값이면 같은 객체를 돌려줘 저장이 다시 나가지 않게 한다.
      if (layout.panes.length < 2) return layout;
      const current = splitOf(layout);
      const ratio = clampRatio(action.ratio);
      if (ratio === current.ratio) return layout;
      return { ...layout, split: { ...current, ratio } };
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
    case "setSidebar":
      return layout.sidebarOpen === action.open
        ? layout
        : { ...layout, sidebarOpen: action.open };
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
