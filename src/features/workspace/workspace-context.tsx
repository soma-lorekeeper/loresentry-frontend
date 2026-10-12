"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
} from "react";

import type { Project, User } from "@/domain/models";
import { useServices } from "@/services/services-context";

import {
  activeTabOf,
  layoutReducer,
  tabIdFor,
  type LayoutAction,
  type WorkspaceLayout,
  type WorkspacePane,
  type WorkspaceTarget,
} from "./model/layout";

const SAVE_DELAY_MS = 300;
/** 탭을 옮기기 전에 쓰던 글의 저장을 기다려 주는 시간. 넘으면 기다리지 않고 옮긴다 */
const RELOCATE_SAVE_WAIT_MS = 400;

/** 사이드바가 본문을 밀지 않고 덮는 폭. 여기서부터 창이 좁다고 본다(shell 의 CSS 와 같은 값). */
const NARROW_QUERY = "(max-width: 900px)";

function matchesNarrow() {
  // 테스트 환경(jsdom)에는 matchMedia 가 없다. 그때는 넓은 창으로 본다.
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(NARROW_QUERY).matches
  );
}

interface WorkspaceContextValue {
  projectId: string;
  project: Project;
  user: User;
  layout: WorkspaceLayout;
  dispatch: Dispatch<LayoutAction>;
  activePane: WorkspacePane;
  activeFileId: string | null;
  /** 창이 좁아 사이드바가 서랍으로 뜨고, 창을 하나만 그리는 상태 */
  narrow: boolean;
  /**
   * 사이드바가 지금 화면에 보이는가. 넓은 창에서는 저장된 선호(`layout.sidebarOpen`)이고,
   * 좁은 창에서는 서랍이 열려 있는지다. 화면은 `layout.sidebarOpen` 대신 이 값을 본다.
   */
  sidebarVisible: boolean;
  /** 사이드바를 열거나 닫는다. 좁은 창에서는 서랍만 여닫고 저장된 선호는 건드리지 않는다 */
  setSidebarVisible: (open: boolean) => void;
  open: (target: WorkspaceTarget, options?: { paneId?: string }) => void;
  closeTab: (paneId: string, tabId: string) => void;
  registerCloseGuard: (
    paneId: string,
    tabId: string,
    guard: CloseGuard,
  ) => () => void;
  /**
   * 탭이 단축키로 불릴 수 있는 일을 등록한다(저장, 찾기 등). 돌려주는 함수로 해제한다.
   * 탭마다 열려 있는 화면이 다르므로, 단축키를 듣는 쪽은 지금 보고 있는 탭의 것만 부른다.
   */
  registerTabActions: (
    paneId: string,
    tabId: string,
    actions: TabActions,
  ) => () => void;
  /** 그 탭이 등록해 둔 일. 문서가 아닌 탭이나 아직 열리는 중인 탭은 없다 */
  tabActionsOf: (paneId: string, tabId: string) => TabActions | undefined;
  /**
   * 탭을 다른 창으로 옮기거나 가장자리에 놓는다(`moveTab`·`split`).
   *
   * 창이 바뀌면 그 탭의 화면이 새로 만들어진다. 그래서 탭을 닫을 때처럼 닫기 확인을 먼저
   * 거치고(저장하지 않은 설정 등), 문서면 쓰던 글을 저장한 뒤에 옮긴다.
   */
  relocate: (action: RelocateAction) => void;
}

export type RelocateAction = Extract<
  LayoutAction,
  { type: "split" } | { type: "moveTab" }
>;

export type CloseGuard = (proceed: () => void) => boolean;

/** 탭 하나가 단축키에 내주는 일들. 그 탭에 해당하지 않는 것은 비워 둔다 */
export interface TabActions {
  /** 자동 저장을 기다리지 않고 지금 저장한다 */
  save?: () => void | Promise<void>;
  /** 문서 안 찾기 막대를 연다 */
  find?: () => void;
  /** PDF 로 내보낸다(인쇄 창을 연다) */
  exportPdf?: () => void;
}

// 같은 뷰가 두 창에 동시에 열릴 수 있으므로 창까지 합쳐 탭을 가리킨다.
export function tabKey(paneId: string, tabId: string) {
  return `${paneId}/${tabId}`;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  project,
  user,
  initialLayout,
  children,
}: {
  project: Project;
  user: User;
  initialLayout: WorkspaceLayout;
  children: ReactNode;
}) {
  const services = useServices();
  const [layout, dispatch] = useReducer(layoutReducer, initialLayout);
  const pending = useRef<WorkspaceLayout | null>(null);

  /*
   * 좁은 창의 사이드바는 저장되는 배치와 따로 간다.
   *
   * 전에는 창이 좁아지면 `toggleSidebar` 로 사이드바를 닫았다. 그러면 그 닫힘이 작가의
   * 선호로 서버에 저장되고, 창을 다시 넓혀도 돌아오지 않았다. 이제 좁은 창에서는 서랍의
   * 열림(`drawerOpen`)만 따로 두고 `layout.sidebarOpen` 은 넓은 창에서의 선호로 남긴다.
   * 창이 넓어지면 그 선호가 그대로 보인다.
   */
  const [narrow, setNarrow] = useState(matchesNarrow);
  const [drawerOpen, setDrawerOpen] = useState(false);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(NARROW_QUERY);
    const apply = () => {
      setNarrow(query.matches);
      // 넓어졌다 다시 좁아지면 서랍은 닫힌 채로 시작한다. 본문을 덮은 채 나타나면 안 된다.
      setDrawerOpen(false);
    };
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  const sidebarVisible = narrow ? drawerOpen : layout.sidebarOpen;
  const setSidebarVisible = useCallback(
    (open: boolean) => {
      if (narrow) setDrawerOpen(open);
      else dispatch({ type: "setSidebar", open });
    },
    [narrow],
  );

  useEffect(() => {
    // 적재한 배치를 그대로 다시 써 보낼 이유가 없다. 리듀서는 동작마다 새 객체를 주므로
    // 아직 같은 객체라는 것은 사용자가 아무것도 바꾸지 않았다는 뜻이다.
    if (layout === initialLayout) return;
    pending.current = layout;
    const timer = window.setTimeout(() => {
      pending.current = null;
      void services.workspaceState.save(project.id, layout);
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [layout, initialLayout, project.id, services]);

  useEffect(
    () => () => {
      if (pending.current)
        void services.workspaceState.save(project.id, pending.current);
    },
    [project.id, services],
  );

  const open = useCallback<WorkspaceContextValue["open"]>(
    (target, options) =>
      dispatch({ type: "open", target, paneId: options?.paneId }),
    [],
  );

  const guards = useRef(new Map<string, CloseGuard>());

  const registerCloseGuard = useCallback(
    (paneId: string, tabId: string, guard: CloseGuard) => {
      const key = tabKey(paneId, tabId);
      guards.current.set(key, guard);
      return () => {
        if (guards.current.get(key) === guard) guards.current.delete(key);
      };
    },
    [],
  );

  const tabActions = useRef(new Map<string, TabActions>());

  const registerTabActions = useCallback(
    (paneId: string, tabId: string, actions: TabActions) => {
      const key = tabKey(paneId, tabId);
      tabActions.current.set(key, actions);
      return () => {
        // 같은 탭이 다시 등록한 뒤에 옛 해제가 불려도 새 것을 지우지 않는다.
        if (tabActions.current.get(key) === actions)
          tabActions.current.delete(key);
      };
    },
    [],
  );

  const tabActionsOf = useCallback(
    (paneId: string, tabId: string) =>
      tabActions.current.get(tabKey(paneId, tabId)),
    [],
  );

  const closeTab = useCallback((paneId: string, tabId: string) => {
    const proceed = () => dispatch({ type: "close", paneId, tabId });
    const guard = guards.current.get(tabKey(paneId, tabId));
    if (guard?.(proceed)) {
      dispatch({ type: "activate", paneId, tabId });
      return;
    }
    proceed();
  }, []);

  const relocate = useCallback((action: RelocateAction) => {
    // 탭이 아닌 것(사이드바의 파일)을 놓은 것이면 옮길 화면이 없다. 바로 반영한다.
    const from = action.from;
    if (!from) {
      dispatch(action);
      return;
    }
    const key = tabKey(
      from,
      action.type === "split" ? tabIdFor(action.target) : action.tabId,
    );
    const proceed = () => {
      // 저장이 오래 걸려도 옮기기를 붙잡아 두지 않는다. 못다 한 저장은 문서 화면이
      // 사라지면서 한 번 더 내보낸다(use-document-session 의 dispose).
      const saved = Promise.resolve(tabActions.current.get(key)?.save?.());
      const waited = new Promise<void>((resolve) =>
        window.setTimeout(resolve, RELOCATE_SAVE_WAIT_MS),
      );
      void Promise.race([saved, waited])
        .catch(() => {})
        .then(() => dispatch(action));
    };
    // 닫기 확인이 가로막으면(저장하지 않은 설정 등) 사용자가 고른 뒤에 이어 간다.
    if (guards.current.get(key)?.(proceed)) return;
    proceed();
  }, []);

  const activePane =
    layout.panes.find((pane) => pane.id === layout.activePaneId) ??
    layout.panes[0];
  const activeTarget = activeTabOf(activePane).target;
  const activeFileId =
    activeTarget.kind === "file" ? activeTarget.fileId : null;

  const value = useMemo(
    () => ({
      projectId: project.id,
      project,
      user,
      layout,
      dispatch,
      activePane,
      activeFileId,
      narrow,
      sidebarVisible,
      setSidebarVisible,
      open,
      closeTab,
      registerCloseGuard,
      registerTabActions,
      tabActionsOf,
      relocate,
    }),
    [
      project,
      user,
      layout,
      activePane,
      activeFileId,
      narrow,
      sidebarVisible,
      setSidebarVisible,
      open,
      closeTab,
      registerCloseGuard,
      registerTabActions,
      tabActionsOf,
      relocate,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext);
  if (!value) throw new Error("WorkspaceProvider is required.");
  return value;
}
