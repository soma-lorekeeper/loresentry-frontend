/**
 * 기하 배치 — 전체가 하나의 원이고, 그 안을 동일 간격으로 꽉 채운다.
 *
 * 힘 시뮬레이션(cluster.ts)과 달리 좌표를 **직접 계산**한다. 힘으로는 두 가지를
 * 보장할 수 없기 때문이다 — 링크 인력이 노드를 제각각 당겨 간격이 고르지 않고,
 * 가둠은 밖으로 나간 노드만 되밀어서 안쪽이 덜 차면 원이 아니라 얼룩이 된다.
 *
 * 순서는 셋뿐이다.
 *
 *  1) 노드 수와 간격에서 원의 반지름을 낸다. 노드가 적으면 작은 원, 많아질수록
 *     큰 원이 되고 안쪽 밀도는 언제나 같다.
 *  2) 그 안을 균일한 간격의 자리로 채운다 — 해바라기 나선이다.
 *  3) 어느 노드가 어느 자리에 앉을지는 **그래프 이웃 관계**로 정한다. 자리는 기하로
 *     고정되어 있으므로 간격은 그대로 균일하면서, 이어진 노드끼리 가까워진다.
 *
 * 덩어리(허브 + 위성을 작은 원으로 묶기)는 한때 여기 있었지만 걷어냈다. 덩어리를
 * 구분해 보이려면 그 둘레를 비워야 하는데, 그 빈 링이 곧 원의 구멍이라서 "원을 꽉
 * 채운다"와 정면으로 부딪혔다. 실측으로도 덩어리를 끄면 노드 최근접 거리가 82~92 로
 * 사실상 상수가 되고 원 안에 간격보다 넓은 빈 곳이 하나도 남지 않는다. 덩어리를
 * 켜면 그 값이 50~154 로 벌어지고 가장 큰 구멍이 간격의 1.8배까지 커졌다.
 *
 * 결과 좌표는 fx/fy 에 넣어 **일단** 못박는다. d3-force 는 fx 가 있으면 x 를 거기에
 * 맞추고 속도를 무시하므로, 펼침 연출이 도는 동안 힘과 우리 좌표가 서로 밀지 않는다.
 * 연출이 끝나면 reveal.ts 가 못을 뽑아 물리(physics.ts)에 넘긴다 — 이 배치가 정하는
 * 것은 **출발 모양**이고, 그 뒤로 그래프는 힘을 받아 계속 움직인다.
 */

/** 이 배치가 노드에서 읽고 쓰는 것. RenderNode 가 구조적으로 이 모양을 만족한다 */
export interface LayoutNode {
  id: string;
  degree: number;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
}

/** force-graph 가 첫 렌더에서 문자열을 노드 객체로 바꿔 넣으므로 둘 다 받는다 */
export interface LayoutLink {
  source: string | { id: string };
  target: string | { id: string };
}

export interface PackedLayout {
  /**
   * 그려진 노드까지 전부 담는 원의 반지름.
   *
   * 깐 자리가 아니라 **노드가 실제로 어디까지 퍼졌는지**다. 화면에 쓰는 곳은 없고,
   * 배치가 원 안에 다 들어가는지를 테스트가 이 값으로 확인한다.
   */
  radius: number;
  /** 노드 id -> 배치가 정한 자리. 드래그로 옮긴 노드를 되돌릴 때 쓴다 */
  home: ReadonlyMap<string, { x: number; y: number }>;
}

export interface PackedLayoutOptions {
  /** 노드 하나가 차지하는 반지름. 간격을 균일하게 하려고 가장 큰 값 하나로 고정한다 */
  nodeRadius: number;
  /**
   * 포커스로 불러모은 center 들. 이들이 원의 한가운데를 차지한다.
   *
   * 비어 있으면(포커스가 없으면) 평소대로 가장 많이 이어진 노드가 가운데에 온다.
   */
  centerIds?: readonly string[];
}

/**
 * 이웃한 두 노드의 **표면 사이** 여백.
 *
 * 노드 반지름 15 기준으로 중심 간 거리가 82 가 된다. 힘 배치 때 쓰던 링크 거리(60)와
 * 같은 축척이라 노드 크기·글자 크기를 그대로 쓸 수 있다. 이 값을 줄이면 원이 작아지고
 * 빽빽해지며, 늘리면 성겨진다 — 어느 쪽이든 밀도는 원 전체에서 균일하다.
 */
const GAP = 52;

/**
 * 노드 반지름에서 중심 간 기준 거리를 낸다.
 *
 * 배치가 자리를 깔 때 쓰는 값이자, 드래그 물리가 링크 거리와 영역 반경을 잡는
 * 기준이다. 두 곳이 다른 값을 쓰면 끄는 동안 이웃이 원래 간격보다 붙거나 벌어진다.
 */
export function spacingFor(nodeRadius: number): number {
  return 2 * nodeRadius + GAP;
}

/** 황금각. 해바라기 씨앗이 겹치지 않고 퍼지는 각도 */
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

/**
 * 2D 해바라기 나선에서 가장 가까운 두 점의 거리 계수.
 *
 * ρᵢ = R√((i+½)/k) 로 k 개를 깔면 최근접 거리가 항상 1.546 × R/√k 다. k 를 50에서
 * 2,000까지 바꿔가며 재도 이 값이 변하지 않아서, 원하는 간격에서 반지름을 거꾸로
 * 낼 수 있다. 동심 링을 쓰지 않는 이유는 링은 띠가 눈에 보이기 때문이다.
 */
const SUNFLOWER_GAP = 1.546;

/** 자리 하나 */
export interface Point {
  x: number;
  y: number;
}

const ORIGIN: Point = { x: 0, y: 0 };

/**
 * 거리의 제곱. 아래 격자 탐색은 수십만 번 돌기 때문에, 거리를 비교만 할 자리에서는
 * 제곱근을 뽑지 않는다. Math.hypot 은 자릿수 넘침을 막느라 안에서 크기를 재조정해서
 * 같은 계산을 sqrt 로 직접 하는 것보다 몇 배 느리고, 여기 좌표는 그런 보호가 필요한
 * 범위가 아니다.
 */
function distanceSquared(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

/**
 * 격자 칸 좌표 두 개를 숫자 키 하나로 접는다.
 *
 * `${a},${b}` 같은 문자열 키는 조회할 때마다 문자열을 새로 만든다. 이 배치는 노드가
 * 수천 개면 격자를 수십만 번 뒤지므로 그 할당이 곧 비용의 대부분이 된다. 한 축에
 * ±2,048 칸까지 담을 수 있는데, 노드가 백만 개가 되어도 칸 수는 그 절반에도 못
 * 미친다(반지름이 노드 수의 제곱근으로만 자라기 때문이다).
 */
const GRID_SPAN = 4096;
const GRID_HALF = GRID_SPAN / 2;

function gridKey(a: number, b: number): number {
  return (a + GRID_HALF) * GRID_SPAN + (b + GRID_HALF);
}

/**
 * count 개를 최소 간격 spacing 으로 담으려면 반지름이 얼마여야 하는지.
 *
 * 노드가 적으면 작은 원, 많아질수록 큰 원이 되는 게 여기서 나온다. 안쪽 밀도는
 * 개수와 무관하게 늘 같다.
 */
export function radiusFor(count: number, spacing: number): number {
  if (count <= 0) return 0;
  return (spacing * Math.sqrt(count)) / SUNFLOWER_GAP;
}

/**
 * 반지름 radius 안을 간격 spacing 으로 채우는 자리들. **중심에서 바깥 순서**다.
 *
 * 해바라기 나선을 쓴다. 동심 링은 띠가 눈에 보이고, 나선은 어느 방향으로 봐도
 * 간격이 고르다.
 */
function slotsWithin(radius: number, spacing: number): Point[] {
  const points: Point[] = [];
  if (radius < 0 || spacing <= 0) return points;

  // radiusFor 의 역. 이 반지름에 몇 개가 들어가는지. radiusFor 가 준 반지름을
  // 그대로 되돌려 받을 때 부동소수점 오차로 한 개 모자라지 않게 여유를 둔다.
  const count = Math.floor(((radius * SUNFLOWER_GAP) / spacing) ** 2 + 1e-9);
  for (let i = 0; i < count; i += 1) {
    // √ 를 쓰면 점마다 차지하는 넓이가 정확히 같아진다 = 밀도가 균일하다.
    const rho = radius * Math.sqrt((i + 0.5) / count);
    const theta = i * GOLDEN_ANGLE;
    points.push({ x: rho * Math.cos(theta), y: rho * Math.sin(theta) });
  }
  return points;
}

function endpointId(endpoint: string | { id: string }): string {
  return typeof endpoint === "string" ? endpoint : endpoint.id;
}

/** 노드 id -> 방향 무관 이웃 id. adjacency.ts 와 달리 렌더 페이로드를 그대로 읽는다 */
function buildNeighbors(
  links: readonly LayoutLink[],
  ids: ReadonlySet<string>,
): Map<string, string[]> {
  const neighbors = new Map<string, string[]>();
  for (const id of ids) neighbors.set(id, []);
  for (const link of links) {
    const source = endpointId(link.source);
    const target = endpointId(link.target);
    if (!ids.has(source) || !ids.has(target) || source === target) continue;
    // 서비스의 엣지는 방향이 있어 A→B 와 B→A 가 함께 올 수 있다. 이웃을 두 번 넣으면
    // BFS 가 같은 노드를 두 번 줄 세워 자리를 두 개 쓰고, 끝에 가서 자리가 모자란다.
    if (!neighbors.get(source)!.includes(target)) {
      neighbors.get(source)!.push(target);
      neighbors.get(target)!.push(source);
    }
  }
  return neighbors;
}

/**
 * "겨냥한 곳에서 가장 가까운 빈 자리"를 꺼내 쓰는 장부.
 *
 * 자리마다 격자 칸에 넣어 두고, 겨냥한 칸에서 한 겹씩 넓혀가며 훑는다. 링 r 까지
 * 봤을 때 이미 r × 칸크기 보다 가까운 자리를 찾았다면 더 볼 필요가 없다 — 바깥
 * 링의 자리는 반드시 그보다 멀기 때문이다. 노드가 수천 개여도 매번 전체를 훑지
 * 않게 하는 게 목적이다.
 */
function makeSlotStore(slots: readonly Point[], cell: number, extent: number) {
  const used = new Uint8Array(slots.length);
  const buckets = new Map<number, number[]>();
  const cellOf = (value: number) => Math.floor(value / cell);

  slots.forEach((slot, index) => {
    const key = gridKey(cellOf(slot.x), cellOf(slot.y));
    const bucket = buckets.get(key);
    if (bucket) bucket.push(index);
    else buckets.set(key, [index]);
  });

  // 격자 전체를 덮는 링 수. 여기까지 훑으면 남은 자리가 있는 한 반드시 찾는다.
  const maxRing = Math.ceil((2 * extent) / cell) + 2;

  return function take(target: Point): number | null {
    const cx = cellOf(target.x);
    const cy = cellOf(target.y);
    let best = -1;
    let bestSquared = Infinity;

    for (let ring = 0; ring <= maxRing; ring += 1) {
      // 링 ring = 체비쇼프 거리가 정확히 ring 인 칸들. 안쪽은 이미 봤으니 건너뛴다.
      for (let dx = -ring; dx <= ring; dx += 1) {
        for (let dy = -ring; dy <= ring; dy += 1) {
          if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;

          const bucket = buckets.get(gridKey(cx + dx, cy + dy));
          if (!bucket) continue;
          for (const index of bucket) {
            if (used[index]) continue;
            const d = distanceSquared(target, slots[index]);
            if (d < bestSquared) {
              bestSquared = d;
              best = index;
            }
          }
        }
      }
      // 바깥 링의 자리는 최소 ring × cell 만큼 떨어져 있다.
      const reach = ring * cell;
      if (best >= 0 && bestSquared <= reach * reach) break;
    }

    if (best < 0) return null;
    used[best] = 1;
    return best;
  };
}

/**
 * 노드를 훑을 순서. 차수가 큰 노드에서 시작해 이웃을 따라 퍼진다(BFS).
 *
 * 이 순서가 곧 자리를 고르는 순서다. 먼저 앉은 이웃 옆에 다음 노드가 앉으므로,
 * 자리 자체는 기하로 고정돼 있어도 이어진 노드끼리는 가까이 모인다. 가장 많이
 * 이어진 노드가 첫 번째라 그 노드가 원의 중심을 차지한다.
 */
function traversalOrder(
  nodes: readonly LayoutNode[],
  neighbors: ReadonlyMap<string, string[]>,
  centerIds: readonly string[],
): LayoutNode[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const byDegree = (a: LayoutNode, b: LayoutNode) =>
    b.degree - a.degree || (a.id < b.id ? -1 : 1);

  const order: LayoutNode[] = [];
  const seen = new Set<string>();

  /** 주어진 뿌리들에서 BFS 로 퍼진다. 뿌리들이 먼저 전부 나온 뒤 이웃으로 넘어간다 */
  const spreadFrom = (roots: readonly LayoutNode[]) => {
    const queue = roots.filter((node) => !seen.has(node.id));
    for (const node of queue) seen.add(node.id);

    // shift() 는 앞을 지울 때마다 배열을 통째로 밀어서, 노드가 수천 개면 그 비용이
    // 그래프 크기의 제곱으로 는다. 머리 위치만 옮긴다.
    for (let head = 0; head < queue.length; head += 1) {
      const node = queue[head];
      order.push(node);
      const next = (neighbors.get(node.id) ?? [])
        .map((id) => byId.get(id))
        .filter((n): n is LayoutNode => !!n && !seen.has(n.id))
        .sort(byDegree);
      for (const neighbor of next) {
        seen.add(neighbor.id);
        queue.push(neighbor);
      }
    }
  };

  /*
   * 포커스로 불러모은 center 들이 맨 앞이다.
   *
   * 자리는 "겨냥한 곳에서 가장 가까운 빈 자리"를 차례로 집어가는 방식이라, 순서가
   * 곧 안쪽 우선권이다. 그래서 이어진 곳이 가장 많은 center 가 원의 한가운데를
   * 차지하고, 나머지 center 들이 그 바로 옆자리를 먼저 가져간 다음에야 이웃들이
   * 채워진다 — 무엇을 불러모았는지가 그림 한가운데에 보인다.
   */
  const centers = centerIds
    .map((id) => byId.get(id))
    .filter((node): node is LayoutNode => !!node)
    .sort(byDegree);
  if (centers.length > 0) spreadFrom(centers);

  // 나머지는 평소대로 — 가장 많이 이어진 노드에서 시작해 이웃을 따라 퍼진다.
  for (const root of [...nodes].sort(byDegree)) {
    if (seen.has(root.id)) continue;
    spreadFrom([root]);
  }
  return order;
}

/** 계산한 자리를 노드에 못박는다. fx 가 있으면 d3-force 가 그 좌표를 유지한다 */
export function pin(node: LayoutNode, point: Point) {
  node.x = point.x;
  node.y = point.y;
  node.fx = point.x;
  node.fy = point.y;
}

/**
 * 못을 뽑는다 — pin 의 반대.
 *
 * `fx` 가 사라지면 d3-force 가 그 노드를 다시 힘으로 움직인다. 지금 좌표(x/y)는
 * 그대로 두므로 노드가 있던 자리에서 이어서 움직이기 시작한다. 펼침 연출이 끝날 때
 * (reveal.ts) 모든 노드에 대해 불려, 배치가 잡은 모양을 그대로 물리에 넘긴다.
 */
export function releaseNode(node: LayoutNode) {
  node.fx = undefined;
  node.fy = undefined;
}

/**
 * 이미 자리가 잡힌 이웃들의 무게중심. 아직 아무도 없으면 원점.
 *
 * 이 지점을 겨냥해 가장 가까운 빈 자리를 집으므로, 자리 자체는 기하로 고정돼 있어도
 * 이어진 노드끼리는 가까이 모인다.
 */
function neighborCentroid(
  node: LayoutNode,
  neighbors: ReadonlyMap<string, string[]>,
  placedAt: ReadonlyMap<string, Point>,
): Point {
  let sx = 0;
  let sy = 0;
  let anchors = 0;
  for (const neighborId of neighbors.get(node.id) ?? []) {
    const point = placedAt.get(neighborId);
    if (!point) continue;
    sx += point.x;
    sy += point.y;
    anchors += 1;
  }
  return anchors ? { x: sx / anchors, y: sy / anchors } : ORIGIN;
}

export function applyPackedLayout(
  graph: { nodes: LayoutNode[]; links: readonly LayoutLink[] },
  { nodeRadius, centerIds = [] }: PackedLayoutOptions,
): PackedLayout {
  const nodes = graph.nodes;
  if (nodes.length === 0) return { radius: 0, home: new Map() };

  // 자리 크기. 노드 반지름을 하나로 고정해야 간격이 진짜로 균일해진다 —
  // 차수마다 다르게 잡으면 큰 노드 옆만 벌어진다.
  const spacing = spacingFor(nodeRadius);

  // 이 개수를 이 간격으로 담는 가장 작은 원과, 그 안을 채우는 자리들.
  const radius = radiusFor(nodes.length, spacing);
  const slots = slotsWithin(radius, spacing);

  const ids = new Set(nodes.map((node) => node.id));
  const neighbors = buildNeighbors(graph.links, ids);
  const take = makeSlotStore(slots, spacing, radius);
  const placedAt = new Map<string, Point>();

  const centers = new Set(centerIds);
  /** 가장 많이 이어진 center 가 앉은 자리. 나머지 center 들이 이 옆에 붙는다 */
  let mainCenter: Point | null = null;

  for (const node of traversalOrder(nodes, neighbors, centerIds)) {
    const target = centers.has(node.id)
      ? // center 들은 이웃이 어디 있든 상관없이 한가운데에 모인다. 첫 center 가
        // 원점을 잡고, 나머지는 그 바로 옆의 빈 자리를 차례로 가져간다 —
        // 링크를 따라가게 두면 서로 이어져 있지 않은 center 끼리 원 반대편으로
        // 갈라져서, "내가 무엇을 불러모았나"가 한눈에 안 들어온다.
        (mainCenter ?? ORIGIN)
      : neighborCentroid(node, neighbors, placedAt);

    const index = take(target);
    // radiusFor 로 잡은 반지름이라 자리는 항상 노드 수 이상 나온다.
    if (index === null) break;
    const point = slots[index];
    pin(node, point);
    placedAt.set(node.id, point);
    if (!mainCenter && centers.has(node.id)) mainCenter = point;
  }

  // 노드가 실제로 퍼진 범위. placedAt 은 노드 **중심**이라, 그려진 원까지 담으려면
  // 노드 반지름만큼 더 크다.
  let spread = 0;
  for (const point of placedAt.values()) {
    const fromOrigin = distanceSquared(point, ORIGIN);
    if (fromOrigin > spread) spread = fromOrigin;
  }

  return { radius: Math.sqrt(spread) + nodeRadius, home: placedAt };
}
