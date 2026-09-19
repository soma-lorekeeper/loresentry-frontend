"use client";

import { useRef, useState, type KeyboardEvent } from "react";

import { Button, Icon, IconButton } from "@/design-system/primitives";

import { type WorkspacePane } from "../model/layout";
import { useWorkspace } from "../workspace-context";
import styles from "./tab-bar.module.css";
import { useTabPresentation } from "./use-tab-presentation";

export function TabBar({ pane }: { pane: WorkspacePane }) {
  const { dispatch, layout } = useWorkspace();
  const present = useTabPresentation();
  const listRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const focusTab = (index: number) => {
    const tabs = listRef.current?.querySelectorAll<HTMLElement>('[role="tab"]');
    const target = tabs?.[(index + (tabs?.length ?? 0)) % (tabs?.length ?? 1)];
    target?.focus();
    const id = target?.dataset.tabId;
    if (id) dispatch({ type: "activate", paneId: pane.id, tabId: id });
  };

  const onKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    index: number,
    tabId: string,
  ) => {
    if (event.key === "ArrowRight") focusTab(index + 1);
    else if (event.key === "ArrowLeft") focusTab(index - 1);
    else if (event.key === "Home") focusTab(0);
    else if (event.key === "End") focusTab(pane.tabs.length - 1);
    else if (event.key === "Delete")
      dispatch({ type: "close", paneId: pane.id, tabId });
    else return;
    event.preventDefault();
  };

  return (
    <div className={styles.bar}>
      <IconButton
        icon="panel-left"
        iconSize={17}
        label={layout.sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
        aria-pressed={!layout.sidebarOpen || undefined}
        className={styles.toggle}
        onClick={() => dispatch({ type: "toggleSidebar" })}
      />
      <div
        ref={listRef}
        className={styles.tabs}
        role="tablist"
        aria-label="열린 탭"
      >
        {pane.tabs.map((tab, index) => {
          const selected = tab.id === pane.activeTabId;
          const { icon, title } = present(tab.target);
          return (
            <div
              key={tab.id}
              role="tab"
              id={`tab-${pane.id}-${tab.id}`}
              aria-controls={`panel-${pane.id}-${tab.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              data-tab-id={tab.id}
              data-dragging={dragging === tab.id || undefined}
              data-drop-target={
                (dropTarget === tab.id && dragging !== tab.id) || undefined
              }
              className={styles.tab}
              draggable
              onClick={() =>
                dispatch({ type: "activate", paneId: pane.id, tabId: tab.id })
              }
              onAuxClick={(event) => {
                if (event.button === 1)
                  dispatch({ type: "close", paneId: pane.id, tabId: tab.id });
              }}
              onKeyDown={(event) => onKeyDown(event, index, tab.id)}
              onDragStart={(event) => {
                setDragging(tab.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", tab.id);
              }}
              onDragOver={(event) => {
                if (!dragging) return;
                event.preventDefault();
                setDropTarget(tab.id);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragging && dragging !== tab.id) {
                  dispatch({
                    type: "reorder",
                    paneId: pane.id,
                    sourceId: dragging,
                    targetId: tab.id,
                  });
                }
                setDragging(null);
                setDropTarget(null);
              }}
              onDragEnd={() => {
                setDragging(null);
                setDropTarget(null);
              }}
            >
              <Icon name={icon} size={15} />
              <span className={styles.tabLabel}>{title}</span>
              {tab.target.kind !== "new" && (
                <button
                  type="button"
                  className={styles.close}
                  aria-label={`${title} 탭 닫기`}
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatch({ type: "close", paneId: pane.id, tabId: tab.id });
                  }}
                >
                  <Icon name="x" size={13} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <IconButton
        icon="plus"
        label="새 탭"
        onClick={() =>
          dispatch({ type: "open", target: { kind: "new" }, paneId: pane.id })
        }
      />
      <span className={styles.spacer} />
      <Button
        icon="sparkles"
        className={styles.chat}
        aria-pressed={layout.panels.aiChatOpen}
        onClick={() =>
          dispatch({
            type: "setPanels",
            panels: { aiChatOpen: !layout.panels.aiChatOpen },
          })
        }
      >
        AI 챗
      </Button>
    </div>
  );
}
