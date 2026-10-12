/**
 * 탭이나 파일을 작업 영역으로 끌어올 때 "어디에 놓이는가"를 정하는 계산.
 *
 * 화면(shell)은 포인터 좌표와 창들의 사각형만 넘기고, 놓을 수 있는 자리·지금 가리키는
 * 자리·미리보기 사각형은 모두 여기서 나온다. DOM 을 모르는 순수 함수라 좌표만으로
 * 테스트할 수 있다. 실제로 배치를 바꾸는 것은 layout.ts 의 `split`·`moveTab` 이다.
 */

import {
  splitOf,
  tabIdFor,
  type DropEdge,
  type WorkspaceLayout,
  type WorkspaceTarget,
} from "./layout";

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 놓을 자리. 가장자리(새 창이 서는 절반)이거나 이미 있는 창이다 */
export type DropZone =
  { kind: "edge"; edge: DropEdge } | { kind: "pane"; paneId: string };

/** 끌고 있는 것. 탭이면 그 탭이 있던 창(`from`)을 함께 준다. 사이드바의 파일은 `from` 이 없다 */
export interface DragSource {
  target: WorkspaceTarget;
  from?: string;
}

export interface OfferedZones {
  edges: DropEdge[];
  panes: string[];
}

const ALL_EDGES: DropEdge[] = ["left", "right", "top", "bottom"];

/** 가장자리 띠의 두께. 그 축 길이의 22% 이되 너무 얇거나 두껍지 않게 묶는다 */
const BAND = { ratio: 0.22, min: 72, max: 200 };
/** 한 번 잡은 가장자리는 이만큼 더 벗어나야 놓친다. 경계에서 미리보기가 떨리지 않게 한다 */
const HYSTERESIS = 12;

/**
 * 지금 배치에서 이 물건을 놓을 수 있는 자리.
 *
 * <ul>
 *   <li>창이 하나면 네 가장자리 어디든 새 창이 선다. 사이드바의 파일은 그 창 안에도 놓을
 *       수 있다(그 창에 연다). 하나뿐인 창의 하나뿐인 탭은 갈 곳이 없다.
 *   <li>창이 둘이면 더 늘릴 수 없다. 다른 창 안(그 창으로 옮긴다)과, 지금 분할과 직교하는
 *       두 가장자리(분할 방향을 바꾼다)만 받는다. 같은 축의 가장자리는 그쪽 창과 같은
 *       자리라 따로 두지 않는다.
 * </ul>
 */
export function offeredZones(
  layout: WorkspaceLayout,
  source: DragSource,
): OfferedZones {
  const tabId = tabIdFor(source.target);
  const origin = layout.panes.find((pane) => pane.id === source.from);
  const moving = origin?.tabs.some((tab) => tab.id === tabId) ?? false;

  if (layout.panes.length === 1) {
    const only = layout.panes[0];
    if (moving && only.tabs.length === 1) return { edges: [], panes: [] };
    return { edges: [...ALL_EDGES], panes: moving ? [] : [only.id] };
  }

  return {
    edges:
      splitOf(layout).direction === "row"
        ? ["top", "bottom"]
        : ["left", "right"],
    panes: layout.panes
      .filter((pane) => !moving || pane.id !== origin!.id)
      .map((pane) => pane.id),
  };
}

function bandOf(length: number) {
  return Math.min(BAND.max, Math.max(BAND.min, length * BAND.ratio));
}

/** 그 가장자리에서 안쪽으로 얼마나 들어와 있는가 */
function depthFrom(edge: DropEdge, point: Point, area: Rect) {
  if (edge === "left") return point.x - area.left;
  if (edge === "right") return area.left + area.width - point.x;
  if (edge === "top") return point.y - area.top;
  return area.top + area.height - point.y;
}

function contains(rect: Rect, point: Point) {
  return (
    point.x >= rect.left &&
    point.x <= rect.left + rect.width &&
    point.y >= rect.top &&
    point.y <= rect.top + rect.height
  );
}

/** 사각형까지의 거리. 안에 있으면 0 이다 */
function distanceTo(rect: Rect, point: Point) {
  const dx = Math.max(rect.left - point.x, 0, point.x - rect.left - rect.width);
  const dy = Math.max(rect.top - point.y, 0, point.y - rect.top - rect.height);
  return Math.hypot(dx, dy);
}

export function sameZone(a: DropZone | null, b: DropZone | null) {
  if (!a || !b) return a === b;
  if (a.kind === "edge") return b.kind === "edge" && a.edge === b.edge;
  return b.kind === "pane" && a.paneId === b.paneId;
}

/**
 * 포인터가 가리키는 자리. 놓을 수 없는 곳이면 null 이다.
 *
 * 가장자리 띠가 먼저다. 모서리에서는 두 띠가 겹치므로, 띠 두께에 견주어 더 깊이 들어온
 * 쪽을 고른다. 띠 밖이면 포인터 아래의 창이고, 창 사이 틈에서는 더 가까운 창이다.
 *
 * @param current 지금 가리키고 있던 자리. 가장자리였다면 조금 벗어나도 유지한다
 */
export function zoneAt(
  point: Point,
  area: Rect,
  paneRects: ReadonlyMap<string, Rect>,
  offered: OfferedZones,
  current: DropZone | null = null,
): DropZone | null {
  if (!contains(area, point)) return null;

  let edge: DropEdge | null = null;
  let best = Infinity;
  for (const candidate of offered.edges) {
    const length =
      candidate === "left" || candidate === "right" ? area.width : area.height;
    const held = current?.kind === "edge" && current.edge === candidate;
    const band = bandOf(length) + (held ? HYSTERESIS : 0);
    const depth = depthFrom(candidate, point, area);
    if (depth > band) continue;
    const share = depth / band;
    if (share < best) {
      best = share;
      edge = candidate;
    }
  }
  if (edge) return { kind: "edge", edge };

  let paneId: string | null = null;
  let nearest = Infinity;
  for (const [id, rect] of paneRects) {
    const distance = distanceTo(rect, point);
    if (distance < nearest) {
      nearest = distance;
      paneId = id;
    }
  }
  return paneId && offered.panes.includes(paneId)
    ? { kind: "pane", paneId }
    : null;
}

/**
 * 그 자리에 놓으면 새 시트가 차지할 사각형. 가장자리는 영역의 절반(시트 사이 틈의 반을
 * 뺀 값)이고, 창은 그 창 자신이다.
 */
export function previewRect(
  zone: DropZone,
  area: Rect,
  paneRects: ReadonlyMap<string, Rect>,
  gap: number,
): Rect {
  if (zone.kind === "pane") return paneRects.get(zone.paneId) ?? area;
  const halfWidth = (area.width - gap) / 2;
  const halfHeight = (area.height - gap) / 2;
  switch (zone.edge) {
    case "left":
      return { ...area, width: halfWidth };
    case "right":
      return {
        ...area,
        left: area.left + area.width - halfWidth,
        width: halfWidth,
      };
    case "top":
      return { ...area, height: halfHeight };
    case "bottom":
      return {
        ...area,
        top: area.top + area.height - halfHeight,
        height: halfHeight,
      };
  }
}
