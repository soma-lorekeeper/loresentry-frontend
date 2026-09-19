/**
 * 캔버스에 그리는 분류 아이콘.
 *
 * 문서 화면과 사이드바는 lucide-react 컴포넌트를 그대로 쓰지만, 그래프는 캔버스라
 * DOM 을 얹을 수 없다. 그래서 같은 아이콘의 **도형 데이터**(icon-shapes.ts)를 Path2D 로 옮긴다.
 * 데이터가 하나이므로 화면마다 아이콘이 어긋날 일이 없고, 벡터라 얼마나 확대해도
 * 뭉개지지 않는다.
 */

import {
  CHARACTER_SHAPE,
  EVENT_SHAPE,
  ITEM_SHAPE,
  MANUSCRIPT_SHAPE,
  ORGANIZATION_SHAPE,
  PLACE_SHAPE,
  STAR_SHAPE,
  WORLDVIEW_SHAPE,
  type IconShape,
} from "./icon-shapes";

import type { NodeKind } from "./types";

/** lucide 아이콘이 그려지는 정사각형 한 변. 모든 좌표가 이 안에 있다 */
const ICON_VIEWBOX = 24;

const ICON_NODE: Record<NodeKind, IconShape> = {
  manuscript: MANUSCRIPT_SHAPE,
  character: CHARACTER_SHAPE,
  place: PLACE_SHAPE,
  organization: ORGANIZATION_SHAPE,
  item: ITEM_SHAPE,
  event: EVENT_SHAPE,
  worldview: WORLDVIEW_SHAPE,
};

/**
 * 도형 데이터를 Path2D 하나로 합친다.
 *
 * 우리가 쓰는 일곱 개는 path 와 circle 만 쓴다. 다른 태그가 섞이면 조용히 빠지는
 * 대신 눈에 띄게 두는 편이 낫지만, 그리는 코드가 프레임마다 도는 자리라 여기서
 * 던지지는 않는다 — 아이콘 하나가 덜 그려질 뿐이다.
 */
function toPath(shapes: [string, Record<string, string>][]): Path2D {
  const path = new Path2D();

  for (const [tag, attrs] of shapes) {
    if (tag === "path" && attrs.d) {
      path.addPath(new Path2D(attrs.d));
    } else if (tag === "circle") {
      const circle = new Path2D();
      circle.arc(
        Number(attrs.cx),
        Number(attrs.cy),
        Number(attrs.r),
        0,
        2 * Math.PI,
      );
      path.addPath(circle);
    }
  }

  return path;
}

/** 분류마다 한 번만 만든다. 매 프레임 Path2D 를 새로 파면 노드 수만큼 비용이 든다 */
let paths: Record<NodeKind, Path2D> | null = null;

// Path2D 는 브라우저에만 있다. 정적 export 의 서버 렌더에서 모듈을 읽어도 터지지
// 않도록 처음 그릴 때 만든다.
function pathsFor(): Record<NodeKind, Path2D> {
  paths ??= {
    manuscript: toPath(ICON_NODE.manuscript),
    character: toPath(ICON_NODE.character),
    place: toPath(ICON_NODE.place),
    organization: toPath(ICON_NODE.organization),
    item: toPath(ICON_NODE.item),
    event: toPath(ICON_NODE.event),
    worldview: toPath(ICON_NODE.worldview),
  };
  return paths;
}

/**
 * 노드 한가운데에 분류 아이콘을 그린다.
 *
 * `size` 는 아이콘이 들어갈 정사각형의 한 변(그래프 좌표). 선 굵기는 그 크기에
 * 비례시켜야 작게 그려도 형태가 뭉개지지 않는다.
 */
export function drawKindIcon(
  ctx: CanvasRenderingContext2D,
  kind: NodeKind,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  const scale = size / ICON_VIEWBOX;

  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(scale, scale);
  ctx.strokeStyle = color;
  // lucide 기본 굵기는 2 다. 작게 줄일수록 상대적으로 굵게 잡아야 형태가 살아남는다.
  ctx.lineWidth = 2.1;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke(pathsFor()[kind]);
  ctx.restore();
}

/** 별도 한 번만 판다. 분류 아이콘과 같은 이유다 */
let starPath: Path2D | null = null;

/**
 * 즐겨찾기 별.
 *
 * 노드 원 안은 분류 아이콘이 이미 쓰고 있어 겹칠 수 없다. 모서리에 배지로 붙이되
 * **속을 채운다** — 이 크기에서 윤곽선만으로는 별인지 알아볼 수 없다.
 *
 * 채운 별이 노드 색에 붙어 뭉개지지 않도록 배경색으로 한 번 두른다. 이름표가 밝은
 * 노드 위에서 사라지지 않게 쓰는 것과 같은 수법이다(graph-2d.tsx 의 strokeText).
 */
export function drawFavoriteStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  outline: string,
): void {
  const scale = size / ICON_VIEWBOX;

  ctx.save();
  ctx.translate(x - size / 2, y - size / 2);
  ctx.scale(scale, scale);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  // 테두리를 먼저 두껍게 긋고 그 위에 채운다. 순서가 반대면 테두리가 별을 파먹는다.
  ctx.strokeStyle = outline;
  ctx.lineWidth = 5;
  starPath ??= toPath(STAR_SHAPE);
  ctx.stroke(starPath);
  ctx.fillStyle = color;
  ctx.fill(starPath);
  ctx.restore();
}
