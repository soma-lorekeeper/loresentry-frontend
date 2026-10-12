import type { Point, Rect } from "../model/drop-zones";

/**
 * macOS 의 지니(Genie) 효과 — 창이 Dock 아이콘에서 요술램프의 연기처럼 나오는 움직임 — 의 계산.
 *
 * <p><b>실제 효과의 구조.</b> 창을 최소화할 때의 지니는 두 움직임을 겹친 것이다.
 * <ol>
 *   <li><b>곡선</b>(전체의 0–40%): 창의 양 옆선이 곧은 선에서 S 자 곡선으로 휘며, 그 끝이
 *       아이콘의 양 모서리로 모인다. 곡선은 양 끝에서 진행 방향과 나란한 3차 Bézier 다.
 *   <li><b>미끄러짐</b>(30–100%): 창이 그 두 곡선 사이를 지나 아이콘으로 빨려 들어간다. 창은
 *       진행 방향으로 얇게 썬 <b>조각</b>들이고, 조각마다 지금 지나는 자리의 두 곡선 사이에
 *       끼워 맞춘 사다리꼴이 된다. 조각의 두께는 그대로이고 폭만 곡선을 따른다. 아이콘의
 *       가장자리를 지난 부분은 아이콘 뒤로 가려진다.
 * </ol>
 * 꺼낼 때는 이것을 거꾸로 돌린다: 먼저 아이콘에서 미끄러져 나오고, 뒤이어 곡선이 펴진다.
 * 수치(단계의 구간, 곡선의 모양, 사다리꼴 변환)는 이 효과를 그대로 옮긴 공개 구현
 * BCGenieEffect(Bartosz Ciechanowski)를 따랐다.
 *
 * <p>여기서 아이콘은 끌어온 단추(사이드바의 파일 줄, 탭)이고, 창은 새로 생긴 창이다.
 * DOM 을 모르는 순수 계산이라 좌표만으로 테스트한다. 조각을 만들어 움직이는 일은
 * use-pane-motion.ts 가 한다.
 */

/** 두 움직임이 전체에서 차지하는 구간. 최소화 방향(창 → 단추)의 진행도 기준이다 */
const PHASE = {
  curves: { start: 0, end: 0.4 },
  slide: { start: 0.3, end: 1 },
};

/** 화면 위의 사각형 조각이 놓일 네 꼭짓점 */
export interface Quad {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

/** 창을 썬 조각 하나. 창의 왼쪽 위를 기준으로 한 자리와 크기다 */
export interface Slice {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface GenieGeometry {
  /** 창이 단추로 드나드는 방향. 가로("x")면 조각은 세로로 긴 띠다 */
  axis: "x" | "y";
  /** 단추가 창보다 큰 좌표 쪽(오른쪽·아래)에 있으면 1, 작은 쪽(왼쪽·위)이면 -1 */
  sign: 1 | -1;
  /** 단추의 가장자리 가운데 창을 마주 보는 쪽. 이 선을 넘어간 부분은 가려진다 */
  edge: number;
  /** 창의 먼 쪽 변부터 차례로 썬 조각들 */
  slices: Slice[];
}

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const within = (phase: { start: number; end: number }, t: number) =>
  clamp01((t - phase.start) / (phase.end - phase.start));
const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

/**
 * 단추를 창 밖으로 밀어낸다.
 *
 * <p>지니는 창이 단추 "쪽으로" 흘러가는 움직임이라, 단추가 창과 겹쳐 있으면 방향이 서지
 * 않는다(하나뿐인 창의 탭을 끌어 새 창을 만들면 그 탭은 새 창의 자리 안에 있다). 그때는
 * 가장 조금만 밀어도 되는 쪽으로 단추를 창의 바로 바깥에 붙인다 — 탭이면 창의 위쪽이다.
 */
function outside(pane: Rect, source: Rect): Rect {
  const paneRight = pane.left + pane.width;
  const paneBottom = pane.top + pane.height;
  const beside =
    source.left + source.width <= pane.left || source.left >= paneRight;
  const beyond =
    source.top + source.height <= pane.top || source.top >= paneBottom;
  if (beside || beyond) return source;
  // 네 방향으로 밀어낼 거리. 가장 짧은 쪽을 고른다.
  const pushes = [
    { left: pane.left - source.width, top: source.top },
    { left: paneRight, top: source.top },
    { left: source.left, top: pane.top - source.height },
    { left: source.left, top: paneBottom },
  ];
  const cost = (push: { left: number; top: number }) =>
    Math.abs(push.left - source.left) + Math.abs(push.top - source.top);
  const nearest = pushes.reduce((best, push) =>
    cost(push) < cost(best) ? push : best,
  );
  return { ...source, ...nearest };
}

/** 그 사각형을 진행 방향(along)과 그에 수직인 방향(across)의 구간으로 읽는다 */
function spans(rect: Rect, axis: "x" | "y") {
  const x: [number, number] = [rect.left, rect.left + rect.width];
  const y: [number, number] = [rect.top, rect.top + rect.height];
  return axis === "x" ? { along: x, across: y } : { along: y, across: x };
}

/**
 * 창을 어느 방향으로 어떻게 썰지 정한다.
 *
 * @param pane 창의 제자리
 * @param source 창이 나오는 단추. `pane` 과 같은 기준의 좌표다
 * @param thickness 조각 하나의 두께(px). 얇을수록 곡선이 매끄럽고 조각이 많아진다
 * @param limit 조각 수의 상한. 넘으면 조각을 두껍게 썬다
 */
export function genieGeometry(
  pane: Rect,
  source: Rect,
  thickness: number,
  limit = Infinity,
): GenieGeometry & { source: Rect } {
  const from = outside(pane, source);
  const dx = from.left + from.width / 2 - (pane.left + pane.width / 2);
  const dy = from.top + from.height / 2 - (pane.top + pane.height / 2);
  const beside =
    from.left + from.width <= pane.left || from.left >= pane.left + pane.width;
  const beyond =
    from.top + from.height <= pane.top || from.top >= pane.top + pane.height;
  // 단추가 옆에 있으면 가로로, 위·아래에 있으면 세로로 드나든다. 대각선에 있으면 더 먼 쪽이다.
  const axis: "x" | "y" =
    beside && beyond
      ? Math.abs(dx) >= Math.abs(dy)
        ? "x"
        : "y"
      : beside
        ? "x"
        : "y";
  const sign = (axis === "x" ? dx : dy) >= 0 ? 1 : -1;
  const length = axis === "x" ? pane.width : pane.height;
  const count = Math.max(1, Math.min(limit, Math.ceil(length / thickness)));
  const size = length / count;

  const slices: Slice[] = [];
  for (let index = 0; index < count; index += 1) {
    // 먼 쪽 변부터 센다. 단추가 오른쪽·아래에 있으면 먼 쪽은 왼쪽·위다.
    const start = sign > 0 ? index * size : length - (index + 1) * size;
    slices.push(
      axis === "x"
        ? { left: start, top: 0, width: size, height: pane.height }
        : { left: 0, top: start, width: pane.width, height: size },
    );
  }
  const sourceAlong = spans(from, axis).along;
  return {
    axis,
    sign,
    edge: sign > 0 ? sourceAlong[0] : sourceAlong[1],
    slices,
    source: from,
  };
}

/**
 * 곡선 위에서, 진행 방향으로 `fraction` 만큼 간 곳이 수직 방향으로는 얼마나 옮겨 갔는가(0…1).
 *
 * <p>곡선은 양 끝에서 진행 방향과 나란한 3차 Bézier 다(조절점 둘이 진행 방향의 한가운데에
 * 있다). 매개변수 u 로 쓰면 진행 방향은 `1.5u − 1.5u² + u³`, 수직 방향은 `u²(3 − 2u)` 만큼
 * 간다. 진행 방향의 자리에서 u 를 거꾸로 구해(Newton 법) 수직 방향의 몫을 읽는다.
 */
function bend(fraction: number) {
  let u = fraction;
  for (let iteration = 0; iteration < 5; iteration += 1) {
    const value = 1.5 * u - 1.5 * u * u + u * u * u - fraction;
    const slope = 1.5 - 3 * u + 3 * u * u;
    u -= value / slope;
  }
  return smooth(clamp01(u));
}

/**
 * 그 순간 조각들이 놓일 자리.
 *
 * @param progress 0 이면 창이 단추 안에 다 들어가 있고, 1 이면 제자리에 다 나와 있다
 */
export function genieQuads(
  pane: Rect,
  geometry: GenieGeometry & { source: Rect },
  progress: number,
): Quad[] {
  const { axis, sign, edge } = geometry;
  // 최소화 방향의 진행도. 꺼내는 것은 그 거꾸로다.
  const t = 1 - progress;
  const curve = smooth(within(PHASE.curves, t));
  const slide = smooth(within(PHASE.slide, t));

  const paneSpans = spans(pane, axis);
  const sourceSpans = spans(geometry.source, axis);
  const length = paneSpans.along[1] - paneSpans.along[0];
  const depth = sourceSpans.along[1] - sourceSpans.along[0];
  /** 창의 먼 쪽 변. 두 곡선이 여기서 시작해 단추의 가장자리(`edge`)에서 끝난다 */
  const far = sign > 0 ? paneSpans.along[0] : paneSpans.along[1];
  const reach = edge - far;
  // 곡선의 끝은 창의 옆선을 그대로 내린 자리에서 단추의 모서리로 모인다.
  const endLow = lerp(paneSpans.across[0], sourceSpans.across[0], curve);
  const endHigh = lerp(paneSpans.across[1], sourceSpans.across[1], curve);
  /** 창의 먼 쪽 변이 지금 있는 자리. 미끄러지면서 단추의 가장자리까지 간다 */
  const head = lerp(far, edge, slide);

  /** 진행 방향의 그 자리를 지나는 두 곡선 위의 점(작은 쪽, 큰 쪽) */
  const crossing = (position: number): [Point, Point] => {
    const overflow = sign * (position - edge);
    // 단추의 가장자리를 넘어간 부분은 단추 안에 눌려 들어간다(그리고 가려진다).
    const along =
      overflow > 0 ? edge + (sign * overflow * depth) / length : position;
    const fraction =
      overflow > 0 || reach === 0 ? 1 : clamp01((position - far) / reach);
    const moved = bend(fraction);
    const low = lerp(paneSpans.across[0], endLow, moved);
    const high = lerp(paneSpans.across[1], endHigh, moved);
    return axis === "x"
      ? [
          { x: along, y: low },
          { x: along, y: high },
        ]
      : [
          { x: low, y: along },
          { x: high, y: along },
        ];
  };

  let offset = 0;
  return geometry.slices.map((slice) => {
    const size = axis === "x" ? slice.width : slice.height;
    const [farLow, farHigh] = crossing(head + sign * offset);
    const [nearLow, nearHigh] = crossing(head + sign * (offset + size));
    offset += size;
    // 조각의 변 가운데 창의 먼 쪽 변을 향한 것이 far 다. 단추가 오른쪽·아래에 있으면 그것이
    // 조각의 왼쪽·위 변이고, 왼쪽·위에 있으면 오른쪽·아래 변이다.
    if (axis === "x") {
      return sign > 0
        ? {
            topLeft: farLow,
            bottomLeft: farHigh,
            topRight: nearLow,
            bottomRight: nearHigh,
          }
        : {
            topRight: farLow,
            bottomRight: farHigh,
            topLeft: nearLow,
            bottomLeft: nearHigh,
          };
    }
    return sign > 0
      ? {
          topLeft: farLow,
          topRight: farHigh,
          bottomLeft: nearLow,
          bottomRight: nearHigh,
        }
      : {
          bottomLeft: farLow,
          bottomRight: farHigh,
          topLeft: nearLow,
          topRight: nearHigh,
        };
  });
}

/**
 * 가로 `width`, 세로 `height` 인 사각형을 그 네 꼭짓점으로 옮기는 CSS 변환.
 *
 * <p>사다리꼴은 늘이기·기울이기만으로는 만들 수 없어 투영 변환(`matrix3d`)을 쓴다. 변환의
 * 기준점은 사각형의 왼쪽 위(`transform-origin: 0 0`)여야 한다.
 */
export function quadTransform(width: number, height: number, quad: Quad) {
  const { topLeft: p0, topRight: p1, bottomRight: p2, bottomLeft: p3 } = quad;
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  // 넓이가 없는 사각형(한 점으로 눌린 조각)에서도 나눗셈이 터지지 않게 한다.
  const denominator = dx1 * dy2 - dx2 * dy1 || 1e-6;
  const g = (dx3 * dy2 - dx2 * dy3) / denominator;
  const h = (dx1 * dy3 - dx3 * dy1) / denominator;
  // 단위 사각형 → 네 꼭짓점의 변환을, 사각형의 실제 크기로 나눠 맞춘다.
  const values = [
    (p1.x - p0.x + g * p1.x) / width,
    (p1.y - p0.y + g * p1.y) / width,
    0,
    g / width,
    (p3.x - p0.x + h * p3.x) / height,
    (p3.y - p0.y + h * p3.y) / height,
    0,
    h / height,
    0,
    0,
    1,
    0,
    p0.x,
    p0.y,
    0,
    1,
  ];
  return `matrix3d(${values.join(", ")})`;
}
