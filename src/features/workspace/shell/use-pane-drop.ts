"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

import { t } from "@/i18n";

import {
  landingShare,
  offeredZones,
  previewRect,
  sameZone,
  zoneAt,
  type DragSource,
  type DropZone,
  type Rect,
} from "../model/drop-zones";
import { splitOf, tabIdFor, type DropEdge } from "../model/layout";
import { useWorkspace } from "../workspace-context";
import { endDrag, getDrag, originOf, type DragSession } from "./drag-session";
import type { DropOrigin } from "./use-pane-motion";

/** 두 시트 사이의 틈(px). 가장자리 미리보기가 새 시트의 실제 크기와 맞으려면 알아야 한다 */
const PANE_GAP = 10;
/** 놓은 뒤 미리보기가 사라지는 시간(ms). CSS 의 페이드와 같은 값이다 */
const SETTLE_MS = 160;

export interface DropPreview {
  zone: DropZone;
  /** 작업 영역(main) 왼쪽 위를 기준으로 한 사각형 */
  rect: Rect;
  /**
   * 놓으면 두 창이 자리를 맞바꾼다. 미리보기 사각형이 "그 창으로 옮기기" 와 같은 자리에
   * 그려지므로, 무엇이 일어나는지 글자로 적어 구분한다.
   */
  swap?: boolean;
  /** 방금 놓았다. 그 자리에서 사라지는 중이다 */
  settling?: boolean;
}

/** 키보드로 자리를 고르는 중일 때 화면에 띄우는 안내 */
export interface PlacingState {
  /** 지금 고른 자리를 읽어 주는 말 */
  label: string;
}

function sourceOf(session: DragSession): DragSource | null {
  if (session.kind === "tab") {
    return { target: session.target, from: session.paneId };
  }
  // 창에 열 수 있는 것은 문서뿐이다. 폴더를 끌어오면 작업 영역은 받지 않는다.
  return session.document
    ? { target: { kind: "file", fileId: session.fileId } }
    : null;
}

/** 창들의 사각형과, 그것들을 감싸는 작업 영역. 모두 화면(뷰포트) 좌표다 */
function measure(main: HTMLElement) {
  const paneRects = new Map<string, Rect>();
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const child of Array.from(main.children)) {
    const paneId = (child as HTMLElement).dataset.paneId;
    if (!paneId) continue;
    const box = child.getBoundingClientRect();
    paneRects.set(paneId, {
      left: box.left,
      top: box.top,
      width: box.width,
      height: box.height,
    });
    left = Math.min(left, box.left);
    top = Math.min(top, box.top);
    right = Math.max(right, box.right);
    bottom = Math.max(bottom, box.bottom);
  }
  const origin = main.getBoundingClientRect();
  return {
    area: { left, top, width: right - left, height: bottom - top },
    paneRects,
    origin: { left: origin.left, top: origin.top },
  };
}

function edgeName(edge: DropEdge) {
  return {
    left: t("배치::왼쪽"),
    right: t("배치::오른쪽"),
    top: t("배치::위"),
    bottom: t("배치::아래"),
  }[edge];
}

/**
 * 탭이나 파일을 작업 영역에 놓아 창을 나누고 옮기는 일.
 *
 * <p>마우스로 끌어 놓는 길과 키보드로 자리를 고르는 길(배치 모드)이 같은 계산·같은
 * 미리보기·같은 반영을 쓴다. 어디에 놓을 수 있고 무엇이 되는지는 모델(drop-zones.ts,
 * layout.ts)이 정하고, 여기서는 포인터와 키를 그 계산에 잇는다.
 *
 * <p><b>덮는 레이어를 두지 않는다.</b> 작업 영역을 덮어 버리면 탭 막대의 순서 바꾸기까지
 * 가로챈다. 대신 작업 영역(main)에서 이벤트를 **먼저**(capture) 듣고, 우리가 받을 자리일
 * 때만 가져간다. 그래서 탭 막대와 파일 트리의 끌기는 그대로 돌고, 우리 끌기가 에디터
 * 본문에 글자로 떨어지지도 않는다.
 */
export function usePaneDrop(panesRef: RefObject<HTMLElement | null>) {
  const workspace = useWorkspace();
  const latest = useRef(workspace);
  useEffect(() => {
    latest.current = workspace;
  });

  const [preview, setPreview] = useState<DropPreview | null>(null);
  const zone = useRef<DropZone | null>(null);
  const settle = useRef<number | null>(null);
  /** 방금 끌어온 단추의 자리. 새 창이 거기서 나온다(use-pane-motion.ts 가 읽고 비운다) */
  const dropOriginRef = useRef<DropOrigin | null>(null);

  /** 그 자리의 미리보기 사각형을 재어 보여 준다. null 이면 지운다 */
  const show = useCallback(
    (next: DropZone | null, source?: DragSource) => {
      const main = panesRef.current;
      if (!next || !source || !main) {
        if (zone.current) {
          zone.current = null;
          setPreview(null);
        }
        return;
      }
      if (sameZone(zone.current, next)) return;
      zone.current = next;
      const { layout } = latest.current;
      const { area, paneRects, origin } = measure(main);
      // 가장자리의 크기는 놓았을 때의 배치에서 읽는다. 맞바꾸면 그 창의 원래 크기다.
      const rect = previewRect(
        next,
        area,
        paneRects,
        PANE_GAP,
        next.kind === "edge" ? landingShare(layout, source, next.edge) : 1,
      );
      setPreview({
        zone: next,
        rect: {
          ...rect,
          left: rect.left - origin.left,
          top: rect.top - origin.top,
        },
        swap:
          next.kind === "edge" &&
          offeredZones(layout, source).swap === next.edge,
      });
    },
    [panesRef],
  );

  /**
   * 그 자리에 놓는다.
   *
   * @param origin 끌어온 단추의 자리(뷰포트 좌표). 새 창이 거기서 나온다
   */
  const perform = useCallback(
    (source: DragSource, target: DropZone, origin?: Rect) => {
      dropOriginRef.current = origin
        ? { rect: origin, at: performance.now() }
        : null;
      const ws = latest.current;
      // 놓은 자리에서 미리보기가 잠깐 남았다가 사라진다. 그 사이에 새 시트가 들어온다.
      zone.current = null;
      setPreview((current) =>
        current ? { ...current, settling: true } : null,
      );
      if (settle.current) window.clearTimeout(settle.current);
      settle.current = window.setTimeout(() => setPreview(null), SETTLE_MS);

      if (source.from) {
        // 탭을 옮긴다. 화면이 새로 만들어지므로 저장과 닫기 확인을 거친다(relocate).
        ws.relocate(
          target.kind === "edge"
            ? {
                type: "split",
                edge: target.edge,
                target: source.target,
                from: source.from,
              }
            : {
                type: "moveTab",
                from: source.from,
                tabId: tabIdFor(source.target),
                to: target.paneId,
              },
        );
      } else if (target.kind === "edge") {
        ws.dispatch({
          type: "split",
          edge: target.edge,
          target: source.target,
        });
      } else {
        ws.open(source.target, { paneId: target.paneId });
      }
    },
    [],
  );

  useEffect(
    () => () => {
      if (settle.current) window.clearTimeout(settle.current);
    },
    [],
  );

  // 마우스로 끌어 놓기.
  useEffect(() => {
    const main = panesRef.current;
    if (!main) return;

    const resolve = (event: DragEvent) => {
      const session = getDrag();
      const ws = latest.current;
      // 좁은 창에서는 창을 하나만 그린다. 나눌 자리가 없다.
      if (!session || ws.narrow) return null;
      const source = sourceOf(session);
      if (!source) return null;
      // 탭 막대 위에서는 탭 막대가 받는다(순서 바꾸기, 원하는 자리에 끼우기).
      const over = event.target instanceof Element ? event.target : null;
      if (over?.closest("[data-tab-bar]")) return null;
      const { area, paneRects } = measure(main);
      const hit = zoneAt(
        { x: event.clientX, y: event.clientY },
        area,
        paneRects,
        offeredZones(ws.layout, source),
        zone.current,
      );
      return hit ? { source, zone: hit, origin: session.origin } : null;
    };

    const onOver = (event: DragEvent) => {
      const hit = resolve(event);
      if (!hit) {
        show(null);
        return;
      }
      // 받을 자리다. 안쪽 요소(에디터 등)가 이 끌기를 보지 못하게 여기서 가져간다.
      event.preventDefault();
      event.stopPropagation();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
      show(hit.zone, hit.source);
    };
    const onLeave = (event: DragEvent) => {
      const next = event.relatedTarget;
      if (!(next instanceof Node) || !main.contains(next)) show(null);
    };
    const onDrop = (event: DragEvent) => {
      const hit = resolve(event);
      if (!hit) {
        show(null);
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      perform(hit.source, hit.zone, hit.origin);
      endDrag();
    };

    main.addEventListener("dragenter", onOver, true);
    main.addEventListener("dragover", onOver, true);
    main.addEventListener("dragleave", onLeave, true);
    main.addEventListener("drop", onDrop, true);
    return () => {
      main.removeEventListener("dragenter", onOver, true);
      main.removeEventListener("dragover", onOver, true);
      main.removeEventListener("dragleave", onLeave, true);
      main.removeEventListener("drop", onDrop, true);
    };
  }, [panesRef, perform, show]);

  /*
   * 키보드로 자리 고르기(배치 모드).
   *
   * 끌어 놓기는 마우스가 있어야 한다. 키보드만 쓰는 사람도 창을 나누고 탭을 옮길 수
   * 있어야 하므로, 단축키로 같은 미리보기를 띄우고 방향키로 자리를 골라 Enter 로 놓는다.
   */
  const [placing, setPlacing] = useState<{
    source: DragSource;
    zones: DropZone[];
    index: number;
    /** 옮기려는 것(파일 줄, 탭)의 자리. 끌어 놓을 때처럼 새 창이 거기서 나온다 */
    origin?: Rect;
  } | null>(null);
  /** 키보드로 놓은 뒤에는 포커스를 옮겨 간 탭으로 보낸다 */
  const focusAfter = useRef(false);

  const startPlacing = useCallback(() => {
    const ws = latest.current;
    if (ws.narrow || !panesRef.current) return;
    // 파일 트리의 문서에 포커스가 있으면 그 문서를, 아니면 지금 보는 탭을 옮긴다.
    const focused = document.activeElement;
    const row =
      focused instanceof HTMLElement &&
      focused.getAttribute("role") === "treeitem" &&
      // 파일 트리에서 종류(data-kind)가 붙은 줄은 문서다. 폴더는 창에 열 수 없다.
      focused.dataset.kind
        ? focused.dataset.nodeId
        : undefined;
    const pane = ws.activePane;
    const active = pane.tabs.find((tab) => tab.id === pane.activeTabId);
    const source: DragSource | null = row
      ? { target: { kind: "file", fileId: row } }
      : active
        ? { target: active.target, from: pane.id }
        : null;
    if (!source) return;
    // 그 파일 줄이나 탭이 화면에 있으면 자리를 재 둔다.
    const from = row
      ? focused
      : panesRef.current.querySelector(
          `[data-pane-id="${pane.id}"] [role="tab"][aria-selected="true"]`,
        );
    const offered = offeredZones(ws.layout, source);
    // 다른 창이 있으면 그 창이 먼저다. 없으면 오른쪽에 새 창을 여는 것이 기본이다.
    const edges: DropEdge[] = ["right", "left", "bottom", "top"];
    const zones: DropZone[] = [
      ...offered.panes.map((paneId) => ({ kind: "pane" as const, paneId })),
      ...edges
        .filter((edge) => offered.edges.includes(edge))
        .map((edge) => ({ kind: "edge" as const, edge })),
    ];
    if (zones.length === 0) return;
    setPlacing({
      source,
      zones,
      index: 0,
      origin: from ? originOf(from) : undefined,
    });
  }, [panesRef]);

  const placed = placing ? placing.zones[placing.index] : null;
  const placedSource = placing?.source;
  useEffect(() => {
    if (placed) show(placed, placedSource);
  }, [placed, placedSource, show]);

  useEffect(() => {
    if (!placing) return;
    const stop = () => {
      setPlacing(null);
      show(null);
    };
    const choose = (index: number) =>
      setPlacing((current) => (current ? { ...current, index } : current));

    /** 그 방향의 가장자리, 없으면 그 방향에 놓인 창 */
    const toward = (edge: DropEdge) => {
      const ws = latest.current;
      const direct = placing.zones.findIndex(
        (candidate) => candidate.kind === "edge" && candidate.edge === edge,
      );
      if (direct >= 0) return direct;
      const along: DropEdge[] =
        splitOf(ws.layout).direction === "row"
          ? ["left", "right"]
          : ["top", "bottom"];
      const side = ws.layout.panes[along.indexOf(edge)];
      return placing.zones.findIndex(
        (candidate) =>
          candidate.kind === "pane" && candidate.paneId === side?.id,
      );
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const arrows: Record<string, DropEdge> = {
        ArrowLeft: "left",
        ArrowRight: "right",
        ArrowUp: "top",
        ArrowDown: "bottom",
      };
      const edge = arrows[event.key];
      if (edge) {
        const index = toward(edge);
        if (index >= 0) choose(index);
      } else if (event.key === "Tab") {
        const step = event.shiftKey ? -1 : 1;
        choose(
          (placing.index + step + placing.zones.length) % placing.zones.length,
        );
      } else if (event.key === "Enter" || event.key === " ") {
        focusAfter.current = true;
        perform(placing.source, placing.zones[placing.index], placing.origin);
        setPlacing(null);
      } else if (event.key === "Escape") {
        stop();
      } else {
        // 다른 키는 배치와 상관없다. 건드리지 않는다.
        return;
      }
      event.preventDefault();
      event.stopPropagation();
    };

    // 다른 리스너보다 먼저 듣는다. 방향키가 탭이나 트리를 움직이면 안 된다.
    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("pointerdown", stop, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("pointerdown", stop, true);
    };
  }, [placing, perform, show]);

  // 키보드로 놓았으면, 배치가 바뀐 뒤 옮겨 간 탭에 포커스를 준다.
  const layout = workspace.layout;
  useEffect(() => {
    if (!focusAfter.current || placing) return;
    focusAfter.current = false;
    panesRef.current
      ?.querySelector<HTMLElement>(
        `[data-pane-id="${layout.activePaneId}"] [role="tab"][aria-selected="true"]`,
      )
      ?.focus();
  }, [layout, placing, panesRef]);

  const placingState: PlacingState | null = placed
    ? {
        label:
          // 맞바꾸는 자리는 "어디에 놓는다" 가 아니라 "두 창이 바뀐다" 로 읽어 준다.
          placed.kind === "edge" && preview?.swap
            ? t("두 창의 자리를 바꿔요. Enter로 확정, Esc로 취소")
            : t("{place}에 놓아요. Enter로 확정, Esc로 취소", {
                place:
                  placed.kind === "edge"
                    ? edgeName(placed.edge)
                    : t("창 {number}", {
                        number:
                          layout.panes.findIndex(
                            (p) => p.id === placed.paneId,
                          ) + 1,
                      }),
              }),
      }
    : null;

  return { preview, placing: placingState, startPlacing, dropOriginRef };
}
