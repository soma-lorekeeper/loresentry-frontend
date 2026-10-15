"use client";

import { Fragment, useEffect, useRef, type CSSProperties } from "react";

import { Icon, ResizeHandle } from "@/design-system/primitives";
import { ChatDock } from "@/features/chat/chat-dock";
import { onTourEnd } from "@/features/tour/tour-state";
import { WorkspaceTour } from "@/features/tour/workspace-tour";
import { t } from "@/i18n";

import { ImportDialog } from "../import-dialog";
import { SPLIT_RATIO, splitOf, type WorkspacePane } from "../model/layout";
import { DocumentViewHost } from "../views/document-view-host";
import { WORKSPACE_VIEWS } from "../views/registry";
import { useWorkspace } from "../workspace-context";
import { WorkspaceSidebar } from "../sidebar/workspace-sidebar";
import { TabBar } from "./tab-bar";
import { usePaneDrop } from "./use-pane-drop";
import { usePaneMotion } from "./use-pane-motion";
import { useWorkspaceShortcuts } from "./use-workspace-shortcuts";
import {
  SIDEBAR_WIDTH,
  clampSidebarWidth,
  setSidebarWidth,
  useSidebarWidth,
} from "./workspace-chrome-prefs";
import styles from "./workspace-shell.module.css";

/**
 * 창 하나.
 *
 * @param slot 화면에서의 순서(0 이 왼쪽 또는 위). 크기 비율과, 사이드바 단추를 어느 창에
 *   둘지가 이 값으로 정해진다
 */
function Pane({ pane, slot }: { pane: WorkspacePane; slot: number }) {
  const { dispatch, layout } = useWorkspace();
  const focused = layout.activePaneId === pane.id;
  return (
    <section
      className={styles.pane}
      aria-label={
        layout.panes.length > 1
          ? t("창 {number}", { number: layout.panes.indexOf(pane) + 1 })
          : undefined
      }
      data-pane-id={pane.id}
      data-slot={slot}
      data-focused={focused || undefined}
      onFocusCapture={() =>
        !focused && dispatch({ type: "focusPane", paneId: pane.id })
      }
      onPointerDownCapture={() =>
        !focused && dispatch({ type: "focusPane", paneId: pane.id })
      }
    >
      {/* 사이드바를 여닫는 단추는 창마다 두지 않고 첫 번째로 그리는 창에만 둔다. */}
      <TabBar pane={pane} leading={slot === 0} />
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

/** 방향키 한 번에 움직이는 사이드바 폭(px). Shift 를 누르면 크게 움직인다 */
const SIDEBAR_STEP = { fine: 16, coarse: 48 };
/** 방향키 한 번에 움직이는 창 비율 */
const SPLIT_STEP = { fine: 0.02, coarse: 0.1 };
/** 창 하나가 끌어서 줄어들 수 있는 가장 작은 크기(px). 가로로 나눴을 때와 세로로 나눴을 때 */
const MIN_PANE = { row: 320, column: 220 };
/** 두 시트 사이의 틈(px). 그 틈이 곧 창 크기 조절 손잡이다 */
const PANE_GAP = 10;

/**
 * 사이드바와 본문 사이의 손잡이. 폭은 이 브라우저에 기억한다(workspace-chrome-prefs.ts).
 *
 * 끄는 동안에는 CSS 변수만 고치고, 손을 뗄 때 한 번 저장한다. 포인터가 움직일 때마다
 * 상태를 바꾸면 그때마다 작업공간 전체가 다시 그려진다.
 */
function SidebarResizer({
  width,
  shellRef,
}: {
  width: number;
  shellRef: React.RefObject<HTMLDivElement | null>;
}) {
  const start = useRef(width);
  const live = useRef(width);
  const apply = (next: number) => {
    live.current = clampSidebarWidth(next);
    shellRef.current?.style.setProperty("--sidebar-width", `${live.current}px`);
  };
  return (
    <ResizeHandle
      label={t("사이드바 폭 조절")}
      orientation="vertical"
      value={width}
      min={SIDEBAR_WIDTH.min}
      max={SIDEBAR_WIDTH.max}
      className={styles.sidebarHandle}
      onDragStart={() => {
        start.current = width;
        live.current = width;
      }}
      onDrag={(delta) => apply(start.current + delta)}
      onDragEnd={() => setSidebarWidth(live.current)}
      onStep={(direction, coarse) =>
        setSidebarWidth(
          width +
            direction * (coarse ? SIDEBAR_STEP.coarse : SIDEBAR_STEP.fine),
        )
      }
      onReset={() => setSidebarWidth(SIDEBAR_WIDTH.initial)}
    />
  );
}

/**
 * 두 시트 사이의 손잡이. 책상이 비쳐 보이는 10px 틈이 그대로 손잡이다.
 *
 * 비율은 배치(layout.split)에 저장되어 작품마다 기억된다. 끄는 동안에는 CSS 변수만
 * 고치고 손을 뗄 때 한 번 dispatch 한다 — dispatch 는 저장 요청까지 이어진다.
 */
function PaneDivider({
  panesRef,
}: {
  panesRef: React.RefObject<HTMLElement | null>;
}) {
  const { layout, dispatch } = useWorkspace();
  const { direction, ratio } = splitOf(layout);
  const start = useRef(ratio);
  const live = useRef(ratio);

  /** 지금 창 크기에서 허용되는 비율. 어느 쪽 창도 최소 크기 밑으로 내려가지 않게 한다 */
  const bounds = () => {
    const box = panesRef.current?.getBoundingClientRect();
    const length = (direction === "row" ? box?.width : box?.height) ?? 0;
    const free = length - PANE_GAP;
    const floor = free > 0 ? MIN_PANE[direction] / free : 0;
    const min = Math.max(SPLIT_RATIO.min, floor);
    const max = Math.min(SPLIT_RATIO.max, 1 - floor);
    // 창이 아주 작아 두 최소 크기를 다 줄 수 없으면 반반으로 묶는다.
    return min <= max ? { min, max, free } : { min: 0.5, max: 0.5, free };
  };
  const clamp = (value: number) => {
    const { min, max } = bounds();
    return Math.min(max, Math.max(min, value));
  };
  const apply = (next: number) => {
    live.current = clamp(next);
    panesRef.current?.style.setProperty("--split", String(live.current));
  };

  return (
    <ResizeHandle
      label={t("창 크기 조절")}
      orientation={direction === "row" ? "vertical" : "horizontal"}
      value={Math.round(ratio * 100)}
      min={Math.round(SPLIT_RATIO.min * 100)}
      max={Math.round(SPLIT_RATIO.max * 100)}
      className={styles.divider}
      onDragStart={() => {
        start.current = ratio;
        live.current = ratio;
      }}
      onDrag={(delta) => {
        const { free } = bounds();
        if (free > 0) apply(start.current + delta / free);
      }}
      onDragEnd={() => dispatch({ type: "setSplitRatio", ratio: live.current })}
      onStep={(step, coarse) =>
        dispatch({
          type: "setSplitRatio",
          ratio: clamp(
            ratio + step * (coarse ? SPLIT_STEP.coarse : SPLIT_STEP.fine),
          ),
        })
      }
      onReset={() =>
        dispatch({ type: "setSplitRatio", ratio: SPLIT_RATIO.initial })
      }
    />
  );
}

export function WorkspaceShell() {
  const {
    layout,
    activePane,
    narrow,
    sidebarVisible,
    setSidebarVisible,
    importing,
    setImporting,
  } = useWorkspace();
  // 작업공간 둘러보기는 가져오기 창을 열어 보여 준다. 둘러보기가 끝나면 그 창도 함께 닫는다.
  useEffect(() => onTourEnd(() => setImporting(false)), [setImporting]);
  const shellRef = useRef<HTMLDivElement>(null);
  const panesRef = useRef<HTMLElement>(null);
  const sidebarWidth = useSidebarWidth();
  const split = splitOf(layout);
  const drop = usePaneDrop(panesRef);
  useWorkspaceShortcuts({ onPlace: drop.startPlacing });

  // 좁은 창에서는 창을 나누지 않는다. 지금 보고 있는 것 하나만 그린다.
  const panes = narrow
    ? layout.panes.filter((pane) => pane.id === activePane.id)
    : layout.panes;
  const divided = panes.length > 1;
  // 창의 구성이나 방향이 바뀌면 창들이 새 자리로 움직인다(새 창은 놓은 자리에서 나온다).
  usePaneMotion(
    panesRef,
    `${panes.map((pane) => pane.id).join("|")}:${divided ? split.direction : ""}`,
    narrow,
    layout.panes.length === 1,
    drop.dropOriginRef,
  );

  return (
    <div
      ref={shellRef}
      className={styles.shell}
      data-narrow={narrow || undefined}
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      {sidebarVisible && (
        <>
          <div className={styles.sidebar}>
            <WorkspaceSidebar />
            {/* 서랍으로 뜬 좁은 창에서는 폭이 화면에 맞춰지므로 손잡이를 두지 않는다. */}
            {!narrow && (
              <SidebarResizer width={sidebarWidth} shellRef={shellRef} />
            )}
          </div>
          {narrow && (
            <button
              type="button"
              className={styles.scrim}
              aria-label={t("사이드바 닫기")}
              onClick={() => setSidebarVisible(false)}
            />
          )}
        </>
      )}
      <main
        ref={panesRef}
        className={styles.panes}
        data-split={divided ? split.direction : undefined}
        style={{ "--split": split.ratio } as CSSProperties}
      >
        {panes.map((pane, index) => (
          <Fragment key={pane.id}>
            {index === 1 && <PaneDivider panesRef={panesRef} />}
            <Pane pane={pane} slot={index} />
          </Fragment>
        ))}
        {/* 놓을 자리의 미리보기. 포인터를 받지 않아 그 아래의 끌기를 가리지 않는다. */}
        {drop.preview && (
          <div
            className={styles.dropVeil}
            data-drop-preview={
              drop.preview.zone.kind === "edge"
                ? drop.preview.zone.edge
                : drop.preview.zone.paneId
            }
            data-settling={drop.preview.settling || undefined}
            style={{
              left: drop.preview.rect.left,
              top: drop.preview.rect.top,
              width: drop.preview.rect.width,
              height: drop.preview.rect.height,
            }}
          >
            {/* 맞바꾸기는 "그 창으로 옮기기" 와 같은 자리에 그려진다. 글자로 구분한다. */}
            {drop.preview.swap && (
              <span className={styles.veilLabel}>
                <Icon
                  name={
                    split.direction === "row"
                      ? "arrow-left-right"
                      : "arrow-up-down"
                  }
                  size={15}
                />
                {t("자리 바꾸기")}
              </span>
            )}
          </div>
        )}
        {/* 키보드로 자리를 고르는 동안의 안내. 스크린 리더도 고른 자리를 읽는다. */}
        {drop.placing && (
          <p className={styles.placingHint} role="status" aria-live="polite">
            {drop.placing.label}
          </p>
        )}
      </main>
      {/*
        원고 가져오기 창. 여는 단추는 사이드바와 새 탭에 있지만 창은 여기 하나다 — 단추가 있는
        화면이 사라져도(좁아져 접힌 사이드바) 올려 둔 목록이 남는다. 열려 있을 때만 그려서, 닫을
        때마다 목록이 비워진다.
      */}
      {importing && <ImportDialog onClose={() => setImporting(false)} />}
      <WorkspaceTour />
      <ChatDock />
    </div>
  );
}
