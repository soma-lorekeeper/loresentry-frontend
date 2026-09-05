/**
 * 작업공간 그래프 캔버스.
 *
 * 노드와 엣지를 JS 로 만들어 캔버스에 얹는다. 손으로 배치하지 않는 이유는
 * force 배치가 만들어내는 덩어리와 성긴 자리가 그래프 화면의 인상 자체라,
 * 몇 개를 눈대중으로 흩뿌리면 실제와 다른 그림이 되기 때문이다.
 *
 * pen.dev 스크립트 런타임에는 모듈 로더가 없다(require/import/fetch 모두
 * undefined). text2graph 가 쓰는 d3-force 를 끌어올 수 없어 Fruchterman-Reingold
 * 를 여기에 직접 짰다. 노드 수가 50 안쪽이라 O(n²) 로 충분하다.
 *
 * 난수는 고정 시드 LCG 다. 다시 열 때마다 그림이 달라지면 와이어프레임을
 * 비교할 수 없다.
 *
 * @schema 2.11
 * @input nodeCount: number = 46
 * @input showLabels: boolean = true
 * @input dimmed: boolean = false
 */

const W = pencil.width;
const H = pencil.height;
const N = Math.max(6, Math.floor(pencil.input.nodeCount));

/** 고정 시드 난수. 같은 입력이면 언제나 같은 그림이 나온다. */
let seed = 20260905;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

/*
 * 분류별 비중은 text2graph 픽스처의 실제 분포를 따랐다(사건 111 · 아이템 47 ·
 * 원고 36 · 캐릭터 31 · 장소 22 · 조직 14 · 세계관 8). 비중이 어긋나면 어느
 * 분류가 그래프를 채우는지에 대한 인상이 달라진다.
 *
 * 이름은 pen 용어를 쓴다(캐릭터 · 아이템 · 이벤트).
 */
const KINDS = [
  { key: "event", weight: 111, icon: "scroll" },
  { key: "item", weight: 47, icon: "package" },
  { key: "manuscript", weight: 36, icon: "file-text" },
  { key: "character", weight: 31, icon: "circle-user-round" },
  { key: "place", weight: 22, icon: "map-pin" },
  { key: "organization", weight: 14, icon: "building-2" },
  { key: "worldview", weight: 8, icon: "globe" },
];

/** 라벨은 몇 개만 붙인다. 전부 붙이면 글자가 겹쳐 그래프가 읽히지 않는다. */
const LABELS = [
  "김독자", "유중혁", "12화 · 균열의 밤", "은빛 항해단",
  "유리 산맥", "각성", "시나리오", "낡은 스마트폰",
];

// --- 노드 만들기 -----------------------------------------------------------

const totalWeight = KINDS.reduce((sum, k) => sum + k.weight, 0);
const nodes = [];
for (let i = 0; i < N; i++) {
  // 가중치 누적으로 분류를 고른다.
  let pick = rand() * totalWeight;
  let kind = KINDS[KINDS.length - 1];
  for (const k of KINDS) {
    pick -= k.weight;
    if (pick <= 0) {
      kind = k;
      break;
    }
  }
  nodes.push({
    kind,
    x: rand() * W,
    y: rand() * H,
    dx: 0,
    dy: 0,
    degree: 0,
  });
}

// --- 엣지 만들기 -----------------------------------------------------------

/*
 * 먼저 앞선 노드에 하나씩 이어 전체를 한 덩어리로 만든 뒤, 여분을 더한다.
 * 이렇게 하지 않으면 배치 중에 조각들이 서로 밀어내 화면 밖으로 흩어진다.
 */
const edges = [];
const addEdge = (a, b) => {
  if (a === b) return;
  const [lo, hi] = a < b ? [a, b] : [b, a];
  if (edges.some((e) => e.a === lo && e.b === hi)) return;
  edges.push({ a: lo, b: hi });
  nodes[lo].degree++;
  nodes[hi].degree++;
};

for (let i = 1; i < N; i++) {
  // 가까운 번호끼리 잇는 편향을 준다. 같은 분류가 뭉쳐 보이는 효과가 난다.
  const back = 1 + Math.floor(rand() * Math.min(i, 6));
  addEdge(i, i - back);
}
const extra = Math.floor(N * 0.7);
for (let i = 0; i < extra; i++) {
  addEdge(Math.floor(rand() * N), Math.floor(rand() * N));
}

// --- Fruchterman-Reingold 배치 ---------------------------------------------

const area = W * H;
const k = Math.sqrt(area / N);
let temperature = W / 8;
const ITERATIONS = 320;

for (let step = 0; step < ITERATIONS; step++) {
  // 서로 밀어낸다.
  for (let i = 0; i < N; i++) {
    nodes[i].dx = 0;
    nodes[i].dy = 0;
  }
  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      let ddx = nodes[i].x - nodes[j].x;
      let ddy = nodes[i].y - nodes[j].y;
      let dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
      const force = (k * k) / dist;
      const ux = (ddx / dist) * force;
      const uy = (ddy / dist) * force;
      nodes[i].dx += ux;
      nodes[i].dy += uy;
      nodes[j].dx -= ux;
      nodes[j].dy -= uy;
    }
  }
  // 이어진 것끼리 당긴다.
  for (const e of edges) {
    const a = nodes[e.a];
    const b = nodes[e.b];
    const ddx = a.x - b.x;
    const ddy = a.y - b.y;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
    const force = (dist * dist) / k;
    const ux = (ddx / dist) * force;
    const uy = (ddy / dist) * force;
    a.dx -= ux;
    a.dy -= uy;
    b.dx += ux;
    b.dy += uy;
  }
  // 온도만큼만 움직이고 서서히 식힌다.
  for (const n of nodes) {
    const d = Math.sqrt(n.dx * n.dx + n.dy * n.dy) || 0.01;
    const move = Math.min(d, temperature);
    n.x += (n.dx / d) * move;
    n.y += (n.dy / d) * move;
  }
  temperature *= 0.975;
}

// --- 화면에 맞추기 ---------------------------------------------------------

/*
 * 배치가 끝난 좌표는 원점 기준이 제각각이라 캔버스 안으로 다시 맞춘다.
 * 여백을 두는 것은 좌하단 범례와 우상단 도구 패널이 노드를 가리기 때문이다.
 */
const MARGIN = 76;
let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
for (const n of nodes) {
  if (n.x < minX) minX = n.x;
  if (n.x > maxX) maxX = n.x;
  if (n.y < minY) minY = n.y;
  if (n.y > maxY) maxY = n.y;
}
const scale = Math.min(
  (W - MARGIN * 2) / Math.max(maxX - minX, 1),
  (H - MARGIN * 2) / Math.max(maxY - minY, 1),
);
const offsetX = (W - (maxX - minX) * scale) / 2 - minX * scale;
const offsetY = (H - (maxY - minY) * scale) / 2 - minY * scale;
for (const n of nodes) {
  n.x = n.x * scale + offsetX;
  n.y = n.y * scale + offsetY;
}

// --- 노드로 그리기 ---------------------------------------------------------

const out = [];
const r1 = (v) => Math.round(v * 10) / 10;

/*
 * 엣지는 전부 한 path 에 몰아넣는다. 선 하나에 노드 하나씩 만들면 수백 개가
 * 생겨 레이어 목록을 덮어버린다. 어차피 굵기와 색이 같아 나눌 이유가 없다.
 */
const segments = edges
  .map((e) => {
    const a = nodes[e.a];
    const b = nodes[e.b];
    return "M " + r1(a.x) + " " + r1(a.y) + " L " + r1(b.x) + " " + r1(b.y);
  })
  .join(" ");

out.push({
  type: "path",
  name: "Graph Edges",
  x: 0,
  y: 0,
  width: W,
  height: H,
  viewBox: [0, 0, W, H],
  geometry: segments,
  stroke: "$color-border-default",
  strokeWidth: 1,
  strokeLinecap: "round",
  opacity: pencil.input.dimmed ? 0.35 : 1,
});

/*
 * 노드 크기는 이어진 수를 따라간다. 전부 같은 크기면 어디가 중심인지 알 수
 * 없고, 실제 force 그래프도 허브가 커 보인다.
 */
let maxDegree = 1;
for (const n of nodes) if (n.degree > maxDegree) maxDegree = n.degree;

/*
 * 즐겨찾기 별을 달 노드. 무채색 캔버스에서 유일한 유채색이라 눈이 먼저 가는
 * 자리이므로, 이어진 수가 많은 쪽에 붙여야 자연스럽다.
 */
const favoriteIndex = nodes.reduce(
  (best, n, i) => (n.degree > nodes[best].degree ? i : best),
  0,
);

nodes.forEach((n, i) => {
  const ratio = (n.degree - 1) / Math.max(maxDegree - 1, 1);
  const radius = r1(11 + Math.sqrt(Math.max(ratio, 0)) * 9);
  const size = radius * 2;

  out.push({
    type: "ellipse",
    name: "Graph Node " + (i + 1) + " · " + n.kind.key,
    x: r1(n.x - radius),
    y: r1(n.y - radius),
    width: size,
    height: size,
    fill: "$color-node-" + n.kind.key,
    opacity: pencil.input.dimmed ? 0.4 : 1,
  });

  // 분류는 색으로 가르지 않는다. 노드 안 아이콘이 그 일을 맡는다.
  const iconSize = r1(Math.min(size * 0.52, 16));
  out.push({
    type: "icon",
    name: "Graph Node Icon " + (i + 1),
    x: r1(n.x - iconSize / 2),
    y: r1(n.y - iconSize / 2),
    width: iconSize,
    height: iconSize,
    icon: n.kind.icon,
    library: "lucide",
    weight: "$icon-weight-default",
    fill: "$color-bg-canvas",
    opacity: pencil.input.dimmed ? 0.4 : 1,
  });

  if (i === favoriteIndex) {
    out.push({
      type: "icon",
      name: "Graph Node Favorite Badge",
      x: r1(n.x + radius - 6),
      y: r1(n.y - radius - 6),
      width: 15,
      height: 15,
      icon: "star",
      library: "lucide",
      weight: "$icon-weight-default",
      fill: "$color-favorite",
    });
  }
});

// --- 라벨 -----------------------------------------------------------------

/*
 * 이어진 수가 많은 노드에만 이름을 붙인다. 전부 붙이면 겹쳐서 아무것도 읽히지
 * 않고, 실제 화면도 확대 비율에 따라 골라 보여준다.
 */
if (pencil.input.showLabels) {
  const ranked = nodes
    .map((n, i) => ({ n, i }))
    .sort((a, b) => b.n.degree - a.n.degree)
    .slice(0, LABELS.length);

  ranked.forEach((entry, order) => {
    const ratio = (entry.n.degree - 1) / Math.max(maxDegree - 1, 1);
    const radius = 11 + Math.sqrt(Math.max(ratio, 0)) * 9;
    out.push({
      type: "text",
      name: "Graph Node Label · " + LABELS[order],
      x: r1(entry.n.x + radius + 6),
      y: r1(entry.n.y - 8),
      content: LABELS[order],
      fontFamily: "$font-family-ui",
      fontSize: "$font-size-label",
      fill: "$color-text-primary",
      opacity: pencil.input.dimmed ? 0.4 : 1,
    });
  });
}

return out;
