"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type Dispatch,
  type ReactNode,
} from "react";

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
    }),
    [project, user, layout, activePane, activeFileId, open],
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
