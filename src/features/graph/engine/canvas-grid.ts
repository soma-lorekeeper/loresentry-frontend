/**
 * 캔버스 배경 격자.
 *
 * 그래프 뷰와 타임라인 뷰가 같은 격자를 쓴다. 배경이 완전히 비어 있으면 줌과 이동이
 * 얼마나 일어났는지 알 수 없어서, 눈금 역할을 하는 옅은 격자를 깔아 둔다.
 *
 * force-graph 의 onRenderFramePre 는 줌 변환이 걸린 상태로 링크·노드보다 먼저
 * 불리므로, 여기에 그래프 좌표로 선을 그으면 그대로 배경에 깔린다.
 */

import type { Palette } from "./palette";

/** 지금 화면에 보이는 그래프 좌표 범위 */
export interface GridBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 화면상 칸 간격이 이 범위 안에 머물도록 칸을 2배씩 접었다 편다 */
const MIN_CELL_PX = 14;
const MAX_CELL_PX = 44;
/** 몇 칸마다 굵은 선을 넣을지 */
const STRONG_EVERY = 5;

export function drawCanvasGrid(
  ctx: CanvasRenderingContext2D,
  globalScale: number,
  view: GridBounds,
  palette: Palette,
): void {
  let step = 20;
  while (step * globalScale < MIN_CELL_PX) step *= 2;
  while (step * globalScale > MAX_CELL_PX && step > 0.5) step /= 2;

  ctx.lineWidth = 1 / globalScale;

  // 얇은 선과 굵은 선을 각각 한 번의 path 로 몰아 그린다(stroke 호출 2번).
  for (const strong of [false, true]) {
    ctx.beginPath();
    ctx.strokeStyle = strong ? palette.gridStrong : palette.grid;

    for (
      let x = Math.floor(view.minX / step) * step;
      x <= view.maxX;
      x += step
    ) {
      // 음수에서도 나머지가 양수가 되게 보정한다.
      const isStrong =
        ((Math.round(x / step) % STRONG_EVERY) + STRONG_EVERY) %
          STRONG_EVERY ===
        0;
      if (isStrong !== strong) continue;
      ctx.moveTo(x, view.minY);
      ctx.lineTo(x, view.maxY);
    }

    for (
      let y = Math.floor(view.minY / step) * step;
      y <= view.maxY;
      y += step
    ) {
      const isStrong =
        ((Math.round(y / step) % STRONG_EVERY) + STRONG_EVERY) %
          STRONG_EVERY ===
        0;
      if (isStrong !== strong) continue;
      ctx.moveTo(view.minX, y);
      ctx.lineTo(view.maxX, y);
    }

    ctx.stroke();
  }
}
