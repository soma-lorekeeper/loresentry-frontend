export type Placement = "right" | "left" | "bottom" | "top";

export interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Size {
  width: number;
  height: number;
}

export const COMPACT_WIDTH = 600;
const GAP = 14;
const EDGE = 16;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

export function placeCard(
  target: Rect | null,
  card: Size,
  viewport: Size,
  order: readonly Placement[],
): { left: number; top: number } {
  if (viewport.width < COMPACT_WIDTH) {
    const left = 12;
    const below = viewport.height - card.height - 12;
    if (!target) return { left, top: below };
    const center = target.top + target.height / 2;
    return { left, top: center < viewport.height / 2 ? below : 12 };
  }
  if (!target) {
    return {
      left: viewport.width - card.width - 24,
      top: viewport.height - card.height - 24,
    };
  }
  const right = target.left + target.width;
  const bottom = target.top + target.height;
  const alignTop = clamp(
    target.top,
    EDGE,
    viewport.height - card.height - EDGE,
  );
  const alignLeft = clamp(
    target.left,
    EDGE,
    viewport.width - card.width - EDGE,
  );
  for (const side of order) {
    if (side === "right" && right + GAP + card.width <= viewport.width - EDGE)
      return { left: right + GAP, top: alignTop };
    if (side === "left" && target.left - GAP - card.width >= EDGE)
      return { left: target.left - GAP - card.width, top: alignTop };
    if (
      side === "bottom" &&
      bottom + GAP + card.height <= viewport.height - EDGE
    )
      return { left: alignLeft, top: bottom + GAP };
    if (side === "top" && target.top - GAP - card.height >= EDGE)
      return { left: alignLeft, top: target.top - GAP - card.height };
  }
  return {
    left: clamp(
      right - card.width - EDGE,
      EDGE,
      viewport.width - card.width - EDGE,
    ),
    top: clamp(
      bottom - card.height - EDGE,
      EDGE,
      viewport.height - card.height - EDGE,
    ),
  };
}
