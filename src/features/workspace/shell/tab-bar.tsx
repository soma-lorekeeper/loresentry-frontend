"use client";

import {
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import { Icon, IconButton } from "@/design-system/primitives";
import { t } from "@/i18n";

import { type WorkspacePane } from "../model/layout";
import { useWorkspace } from "../workspace-context";
import {
  TAB_MIME,
  beginDrag,
  endDrag,
  getDrag,
  originOf,
  useDragSession,
} from "./drag-session";
import styles from "./tab-bar.module.css";
import { useTabPresentation } from "./use-tab-presentation";

/** 탭 줄의 맨 끝. 어느 탭 위도 아닌 빈 자리에 놓으면 여기다 */
const END = "end";

/**
 * 창 맨 위의 탭 막대.
 *
 * <p>탭은 끌어서 옮긴다. 같은 창 안에서는 순서가 바뀌고, 다른 창의 탭 막대에 놓으면 그 창의
 * 그 자리로 옮겨 가며, 사이드바의 문서를 놓으면 이 창에 열린다. 탭 막대 밖(작업 영역)에
 * 놓는 것은 use-pane-drop.ts 가 받는다 — 창을 나누거나 다른 창에 연다.
 *
 * @param leading 화면의 첫 번째 창인가. 사이드바를 여닫는 단추는 작업공간에 하나만 있으면
 *   되므로 첫 번째 창에만 그린다 — 창을 둘로 나눠도 같은 단추가 두 번 나오지 않는다
 */
export function TabBar({
  pane,
  leading,
}: {
  pane: WorkspacePane;
  leading: boolean;
}) {
  const { dispatch, closeTab, relocate, sidebarVisible, setSidebarVisible } =
    useWorkspace();
  const present = useTabPresentation();
  const listRef = useRef<HTMLDivElement>(null);
  // 끄는 동안 다시 그려야 끌고 있는 탭을 흐리게 하고, 끝나면 표시를 지울 수 있다.
  const session = useDragSession();
  /** 놓으면 이 탭 **앞**에 끼워진다. 맨 끝이면 END */
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dragging =
    session?.kind === "tab" && session.paneId === pane.id
      ? session.tabId
      : null;

  useEffect(() => {
    const selected = listRef.current?.querySelector<HTMLElement>(
      '[role="tab"][aria-selected="true"]',
    );
    selected?.scrollIntoView?.({ inline: "nearest", block: "nearest" });
  }, [pane.activeTabId, pane.tabs.length]);

  // 끌기가 끝나면(다른 곳에 놓았거나 취소) 놓을 자리 표시를 지운다.
  if (!session && dropTarget) setDropTarget(null);

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
    else if (event.key === "Delete") closeTab(pane.id, tabId);
    else return;
    event.preventDefault();
  };

  /** 이 탭 막대가 받을 수 있는 것을 끌고 있는가. 탭이거나, 사이드바의 문서나 보기다 */
  const accepts = () => {
    const current = getDrag();
    return current !== null && (current.kind !== "node" || current.document);
  };

  const onDragOver = (event: DragEvent, before: string) => {
    if (!accepts()) return;
    event.preventDefault();
    // 탭 위에서 처리했으면 탭 줄(맨 끝 자리)까지 올라가지 않게 한다.
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    setDropTarget(before);
  };

  /** `before` 앞에 놓는다. END 면 맨 끝이다 */
  const onDrop = (event: DragEvent, before: string) => {
    const current = getDrag();
    setDropTarget(null);
    if (!current || !accepts()) return;
    event.preventDefault();
    event.stopPropagation();
    const beforeId = before === END ? null : before;
    if (current.kind === "node" || current.kind === "view") {
      // 사이드바의 문서나 보기. 이 창에 연다.
      dispatch({
        type: "open",
        target:
          current.kind === "view"
            ? current.target
            : { kind: "file", fileId: current.fileId },
        paneId: pane.id,
      });
    } else if (current.paneId === pane.id) {
      // 같은 창 안에서는 화면을 새로 만들 일이 없다. 순서만 바꾼다.
      dispatch({
        type: "moveTab",
        from: pane.id,
        tabId: current.tabId,
        to: pane.id,
        beforeId,
      });
    } else {
      relocate({
        type: "moveTab",
        from: current.paneId,
        tabId: current.tabId,
        to: pane.id,
        beforeId,
      });
    }
    endDrag();
  };

  return (
    // 작업 영역의 놓기(use-pane-drop.ts)가 이 표시를 보고 탭 막대 위에서는 물러난다.
    // 탭이 아닌 막대의 빈 자리에 놓으면 맨 끝에 붙는다.
    <div
      className={styles.bar}
      data-tab-bar
      // 들어설 때(dragenter)에도 받겠다고 답한다. 탭 위로 들어서자마자 놓으면 dragover 가
      // 한 번도 오지 않을 수 있고, 그러면 브라우저가 놓기를 취소한다.
      onDragEnter={(event) => onDragOver(event, END)}
      onDragOver={(event) => onDragOver(event, END)}
      onDragLeave={(event) => {
        // 막대를 완전히 벗어났을 때만 지운다. 탭 사이를 오가는 동안에는 유지한다.
        if (!event.currentTarget.contains(event.relatedTarget as Node | null))
          setDropTarget(null);
      }}
      onDrop={(event) => onDrop(event, END)}
    >
      {leading && (
        <IconButton
          icon="panel-left"
          iconSize={17}
          label={sidebarVisible ? t("사이드바 닫기") : t("사이드바 열기")}
          aria-pressed={!sidebarVisible || undefined}
          className={styles.toggle}
          onClick={() => setSidebarVisible(!sidebarVisible)}
        />
      )}
      <div
        ref={listRef}
        className={styles.tabs}
        role="tablist"
        aria-label={t("열린 탭")}
        data-drop-end={dropTarget === END || undefined}
      >
        {pane.tabs.map((tab, index) => {
          const selected = tab.id === pane.activeTabId;
          const { icon, title, kind } = present(tab.target);
          return (
            <div
              key={tab.id}
              role="tab"
              id={`tab-${pane.id}-${tab.id}`}
              aria-controls={`panel-${pane.id}-${tab.id}`}
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              data-tab-id={tab.id}
              data-kind={kind}
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
                if (event.button === 1) closeTab(pane.id, tab.id);
              }}
              onKeyDown={(event) => onKeyDown(event, index, tab.id)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                // 글자(text/plain)로 싣지 않는다. 글자로 실으면 본문에 놓았을 때 탭 id 가 붙는다.
                event.dataTransfer.setData(TAB_MIME, tab.id);
                beginDrag({
                  kind: "tab",
                  paneId: pane.id,
                  tabId: tab.id,
                  target: tab.target,
                  origin: originOf(event.currentTarget),
                });
              }}
              onDragEnter={(event) => onDragOver(event, tab.id)}
              onDragOver={(event) => onDragOver(event, tab.id)}
              onDrop={(event) => onDrop(event, tab.id)}
              onDragEnd={() => {
                setDropTarget(null);
                endDrag();
              }}
            >
              <Icon name={icon} size={15} />
              <span className={styles.tabLabel}>{title}</span>
              {tab.target.kind !== "new" && (
                <button
                  type="button"
                  className={styles.close}
                  aria-label={t("{title} 탭 닫기", { title })}
                  tabIndex={-1}
                  onClick={(event) => {
                    event.stopPropagation();
                    closeTab(pane.id, tab.id);
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
        label={t("작업공간::새 탭")}
        onClick={() =>
          dispatch({ type: "open", target: { kind: "new" }, paneId: pane.id })
        }
      />
    </div>
  );
}
