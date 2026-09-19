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

import type { IconName } from "@/design-system/icons/icon";
import type { Project, User } from "@/domain/models";
import { useServices } from "@/services/services-context";

import {
  activeTabOf,
  layoutReducer,
  type LayoutAction,
  type WorkspaceLayout,
  type WorkspacePane,
  type WorkspaceTarget,
} from "./model/layout";

const SAVE_DELAY_MS = 300;

interface WorkspaceContextValue {
  projectId: string;
  project: Project;
  user: User;
  layout: WorkspaceLayout;
  dispatch: Dispatch<LayoutAction>;
  activePane: WorkspacePane;
  activeFileId: string | null;
  open: (
    target: WorkspaceTarget,
    options?: { toSide?: boolean; paneId?: string },
  ) => void;
  closeTab: (paneId: string, tabId: string) => void;
  registerCloseGuard: (
    paneId: string,
    tabId: string,
    guard: CloseGuard,
  ) => () => void;
  tabLabels: ReadonlyMap<string, TabLabel>;
  setTabLabel: (paneId: string, tabId: string, label: TabLabel | null) => void;
}

export interface TabLabel {
  icon: IconName;
  title: string;
}

export type CloseGuard = (proceed: () => void) => boolean;

// 같은 뷰가 두 창에 동시에 열릴 수 있으므로(옆에 열기) 창까지 합쳐 탭을 가리킨다.
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

  useEffect(() => {
    pending.current = layout;
    const timer = window.setTimeout(() => {
      pending.current = null;
      void services.workspaceState.save(project.id, layout);
    }, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [layout, project.id, services]);

  useEffect(
    () => () => {
      if (pending.current)
        void services.workspaceState.save(project.id, pending.current);
    },
    [project.id, services],
  );

  const open = useCallback<WorkspaceContextValue["open"]>(
    (target, options) =>
      dispatch(
        options?.toSide
          ? { type: "openToSide", target }
          : { type: "open", target, paneId: options?.paneId },
      ),
    [],
  );

  const [tabLabels, setTabLabels] = useState<ReadonlyMap<string, TabLabel>>(
    () => new Map(),
  );

  const setTabLabel = useCallback(
    (paneId: string, tabId: string, label: TabLabel | null) => {
      const key = tabKey(paneId, tabId);
      setTabLabels((current) => {
        const existing = current.get(key);
        if (existing?.icon === label?.icon && existing?.title === label?.title)
          return current;
        const next = new Map(current);
        if (label) next.set(key, label);
        else next.delete(key);
        return next;
      });
    },
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

  const closeTab = useCallback((paneId: string, tabId: string) => {
    const proceed = () => dispatch({ type: "close", paneId, tabId });
    const guard = guards.current.get(tabKey(paneId, tabId));
    if (guard?.(proceed)) {
      dispatch({ type: "activate", paneId, tabId });
      return;
    }
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
      open,
      closeTab,
      registerCloseGuard,
      tabLabels,
      setTabLabel,
    }),
    [
      project,
      user,
      layout,
      activePane,
      activeFileId,
      open,
      closeTab,
      registerCloseGuard,
      tabLabels,
      setTabLabel,
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
  if (!value) throw new Error("WorkspaceProvider가 필요합니다.");
  return value;
}
