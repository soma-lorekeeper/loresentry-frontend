/**
 * 탭이나 파일을 작업 영역으로 끌어올 때 "어디에 놓이는가"를 정하는 계산.
 *
 * 화면(shell)은 포인터 좌표와 창들의 사각형만 넘기고, 놓을 수 있는 자리·지금 가리키는
 * 자리·미리보기 사각형은 모두 여기서 나온다. DOM 을 모르는 순수 함수라 좌표만으로
 * 테스트할 수 있다. 실제로 배치를 바꾸는 것은 layout.ts 의 `split`·`moveTab` 이다.
 */

import {
  layoutReducer,
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
  /**
   * `edges` 가운데 "두 창의 자리를 맞바꾸는" 가장자리. 창이 둘일 때 탭을 끌면, 그 탭의 창이
   * 서 있지 않은 맞은편 가장자리가 그렇다. 그 자리에는 이미 다른 창이 있어 띠를 따로 잰다.
   */
  swap?: DropEdge;
}

const ALL_EDGES: DropEdge[] = ["left", "right", "top", "bottom"];

/**
 * 가장자리 띠의 두께.
 *
 * <p>띠는 그 축 길이의 3분의 1 이다. 가장자리에 바짝 붙이지 않아도 "그쪽으로 가져가면" 잡힌다.
 * 좁은 창에서도 손이 닿을 만큼(`min`)은 남긴다.
 */
const BAND = { ratio: 1 / 3, min: 72 };
/** 한 번 잡은 가장자리는 이만큼 더 벗어나야 놓친다. 경계에서 미리보기가 떨리지 않게 한다 */
const HYSTERESIS = 12;

/**
 * 지금 배치에서 이 물건을 놓을 수 있는 자리.
 *
 * <ul>
 *   <li>창이 하나면 네 가장자리 어디든 새 창이 선다. 사이드바의 파일은 그 창 안에도 놓을
 *       수 있다(그 창에 연다). 하나뿐인 창의 하나뿐인 탭은 갈 곳이 없다.
 *   <li>창이 둘이면 더 늘릴 수 없다. 사이드바의 파일은 두 창 안과, 지금 분할과 직교하는 두
 *       가장자리(받는 창이 그 가장자리로 간다)를 받는다. 같은 축의 가장자리는 그쪽 창과
 *       같은 자리라 따로 두지 않는다.
 *   <li>창이 둘일 때 **탭**은 다른 창 안(그 창으로 옮긴다)과, 제 창이 지금 서 있는 곳만 뺀
 *       세 가장자리를 받는다. 가장자리는 창을 다시 놓는 자리다 — 맞은편이면 두 창이 자리를
 *       맞바꾸고(`swap`), 직교하면 분할 방향이 바뀐다.
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

  const row = splitOf(layout).direction === "row";
  const crossing: DropEdge[] = row ? ["top", "bottom"] : ["left", "right"];
  if (!moving) {
    return { edges: crossing, panes: layout.panes.map((pane) => pane.id) };
  }
  // 제 창이 앞(왼쪽·위)에 서 있으면 맞은편은 뒤(오른쪽·아래)다.
  const leading = layout.panes[0].id === origin!.id;
  const swap: DropEdge = row
    ? leading
      ? "right"
      : "left"
    : leading
      ? "bottom"
      : "top";
  return {
    edges: [...crossing, swap],
    panes: layout.panes
      .filter((pane) => pane.id !== origin!.id)
      .map((pane) => pane.id),
    swap,
  };
}

/**
 * 그 가장자리에 놓으면 거기 서는 창이 그 축에서 차지할 몫(0…1).
 *
 * <p>실제로 놓았을 때의 배치를 계산해 읽는다. 미리보기를 이 값으로 그리면 놓은 뒤의 모습과
 * 어긋날 수 없다 — 새로 나누면 절반이고, 맞바꾸면 그 창이 원래 갖고 있던 크기다.
 */
export function landingShare(
  layout: WorkspaceLayout,
  source: DragSource,
  edge: DropEdge,
): number {
  const after = layoutReducer(layout, {
    type: "split",
    edge,
    target: source.target,
    from: source.from,
  });
  if (after.panes.length < 2) return 1;
  const { ratio } = splitOf(after);
  return edge === "left" || edge === "top" ? ratio : 1 - ratio;
}

function horizontal(edge: DropEdge) {
  return edge === "left" || edge === "right";
}

/** 그 가장자리에 붙어 서 있는 창 */
function paneAt(edge: DropEdge, paneRects: ReadonlyMap<string, Rect>) {
  let found: Rect | null = null;
  let best = -Infinity;
  for (const rect of paneRects.values()) {
    // 가장자리 쪽으로 가장 멀리 나가 있는 창이 그 가장자리의 창이다.
    const reach = {
      left: -rect.left,
      right: rect.left + rect.width,
      top: -rect.top,
      bottom: rect.top + rect.height,
    }[edge];
    if (reach > best) {
      best = reach;
      found = rect;
    }
  }
  return found;
}

/**
 * 그 가장자리 띠의 두께.
 *
 * <ul>
 *   <li>가운데에 받을 창이 없으면(하나뿐인 창에서 탭을 끌 때) 띠가 영역을 넷으로 나눠 갖는다.
 *       어디에 놓든 가장 가까운 가장자리로 간다 — 빈 가운데를 남겨 둘 이유가 없다.
 *   <li>맞바꾸는 가장자리는 거기 서 있는 창의 바깥쪽 절반이다. 안쪽 절반은 "이 창으로 옮기기"
 *       로 남는다. 창이 작으면 띠도 그만큼 작아져 그 창을 다 덮지 않는다.
 *   <li>그 밖에는 영역의 3분의 1 이다.
 * </ul>
 */
function bandOf(
  edge: DropEdge,
  area: Rect,
  paneRects: ReadonlyMap<string, Rect>,
  offered: OfferedZones,
) {
  const length = horizontal(edge) ? area.width : area.height;
  if (offered.panes.length === 0) return length / 2;
  if (edge === offered.swap) {
    const standing = paneAt(edge, paneRects);
    if (standing) {
      return (horizontal(edge) ? standing.width : standing.height) / 2;
    }
  }
  return Math.max(BAND.min, length * BAND.ratio);
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
 * 가장자리 띠가 먼저다. 모서리에서는 두 띠가 겹치므로, 띠 두께에 견주어 가장자리에 더
 * 가까운 쪽을 고른다. 띠 밖이면 포인터 아래의 창이고, 창 사이 틈에서는 더 가까운 창이다.
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
    const held = current?.kind === "edge" && current.edge === candidate;
    const band =
      bandOf(candidate, area, paneRects, offered) + (held ? HYSTERESIS : 0);
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
 * 그 자리에 놓으면 시트가 차지할 사각형. 창은 그 창 자신이고, 가장자리는 영역에서 시트 사이
 * 틈을 뺀 나머지의 `share` 만큼이다 — 새로 나누면 절반, 맞바꾸면 그 창의 원래 크기다
 * ({@link landingShare}).
 */
export function previewRect(
  zone: DropZone,
  area: Rect,
  paneRects: ReadonlyMap<string, Rect>,
  gap: number,
  share = 0.5,
): Rect {
  if (zone.kind === "pane") return paneRects.get(zone.paneId) ?? area;
  const width = (area.width - gap) * share;
  const height = (area.height - gap) * share;
  switch (zone.edge) {
    case "left":
      return { ...area, width };
    case "right":
      return { ...area, left: area.left + area.width - width, width };
    case "top":
      return { ...area, height };
    case "bottom":
      return { ...area, top: area.top + area.height - height, height };
  }
}
