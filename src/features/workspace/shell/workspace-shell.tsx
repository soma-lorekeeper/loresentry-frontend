"use client";

import { useEffect, useRef, useState } from "react";

import type { WorkspacePane } from "../model/layout";
import { DocumentViewHost } from "../views/document-view-host";
import { WORKSPACE_VIEWS } from "../views/registry";
import { useWorkspace } from "../workspace-context";
import { WorkspaceSidebar } from "../sidebar/workspace-sidebar";
import { TabBar } from "./tab-bar";
import styles from "./workspace-shell.module.css";

function Pane({ pane }: { pane: WorkspacePane }) {
  const { dispatch, layout } = useWorkspace();
  const focused = layout.activePaneId === pane.id;
  return (
    <section
      className={styles.pane}
      aria-label={
        layout.panes.length > 1
          ? `창 ${layout.panes.indexOf(pane) + 1}`
          : undefined
      }
      data-focused={focused || undefined}
      onFocusCapture={() =>
        !focused && dispatch({ type: "focusPane", paneId: pane.id })
      }
      onPointerDownCapture={() =>
        !focused && dispatch({ type: "focusPane", paneId: pane.id })
      }
    >
      <TabBar pane={pane} />
      <div className={styles.content}>
        {pane.tabs.map((tab) => {
          const active = tab.id === pane.activeTabId;
          const props = { paneId: pane.id, tab, active };
          return (
            <div
              key={tab.id}
              role="tabpanel"
              id={`panel-${pane.id}-${tab.id}`}
              aria-labelledby={`tab-${pane.id}-${tab.id}`}
              hidden={!active}
              className={styles.panel}
            >
              {tab.target.kind === "file" ? (
                <DocumentViewHost {...props} fileId={tab.target.fileId} />
              ) : (
                WORKSPACE_VIEWS[tab.target.kind].render(props)
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** 사이드바가 본문을 밀지 않고 덮는 폭. 여기서부터 창이 좁다고 본다. */
const NARROW = 900;

export function WorkspaceShell() {
  const { layout, dispatch, activePane } = useWorkspace();
  const [narrow, setNarrow] = useState(false);
  const collapsed = useRef(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${NARROW}px)`);
    const apply = () => setNarrow(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  /**
   * 좁아지면 사이드바를 **한 번** 접는다.
   *
   * <p>220px 짜리 파일 트리가 390px 화면의 절반을 가져가면 본문이 한 글자씩 줄바꿈된다. 접은 뒤
   * 사용자가 다시 열면 그대로 둔다 — 창 크기가 바뀔 때마다 사용자의 선택을 되돌리면 안 된다.
   */
  useEffect(() => {
    if (!narrow) {
      collapsed.current = false;
      return;
    }
    if (collapsed.current) return;
    collapsed.current = true;
    if (layout.sidebarOpen) dispatch({ type: "toggleSidebar" });
  }, [narrow, layout.sidebarOpen, dispatch]);

  // 좁은 창에서는 창을 나누지 않는다. 지금 보고 있는 것 하나만 그린다.
  const panes = narrow
    ? layout.panes.filter((pane) => pane.id === activePane.id)
    : layout.panes;

  return (
    <div className={styles.shell} data-narrow={narrow || undefined}>
      {layout.sidebarOpen && (
        <>
          <div className={styles.sidebar}>
            <WorkspaceSidebar />
          </div>
          {narrow && (
            <button
              type="button"
              className={styles.scrim}
              aria-label="사이드바 닫기"
              onClick={() => dispatch({ type: "toggleSidebar" })}
            />
          )}
        </>
      )}
      <main className={styles.panes}>
        {panes.map((pane) => (
          <Pane key={pane.id} pane={pane} />
        ))}
      </main>
    </div>
  );
}
