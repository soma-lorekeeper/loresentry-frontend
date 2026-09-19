/**
 * 다시 그릴 때의 연출 — 중심으로 수축했다가 계산된 자리로 펼친다.
 *
 * 필터를 바꾸거나 한 노드를 눌러 그 주변만 보게 되면 그래프가 통째로 달라진다.
 * 새 그림을 아무 예고 없이 갈아끼우면 "무엇이 무엇으로 바뀌었는지"가 사라지고,
 * 노드 수백 개가 한 프레임에 순간이동한 것처럼 보인다. 한 번 모았다가 펼치면
 * 그 사이에 눈이 따라갈 시간이 생긴다.
 *
 * 도는 동안에는 좌표를 **fx/fy 에 써넣어 못박은 채** 움직인다. d3-force 는 fx 가
 * 있으면 x 를 거기에 맞추고 속도를 무시하므로, 힘이 어떻게 설정돼 있든 우리가 쓴
 * 좌표 그대로 그려진다. 애니메이션과 물리가 서로 밀 일이 없다.
 */

import {
  pin,
  releaseNode,
  type LayoutNode,
  type PackedLayout,
  type Point,
} from "./packed-layout";

/** 지금 좌표에서 중심으로 모이는 시간 */
export const COLLAPSE_MS = 260;
/** 중심에서 계산된 자리로 펼쳐지는 시간 */
export const EXPAND_MS = 700;
/**
 * 첫 진입의 펼침 시간.
 *
 * 첫 진입에는 수축할 좌표가 없어 곧바로 펼쳐진다. 다른 경우와 같은 700ms 로 두면
 * 화면이 뜨자마자 끝나 버려서 연출이 눈에 남지 않는다. 앞에 멈추는 구간을 두는 대신
 * 펼치는 시간만 늘려, 원이 그려지는 과정을 눈으로 따라갈 수 있게 한다.
 */
export const FIRST_EXPAND_MS = 1_100;

const ORIGIN: Point = { x: 0, y: 0 };

/**
 * 두 점 사이의 보간. t 는 0~1 의 **이미 감속이 적용된** 진행률이다.
 *
 * 감속을 여기가 아니라 부르는 쪽에서 하는 이유는, 수축과 펼침이 서로 다른 곡선을
 * 쓰기 때문이다 — 모일 때는 고르게, 펼칠 때는 초반에 쭉 뻗고 끝에서 부드럽게.
 */
export function revealPoint(from: Point, to: Point, t: number): Point {
  return {
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  };
}

/** 초반에 빠르고 끝에서 느려진다. 펼칠 때 "쭉 뻗는" 느낌이 여기서 나온다 */
function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** 노드의 지금 좌표. 아직 배치된 적이 없으면 원점 */
function currentPoint(node: LayoutNode): Point {
  return { x: node.x ?? 0, y: node.y ?? 0 };
}

/**
 * 프레임마다 `write` 를 부르는 루프. 끝나면 `onDone` 을 부른다.
 *
 * 돌려주는 함수를 부르면 도중에 멈춘다 — 애니메이션이 끝나기 전에 그래프가 또
 * 바뀌면(필터를 연달아 누르는 경우) 이전 루프가 남아 좌표를 덮어쓰면 안 된다.
 */
function tween(
  durationMs: number,
  write: (t: number) => void,
  onDone: () => void,
): () => void {
  // 시간을 0 이하로 주면 곧바로 끝난 것으로 친다(테스트와 즉시 배치용).
  if (durationMs <= 0) {
    write(1);
    onDone();
    return () => {};
  }

  const started = performance.now();
  let handle = 0;
  let stopped = false;

  const step = () => {
    if (stopped) return;
    const t = Math.min((performance.now() - started) / durationMs, 1);
    write(t);
    if (t < 1) {
      handle = requestAnimationFrame(step);
      return;
    }
    onDone();
  };

  handle = requestAnimationFrame(step);
  return () => {
    stopped = true;
    cancelAnimationFrame(handle);
  };
}

export interface RevealOptions {
  /**
   * 첫 진입인지. 수축 단계를 건너뛰고 펼침을 더 길게 잡는다.
   *
   * 렌더러는 "이 캔버스에서 아직 한 번도 펼친 적이 없다"를 이걸로 넘긴다.
   */
  first: boolean;
  /** 프레임마다 불린다. 좌표를 따라 무언가를 옮겨야 할 때 쓴다 */
  onFrame?: () => void;
}

/**
 * 수축 → 펼침을 재생한다. 돌려주는 함수를 부르면 도중에 멈춘다.
 *
 * 끝나면 **못을 뽑아 물리에 넘긴다**(physics.ts). 연출이 도는 동안에는 좌표를 우리가
 * 프레임마다 써야 하므로 못박아 두지만, 다 펼친 뒤에는 그래프가 스스로 살아 있어야
 * 한다. 배치는 여기까지가 제 일이고 그 뒤로는 출발 모양으로만 남는다.
 */
export function startReveal(
  nodes: readonly LayoutNode[],
  home: PackedLayout["home"],
  { first, onFrame }: RevealOptions,
  onDone: () => void = () => {},
): () => void {
  // 시작점을 미리 담아둔다. 매 프레임 노드에서 읽으면 직전 프레임에 우리가 써넣은
  // 값을 다시 시작점으로 삼게 되어 움직임이 점점 느려진다.
  const from = nodes.map(currentPoint);
  const to = nodes.map((node) => home.get(node.id) ?? ORIGIN);

  /** 다 펼쳤으면 못을 뽑는다. 여기서부터는 힘이 그래프를 움직인다 */
  const handOver = () => {
    for (const node of nodes) releaseNode(node);
    onDone();
  };

  // 보이지 않는 탭에서는 곧바로 완성된 자리로 간다.
  //
  // 브라우저는 숨은 탭의 requestAnimationFrame 을 아예 멈춘다. 그대로 두면 노드가
  // 중심에 모인 점 하나인 채로 굳고, 사용자가 그 탭으로 돌아와서야 펼쳐진다.
  // 애니메이션은 눈이 변화를 따라가도록 돕는 장치라, 볼 사람이 없으면 할 일도 없다.
  if (typeof document !== "undefined" && document.hidden) {
    nodes.forEach((node, index) => pin(node, to[index]));
    onFrame?.();
    handOver();
    return () => {};
  }

  const expand = () =>
    tween(
      first ? FIRST_EXPAND_MS : EXPAND_MS,
      (t) => {
        const eased = easeOutCubic(t);
        nodes.forEach((node, index) => {
          pin(node, revealPoint(ORIGIN, to[index], eased));
        });
        onFrame?.();
      },
      handOver,
    );

  // 첫 진입은 수축할 좌표가 없다. 곧바로 중심에서 펼친다.
  if (first) {
    nodes.forEach((node) => pin(node, ORIGIN));
    return expand();
  }

  let cancel = tween(
    COLLAPSE_MS,
    (t) => {
      nodes.forEach((node, index) => {
        pin(node, revealPoint(from[index], ORIGIN, t));
      });
      onFrame?.();
    },
    () => {
      cancel = expand();
    },
  );

  // 수축 도중에 멈출 수도, 펼침 도중에 멈출 수도 있다. 지금 도는 쪽을 끈다.
  return () => cancel();
}
