"use client";

import type { ReactNode } from "react";

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

export function WorkspaceShell({ chat }: { chat?: ReactNode }) {
  const { layout } = useWorkspace();
  return (
    <div className={styles.shell}>
      {layout.sidebarOpen && (
        <div className={styles.sidebar}>
          <WorkspaceSidebar />
        </div>
      )}
      <main className={styles.panes}>
        {layout.panes.map((pane) => (
          <Pane key={pane.id} pane={pane} />
        ))}
      </main>
      {layout.panels.aiChatOpen && chat && (
        <aside className={styles.chat}>{chat}</aside>
      )}
    </div>
  );
}
