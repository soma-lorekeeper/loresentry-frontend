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
 * @input selectedLabel: string = ""
 * @input varPrefix: string = ""
 */

/*
 * 변수 이름 앞에 붙는 임포트 별칭.
 *
 * 이 스크립트가 만든 노드는 **인스턴스가 놓인 문서의 네임스페이스**로 변수를
 * 해석한다. lib.pen 안에서는 `$color-node-character` 지만, 그 컴포넌트를
 * lorekeeper.pen 에 인스턴스로 놓으면 같은 변수가 `$b:color-node-character` 다.
 * 접두사를 붙이지 않으면 화면에서 색이 통째로 풀려 노드가 검게 나온다.
 */
const v = (name) => "$" + pencil.input.varPrefix + name;

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

/*
 * 라벨은 몇 개만 붙인다. 전부 붙이면 글자가 겹쳐 그래프가 읽히지 않는다.
 *
 * 이름마다 분류를 함께 적는 것은, 이름을 차수 순서로만 나눠 주면 `레나 아르벨`
 * 같은 인물 이름이 두루마리(이벤트) 아이콘 위에 얹히기 때문이다. 노드 패널이
 * 그 이름을 캐릭터로 보여주고 있어서, 같은 화면 안에서 분류가 어긋난다.
 */
const LABELS = [
  { name: "김독자", kind: "character" },
  { name: "레나 아르벨", kind: "character" },
  { name: "12화 · 균열의 밤", kind: "manuscript" },
  { name: "은빛 항해단", kind: "organization" },
  { name: "유리 산맥", kind: "place" },
  { name: "각성", kind: "event" },
  { name: "시나리오", kind: "worldview" },
  { name: "낡은 스마트폰", kind: "item" },
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
const r1 = (num) => Math.round(num * 10) / 10;

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

/*
 * 배경 격자. text2graph 의 canvas-grid.ts 와 같은 규칙이다 — 20 단위로 긋고
 * 5칸마다 한 단계 진하게 한다. 배경이 완전히 비어 있으면 줌과 이동이 얼마나
 * 일어났는지 알 수 없어서, 눈금 역할을 하는 옅은 격자를 깔아 둔다.
 *
 * 얇은 선과 굵은 선을 각각 하나의 path 로 몰아 그린다. 선마다 노드를 만들면
 * 백 개가 넘게 생겨 레이어 목록을 덮는다 — 엣지를 하나로 묶는 것과 같은 이유다.
 */
const GRID_STEP = 20;
const GRID_STRONG_EVERY = 5;
const gridThin = [];
const gridStrong = [];
for (let gx = 0; gx <= W; gx += GRID_STEP) {
  const line = "M " + gx + " 0 L " + gx + " " + H;
  const strong = Math.round(gx / GRID_STEP) % GRID_STRONG_EVERY === 0;
  (strong ? gridStrong : gridThin).push(line);
}
for (let gy = 0; gy <= H; gy += GRID_STEP) {
  const line = "M 0 " + gy + " L " + W + " " + gy;
  const strong = Math.round(gy / GRID_STEP) % GRID_STRONG_EVERY === 0;
  (strong ? gridStrong : gridThin).push(line);
}

for (const grid of [
  { name: "Graph Grid", lines: gridThin, opacity: 0.35 },
  { name: "Graph Grid Strong", lines: gridStrong, opacity: 0.7 },
]) {
  out.push({
    type: "path",
    name: grid.name,
    x: 0,
    y: 0,
    width: W,
    height: H,
    viewBox: [0, 0, W, H],
    geometry: grid.lines.join(" "),
    stroke: v("color-border-default"),
    strokeWidth: 1,
    opacity: grid.opacity,
  });
}

/*
 * 엣지 굵기 0.6 은 text2graph 값이다. 선이 원 전체를 가로지르는 화면이라
 * 1px 로 그리면 겹쳐 쌓인 선에 노드가 파묻힌다.
 */
out.push({
  type: "path",
  name: "Graph Edges",
  x: 0,
  y: 0,
  width: W,
  height: H,
  viewBox: [0, 0, W, H],
  geometry: segments,
  stroke: v("color-border-default"),
  strokeWidth: 0.6,
  strokeLinecap: "round",
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

/*
 * 반지름은 text2graph 의 비율을 따른다 — 가장 큰 노드가 가장 작은 노드의 **3배**다
 * (원본 `min(√(1+차수×0.22)×4, 15)` 가 상한에 걸렸을 때의 비율). 전부 같은 크기면
 * 어디가 중심인지 알 수 없고, 3배를 넘기면 허브 몇 개가 화면을 덮어 그 아래 노드가
 * 가린다. 5〜15 로 잡아 원본의 상한 15 와 그 비율을 함께 맞춘다.
 */
const nodeRadius = (degree) => {
  const ratio = (degree - 1) / Math.max(maxDegree - 1, 1);
  return r1(5 + Math.sqrt(Math.max(ratio, 0)) * 10);
};

/*
 * 이보다 작은 노드에는 분류 아이콘을 그리지 않는다(원본 ICON_MIN_SCREEN_RADIUS).
 * 24×24 짜리 선 아이콘이 점 두어 개로 뭉개져서, 그리는 값보다 어수선한 값이 커진다.
 */
const ICON_MIN_RADIUS = 9;

nodes.forEach((n, i) => {
  const radius = nodeRadius(n.degree);
  const size = radius * 2;

  out.push({
    type: "ellipse",
    name: "Graph Node " + (i + 1) + " · " + n.kind.key,
    x: r1(n.x - radius),
    y: r1(n.y - radius),
    width: size,
    height: size,
    fill: v("color-node-" + n.kind.key),
  });

  /*
   * 분류를 실제로 알리는 것은 노드 안 아이콘이다. 다크에서는 노드가 무채색 7단계라
   * 아이콘이 유일한 단서이고, 라이트에서는 노드에 분류 색상이 얹히지만 그때도
   * 아이콘을 지우지 않는다 — 반지름 9 미만 노드에는 아이콘이 없어서, 색만 남으면
   * 작은 노드가 분류를 색으로만 말하게 된다.
   *
   * 크기는 원본과 같은 `반지름 × 1.2` 다.
   */
  if (radius >= ICON_MIN_RADIUS) {
    const iconSize = r1(radius * 1.2);
    out.push({
      type: "icon",
      name: "Graph Node Icon " + (i + 1),
      x: r1(n.x - iconSize / 2),
      y: r1(n.y - iconSize / 2),
      width: iconSize,
      height: iconSize,
      icon: n.kind.icon,
      library: "lucide",
      weight: v("icon-weight-default"),
      fill: v("color-bg-canvas"),
    });
  }

  /*
   * 즐겨찾기 별. 원본은 노드 중심에서 오른쪽 위로 `반지름 × 0.72` 만큼 옮긴 자리에
   * `반지름 × 0.95` 크기로 찍는다 — 원에 걸치되 원을 덮지는 않는 자리다.
   * pen 의 아이콘은 좌상단 기준이라 절반을 빼서 그 점에 중심을 맞춘다.
   */
  if (i === favoriteIndex) {
    const starSize = r1(radius * 0.95);
    out.push({
      type: "icon",
      name: "Graph Node Favorite Badge",
      x: r1(n.x + radius * 0.72 - starSize / 2),
      y: r1(n.y - radius * 0.72 - starSize / 2),
      width: starSize,
      height: starSize,
      icon: "star",
      library: "lucide",
      weight: v("icon-weight-default"),
      fill: v("color-favorite"),
    });
  }
});

// --- 선택 표시와 라벨 -------------------------------------------------------

/*
 * 이어진 수가 많은 노드에만 이름을 붙인다. 전부 붙이면 겹쳐서 아무것도 읽히지
 * 않고, 실제 화면도 확대 비율에 따라 골라 보여준다.
 */
const byDegree = nodes
  .map((n, i) => ({ n, i }))
  .sort((a, b) => b.n.degree - a.n.degree);

/*
 * 이름마다 같은 분류의 노드 중 가장 많이 이어진 것을 고른다. 한 번 쓴 노드는 다시
 * 쓰지 않는다. 노드 수가 적을 때 그 분류가 아예 없을 수 있어서, 없으면 그 이름은
 * 조용히 건너뛴다 — 억지로 다른 분류에 얹으면 아이콘과 이름이 어긋난다.
 */
const taken = [];
const ranked = [];
for (const label of LABELS) {
  const entry = byDegree.find(
    (e) => e.n.kind.key === label.kind && taken.indexOf(e.i) === -1,
  );
  if (!entry) continue;
  taken.push(entry.i);
  ranked.push({ n: entry.n, i: entry.i, label: label.name });
}

/*
 * 선택한 노드는 번호가 아니라 이름으로 지목한다. 배치는 시드에 딸려 있어 노드 수를
 * 바꾸면 번호가 통째로 밀리는데, 이름은 화면에 실제로 적히는 값이라 어긋나면 바로
 * 눈에 띈다.
 */
const selectedOrder = ranked.findIndex(
  (entry) => entry.label === pencil.input.selectedLabel,
);

/*
 * 선택 링.
 *
 * 링은 **선택한 노드와 같은 분류 색**으로 긋는다. 링이 제3의 색이면 "무엇이 선택됐나"
 * 와 "그게 무슨 분류인가"를 서로 다른 두 색이 말하게 되는데, 같은 색으로 두면 링이
 * 노드를 가리키는 손가락처럼 읽힌다.
 *
 * 같은 색이면 원과 링이 붙어 한 덩어리로 보일 텐데, 그래서 **배경색 띠를 둘 사이에
 * 한 겹 끼운다.** 이 띠가 원의 테두리를 끊어 주므로 링은 같은 색이어도 따로 떨어져
 * 보인다. 다크에서 특히 중요하다 — 노드 색이 무채색 일곱 단계라 밝기 축을 이미 다
 * 써서, 띠가 없으면 분류를 가리지 않고 링만 지워진다.
 *
 * 선택을 크기로 알리지는 않는다. 반지름은 이미 이어진 수를 말하고 있어서, 선택이
 * 원을 키우면 "큰 노드 = 많이 이어진 노드"라는 읽기가 무너진다.
 */
if (selectedOrder !== -1) {
  const target = ranked[selectedOrder];
  const targetRadius = nodeRadius(target.n.degree);
  for (const ring of [
    { name: "Graph Node Selected Gap", grow: 1, stroke: v("color-bg-canvas") },
    {
      name: "Graph Node Selected Ring",
      grow: 3,
      stroke: v("color-node-" + target.n.kind.key),
    },
  ]) {
    const outer = targetRadius + ring.grow;
    out.push({
      type: "ellipse",
      name: ring.name,
      x: r1(target.n.x - outer),
      y: r1(target.n.y - outer),
      width: r1(outer * 2),
      height: r1(outer * 2),
      fill: "#00000000",
      stroke: ring.stroke,
      strokeWidth: 2,
    });
  }
}

if (pencil.input.showLabels) {
  /*
   * 이름은 원 **아래 가운데**에 붙인다(원본과 같다). 오른쪽에 붙이면 이웃 노드
   * 위로 글자가 올라타고, 어느 원의 이름인지도 흐려진다.
   *
   * 글자 폭을 잴 수 없으므로 고정 폭 상자를 노드 중심에 맞추고 가운데 정렬한다.
   * 상자는 투명해서 넓어도 다른 것을 가리지 않는다.
   */
  const LABEL_BOX = 140;
  ranked.forEach((entry) => {
    const radius = nodeRadius(entry.n.degree);
    out.push({
      type: "text",
      name: "Graph Node Label · " + entry.label,
      x: r1(entry.n.x - LABEL_BOX / 2),
      y: r1(entry.n.y + radius + 4.5),
      width: LABEL_BOX,
      textGrowth: "fixed-width",
      textAlign: "center",
      content: entry.label,
      fontFamily: v("font-family-ui"),
      fontSize: v("font-size-label"),
      fill: v("color-text-primary"),
    });
  });
}

return out;
