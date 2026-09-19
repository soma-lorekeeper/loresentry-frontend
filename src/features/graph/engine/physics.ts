/**
 * 상시 도는 물리 — 해파리처럼.
 *
 * 예전에는 노드를 전부 fx/fy 로 못박아 두고 드래그하는 동안, 그것도 끄는 노드 둘레의
 * 좁은 영역에만 힘을 켰다. 쉬고 있는 원이 계산값과 한 치도 어긋나지 않는 대신 그림이
 * 죽어 있었다. 이제는 반대로 간다 — 배치는 **출발 모양**만 잡아주고, 그다음부터는
 * 힘이 그래프를 계속 살아 있게 한다.
 *
 * 거는 힘은 딱 둘뿐이다.
 *
 *  - **엣지 거리 유지**: 끌어당기기만 하는 힘이 아니라 **기준 거리로 되돌리는** 힘이다.
 *    멀어지면 당기고 가까워지면 밀어낸다. 이게 그래프의 모양을 만드는 유일한 힘이다.
 *  - **겹침 방지**: 그려지는 반지름의 몇 배 안으로 들어오면 밀어낸다. 노드는 차수에
 *    따라 크기가 다르므로 반발 거리도 그만큼 다르다 — 이어진 곳이 많은 큰 노드일수록
 *    넓게 자리를 차지한다.
 *
 * 가운데로 당기는 힘도, 서로 밀어내는 힘(charge)도, 덩어리를 만드는 힘도 없다.
 * 그런 것이 하나라도 붙으면 그래프가 한 점으로 쏠리거나 풍선처럼 부푼다.
 *
 * **기준 거리는 엣지마다 다르다 — 배치가 그 엣지에 준 길이 그대로다.**
 *
 * 모든 엣지에 같은 거리(82)를 주면 원을 가로지르는 긴 엣지가 전부 82 로 줄어들려
 * 해서, 그래프가 4배쯤 오그라들고 균일한 원이 무너진다. 반대로 각 엣지의 기준을
 * "배치에서 이 엣지가 실제로 가졌던 길이"로 잡으면 **배치 자체가 힘의 평형점**이
 * 된다 — 모든 엣지의 오차가 0 이고 어떤 두 노드도 겹치지 않으니 아무 힘도 작용하지
 * 않는다. 그러다 노드를 끌면 그 둘레의 엣지만 늘어나 당기고, 손을 놓으면 원래
 * 길이로 천천히 되돌아간다. 힘을 하나도 더하지 않고 원이 유지되는 이유다.
 *
 * **느낌은 세 값이 만든다.** 전부 약하게 잡아, 노드가 목표로 튀어가는 게 아니라
 * 물속에서 밀려가듯 천천히 흘러가게 했다. 드래그를 놓았을 때 제자리로 되돌아오는
 * 것도 같은 힘이 하는 일이라, 따로 되돌리는 처리가 없어도 천천히 풀린다.
 */

import { forceCollide } from "d3-force-3d";

import { endpointId } from "./highlight";
import type { LayoutLink, LayoutNode, PackedLayout } from "./packed-layout";

/**
 * 엣지가 기준 거리를 지키려는 세기.
 *
 * alpha 가 1 로 고정되어 있으므로(아래 JELLYFISH_ALPHA_DECAY 참고) 한 틱에 오차의
 * 3% 가 속도로 실리고, 속도 감쇠까지 거치면 남은 오차의 2.5% 씩 좁혀진다 —
 * 60fps 에서 시정수 0.7초쯤이라 놓으면 스르르 제자리로 돌아온다.
 *
 * 0.1 이면 이웃이 손가락에 붙은 것처럼 딸려오고, 0.005 면 거의 반응하지 않는다.
 */
const LINK_STRENGTH = 0.03;

/**
 * 겹침을 한 틱에 얼마나 해소할지.
 *
 * 1 이면 겹친 만큼을 한 프레임에 다 밀어내 딱딱하게 부딪힌다. 0.5 면 절반씩 물러나
 * 두어 프레임에 걸쳐 벌어진다 — 밀리는 게 눈에 보이면서도 튕기지는 않는다.
 */
const COLLIDE_STRENGTH = 0.5;

/**
 * 그려지는 반지름의 몇 배까지 밀어낼지.
 *
 * 1 이면 원이 서로 스칠 때에야 밀어내기 시작해서, 붙었다는 게 눈에 보인 뒤에야
 * 반응한다. 2 면 제 몸 하나만큼 떨어진 거리에서부터 비켜서 서로를 알아채는 느낌이
 * 난다. 크기에 비례하는 성질은 그대로라 허브일수록 더 넓게 자리를 차지한다.
 *
 * **상한이 있다.** 두 노드의 반경 합이 배치의 최근접 거리를 넘으면 쉬고 있는 원까지
 * 밀어내기 시작해 그래프가 부푼다. 실측한 한계는 2.73배이고, physics.test.ts 가
 * 실제 그래프로 이 선을 지킨다.
 */
const COLLIDE_RADIUS_SCALE = 2;

/**
 * 매 틱 깎이는 속도의 비율 (d3 기본값 0.4).
 *
 * 낮으면 노드가 목표를 지나쳤다 되돌아오기를 반복해 출렁이고, 높으면 꿀 속을 움직이듯
 * 굼떠진다. 0.55 는 미끄러지는 관성은 남기되 출렁임은 남기지 않는 지점이다.
 *
 * 출렁이기 시작하는 경계는 `(1-감쇠)² / 감쇠` 라 여기서는 세기 0.67 쯤이고, 지금
 * 링크 세기는 0.03 이라 한참 아래다.
 */
export const JELLYFISH_VELOCITY_DECAY = 0.55;

/**
 * alpha 감쇠를 0 으로 둔다 = 시뮬레이션이 **식지 않는다**.
 *
 * d3 는 매 틱 alpha 를 조금씩 떨어뜨리다가 임계값 아래로 가면 멈춘다. 그러면 그래프가
 * 몇 초 만에 굳어버려서 해파리가 아니라 표본이 된다. 감쇠를 없애면 alpha 가 1 에
 * 머물러 힘이 계속 같은 세기로 작용한다 — 대신 세기 자체를 위처럼 아주 약하게 잡았다.
 *
 * 엔진이 영영 멈추지 않으므로 캔버스도 계속 다시 그려진다. 265 노드·1,256 엣지에서는
 * 문제가 없지만, 화면을 켜 둔 동안 CPU 를 계속 조금 쓴다는 뜻이기도 하다.
 */
export const JELLYFISH_ALPHA_DECAY = 0;

/** 실제로 밀어내기 시작하는 반경. 테스트가 배치와 견주어 볼 때 쓴다 */
export function collideRadius(
  node: LayoutNode,
  nodeRadius: (node: LayoutNode) => number,
): number {
  return nodeRadius(node) * COLLIDE_RADIUS_SCALE;
}

/**
 * force-graph 인스턴스에서 우리가 쓰는 것만 좁게 적는다.
 *
 * ForceGraphMethods 가 이 모양을 구조적으로 만족한다. 라이브러리 타입을 직접 받으면
 * 노드·링크 제네릭까지 여기로 따라 들어온다.
 */
export interface ForceHost {
  d3Force(name: string): unknown;
  d3Force(name: string, force: unknown): unknown;
}

export interface PhysicsOptions {
  /** 배치가 정한 자리. 엣지마다의 기준 거리를 여기서 잰다 */
  home: PackedLayout["home"];
  /** 자리를 모르는 엣지에 쓸 기본 거리. 배치가 쓰는 간격과 같다 */
  spacing: number;
  /**
   * 그려지는 노드 반지름. 겹침 판정 반경이 곧 이 값이다.
   *
   * 차수에 따라 크기가 달라지므로 함수로 받는다 — 렌더러가 화면에 그릴 때 쓰는 것과
   * **같은 함수**여야 한다. 다르면 눈에 보이는 원과 실제로 밀어내는 범위가 어긋난다.
   */
  nodeRadius: (node: LayoutNode) => number;
}

/** d3 의 링크 힘에서 우리가 만지는 부분만. 거리는 엣지마다 다르므로 함수로 준다 */
interface LinkForce {
  distance(accessor: (link: LayoutLink) => number): unknown;
  strength(value: number): unknown;
}

/**
 * 이 엣지가 배치에서 가졌던 길이. 한쪽이라도 자리를 모르면 기본 간격을 쓴다.
 *
 * 새로 이은 관계처럼 배치 뒤에 생긴 엣지가 여기로 온다 — 그런 엣지는 이웃과 같은
 * 간격을 목표로 삼는 게 자연스럽다.
 */
export function restLength(
  link: LayoutLink,
  home: PackedLayout["home"],
  spacing: number,
): number {
  const source = home.get(endpointId(link.source));
  const target = home.get(endpointId(link.target));
  if (!source || !target) return spacing;
  return Math.hypot(source.x - target.x, source.y - target.y);
}

/**
 * 힘을 심는다. 그래프가 바뀔 때마다 다시 부른다.
 *
 * force-graph 가 링크를 갈아끼우면 링크 힘 객체도 새로 만들어지므로, 페이로드가
 * 바뀔 때마다 거리·세기를 다시 잡아 줘야 한다.
 */
export function installPhysics(host: ForceHost, options: PhysicsOptions): void {
  // 링크 힘은 force-graph 가 이미 심어 두었다. 거리와 세기만 우리 값으로 바꾼다 —
  // 새로 만들면 노드·링크를 다시 물려줘야 하고, 그건 라이브러리가 할 일이다.
  const link = host.d3Force("link") as LinkForce | undefined;
  link?.distance((edge) => restLength(edge, options.home, options.spacing));
  link?.strength(LINK_STRENGTH);

  host.d3Force(
    "collide",
    forceCollide<LayoutNode>(
      (node) => options.nodeRadius(node) * COLLIDE_RADIUS_SCALE,
    ).strength(COLLIDE_STRENGTH),
  );

  // 모양을 만드는 힘은 엣지 하나뿐이어야 한다. 아래 둘이 남아 있으면 그래프가
  // 원점으로 쏠리거나(center), 서로 밀어내며 부푼다(charge).
  host.d3Force("charge", null);
  host.d3Force("center", null);
}
