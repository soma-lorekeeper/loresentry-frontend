/**
 * 사건 시간 흐름 표.
 *
 * 행이 문서 하나, 열이 회차 하나다. 어느 인물이 어느 구간에 나오는지를 막대의
 * 위치로 읽는 화면이라, 행과 열이 수십 개씩 필요하다. 손으로 놓으면 수백 개
 * 노드를 일일이 만들어야 해서 JS 로 만든다.
 *
 * text2graph 의 timeline-table 을 옮긴 것이다. 회차를 세로축으로 두었던 예전
 * 어항 설계는 그쪽에서 폐기됐으므로 그리지 않는다.
 *
 * 색은 무채색 명도 7단계를 쓴다. 변수 이름 앞 접두사는 varPrefix 로 받는다 —
 * 스크립트가 만든 노드는 인스턴스가 놓인 문서의 네임스페이스로 변수를 풀기
 * 때문에, lorekeeper.pen 화면에서는 "b:" 가 필요하다.
 *
 * @schema 2.11
 * @input columnCount: number = 18
 * @input focusColumn: number = 4
 * @input varPrefix: string = ""
 */

const v = (name) => "$" + pencil.input.varPrefix + name;

const W = pencil.width;
const H = pencil.height;

/** 왼쪽 이름 열. text2graph 의 LABEL_WIDTH 와 같다. */
const LABEL_W = 190;
/** 줄 높이와 폴더 줄 높이. 둘을 다르게 둔 것도 원본을 따른 것이다. */
const LANE_H = 22;
const FOLDER_H = 30;
/** 머리글 — 에피소드 띠와 회차 이름 줄. */
const EPISODE_H = 22;
const COLUMN_H = 30;

const COLS = Math.max(4, Math.floor(pencil.input.columnCount));
const trackW = W - LABEL_W;

/*
 * 회차 열 폭. text2graph 와 같이 남는 자리를 회차 수로 나눠 **가로를 꽉 채우되**,
 * 44〜260 으로 묶는다.
 *
 * 아래는 44 — 이보다 좁으면 회차 이름이 들어가지 않는다. 위는 260 — 에피소드
 * 하나만 골라 회차가 넷일 때 남는 폭을 그냥 나누면 열 하나가 500px 가까이 되어,
 * 막대가 화면을 가로지르는 띠로만 보이고 회차의 경계가 읽히지 않는다.
 *
 * 아래에 걸리면 표가 캔버스보다 넓어진다. 실제 화면에서 가로 스크롤이 생기는
 * 자리이고, 와이어프레임에서는 오른쪽이 잘려 나가는 것으로 그 사실이 보인다.
 */
const COLUMN_MIN = 44;
const COLUMN_MAX = 260;
const colW = Math.min(Math.max(trackW / COLS, COLUMN_MIN), COLUMN_MAX);

let seed = 20260905;
const rand = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

/*
 * 폴더 구성. 즐겨찾기가 먼저 오고 그다음 분류 순이다. 원고는 폴더가 되지
 * 않는다 — 회차가 이미 열이라 행으로 또 세울 것이 없다.
 *
 * 이름은 pen 용어를 쓴다(캐릭터 · 아이템 · 이벤트).
 */
const GROUPS = [
  {
    label: "즐겨찾기",
    kind: null,
    rows: ["김독자", "유중혁", "12화 · 균열의 밤"],
  },
  {
    label: "캐릭터",
    kind: "character",
    icon: "circle-user-round",
    rows: ["김독자", "유중혁", "유상아", "정희원", "이지혜"],
  },
  {
    label: "장소",
    kind: "place",
    icon: "map-pin",
    rows: ["유리 산맥", "3807호차", "충무로역"],
  },
  {
    label: "조직",
    kind: "organization",
    icon: "building-2",
    rows: ["은빛 항해단", "어둠 파수꾼"],
  },
  {
    label: "아이템",
    kind: "item",
    icon: "package",
    rows: ["낡은 스마트폰", "멸살법", "곤충 채집망"],
  },
  {
    label: "이벤트",
    kind: "event",
    icon: "scroll",
    rows: ["각성", "도깨비 학살", "계약", "유료화"],
  },
  {
    label: "세계관",
    kind: "worldview",
    icon: "globe",
    rows: ["시나리오", "성좌"],
  },
];

/*
 * 즐겨찾기 폴더 안 항목은 원래 분류를 그대로 단다. 폴더가 분류를 가로지르는
 * 표시라 거기서 색과 아이콘을 바꾸면 무엇인지 알 수 없어진다.
 */
const FAVORITE_KIND = {
  "김독자": { kind: "character", icon: "circle-user-round" },
  "유중혁": { kind: "character", icon: "circle-user-round" },
  "12화 · 균열의 밤": { kind: "manuscript", icon: "file-text" },
};

const out = [];
const r1 = (num) => Math.round(num * 10) / 10;

// --- 배경 점 격자 ----------------------------------------------------------

/*
 * text2graph 의 `.scroller` 와 같은 바탕이다 — 간격 16, 반지름 0.9 의 점.
 * 그래프 화면은 캔버스에 찍고 여기는 CSS 로 깔지만, 두 화면이 같은 바탕 위에
 * 있는 것처럼 보여야 하므로 같은 값을 쓴다.
 *
 * 점은 선 격자보다 훨씬 진하다. 선은 화면을 가로질러 이어지므로 옅어도 눈에
 * 남지만, 점은 한 칸에 하나뿐이라 같은 세기로 찍으면 아예 보이지 않는다.
 *
 * 점 하나에 노드를 만들면 수천 개가 되어 레이어 목록을 덮으므로 path 하나에
 * 몰아넣는다. 길이 0 인 선분에 둥근 끝을 주면 지름 `strokeWidth` 인 점이 된다.
 *
 * **맨 먼저 넣는다.** out 의 차례가 곧 쌓임 차례라, 뒤에 오는 머리글·막대가
 * 이 위에 그려져야 한다.
 */
const DOT_STEP = 16;
const DOT_RADIUS = 0.9;
const dots = [];
for (let dy = DOT_STEP / 2; dy < H; dy += DOT_STEP) {
  for (let dx = DOT_STEP / 2; dx < W; dx += DOT_STEP) {
    dots.push("M " + dx + " " + dy + " h 0.01");
  }
}
out.push({
  type: "path",
  name: "Timeline Dot Grid",
  x: 0,
  y: 0,
  width: W,
  height: H,
  viewBox: [0, 0, W, H],
  geometry: dots.join(" "),
  stroke: v("color-border-default"),
  strokeWidth: DOT_RADIUS * 2,
  strokeLinecap: "round",
});

// --- 머리글 ---------------------------------------------------------------

/*
 * 에피소드 띠. 회차를 몇 개씩 묶어 점선 상자로 두른다. 색이 아니라 선 종류로
 * 층을 가르는 것은 아래 회차 경계선과 겹쳐 그려지기 때문이다.
 */
const episodes = [
  { name: "Episode 5. 어둠 파수꾼", from: 0, to: 3 },
  { name: "Episode 6. 심판의 시간", from: 4, to: 8 },
  { name: "Episode 7. 건물주", from: 9, to: 13 },
  { name: "Episode 8. 새 원고", from: 14, to: COLS - 1 },
];

for (const ep of episodes) {
  const x = LABEL_W + ep.from * colW;
  const w = (ep.to - ep.from + 1) * colW;
  out.push({
    type: "frame",
    name: "Timeline Episode " + ep.name,
    x: r1(x + 3),
    y: 3,
    width: r1(w - 6),
    height: EPISODE_H - 6,
    cornerRadius: 7,
    stroke: v("color-border-default"),
    strokeWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    clip: true,
    children: [
      {
        type: "text",
        name: "Timeline Episode Label",
        content: ep.name,
        fontFamily: v("font-family-ui"),
        fontSize: v("font-size-label"),
        fill: v("color-text-secondary"),
      },
    ],
  });
}

// 회차 이름 줄.
for (let i = 0; i < COLS; i++) {
  const x = LABEL_W + i * colW;
  out.push({
    type: "frame",
    name: "Timeline Column " + (i + 1),
    x: r1(x),
    y: EPISODE_H,
    width: r1(colW),
    height: COLUMN_H,
    layout: "vertical",
    gap: 2,
    justifyContent: "center",
    alignItems: "center",
    children: [
      {
        type: "icon",
        name: "Timeline Column Icon",
        width: 13,
        height: 13,
        icon: "file-text",
        library: "lucide",
        weight: v("icon-weight-default"),
        fill: v("color-icon-default"),
      },
      {
        type: "text",
        name: "Timeline Column Label",
        content: i + 5 + "화",
        fontFamily: v("font-family-ui"),
        fontSize: v("font-size-label"),
        fill: v("color-text-secondary"),
      },
    ],
  });
}

const HEAD_H = EPISODE_H + COLUMN_H;

// 머리글 아래 경계선.
out.push({
  type: "rectangle",
  name: "Timeline Head Rule",
  x: 0,
  y: HEAD_H,
  width: W,
  height: 1,
  fill: v("color-border-default"),
});

// --- 선택 회차 음영 --------------------------------------------------------

/*
 * 지금 보고 있는 회차를 세로 띠로 알린다. 툴바의 회차 이동과 짝을 이루는
 * 표시라, 이것이 없으면 ‹ › 를 눌러도 무엇이 달라졌는지 알 수 없다.
 */
const focus = Math.min(Math.max(pencil.input.focusColumn, 0), COLS - 1);
out.push({
  type: "rectangle",
  name: "Timeline Focus Band",
  x: r1(LABEL_W + focus * colW),
  y: HEAD_H + 1,
  width: r1(colW),
  height: H - HEAD_H - 1,
  fill: v("color-state-selected"),
});

// --- 에피소드 경계 세로 점선 -----------------------------------------------

for (const ep of episodes) {
  if (ep.from === 0) continue;
  out.push({
    type: "rectangle",
    name: "Timeline Episode Divider",
    x: r1(LABEL_W + ep.from * colW),
    y: HEAD_H + 1,
    width: 1,
    height: H - HEAD_H - 1,
    fill: v("color-border-default"),
    opacity: 0.6,
  });
}

// --- 본문 행 ---------------------------------------------------------------

let y = HEAD_H + 1;

for (const group of GROUPS) {
  if (y + FOLDER_H > H) break;

  // 폴더 줄.
  const folderChildren = [
    {
      type: "icon",
      name: "Timeline Folder Icon",
      width: 15,
      height: 15,
      icon: "folder-open",
      library: "lucide",
      weight: v("icon-weight-default"),
      fill: v("color-icon-default"),
    },
    {
      type: "text",
      name: "Timeline Folder Label",
      content: group.label,
      fontFamily: v("font-family-ui"),
      fontSize: v("font-size-label"),
      fontWeight: "600",
      fill: v("color-text-secondary"),
    },
  ];
  out.push({
    type: "frame",
    name: "Timeline Folder " + group.label,
    x: 0,
    y: r1(y),
    width: LABEL_W,
    height: FOLDER_H,
    gap: 6,
    padding: [0, 10],
    alignItems: "center",
    children: folderChildren,
  });
  y += FOLDER_H;

  for (const rowName of group.rows) {
    if (y + LANE_H > H) break;

    const meta = group.kind
      ? { kind: group.kind, icon: group.icon }
      : FAVORITE_KIND[rowName];

    // 이름 칸.
    out.push({
      type: "frame",
      name: "Timeline Row " + rowName,
      x: 0,
      y: r1(y),
      width: LABEL_W,
      height: LANE_H,
      gap: 6,
      padding: [0, 10, 0, 24],
      alignItems: "center",
      clip: true,
      children: [
        {
          type: "icon",
          name: "Timeline Row Icon",
          width: 13,
          height: 13,
          icon: meta.icon,
          library: "lucide",
          weight: v("icon-weight-default"),
          fill: v("color-icon-default"),
        },
        {
          type: "text",
          name: "Timeline Row Label",
          content: rowName,
          fontFamily: v("font-family-ui"),
          fontSize: v("font-size-label"),
          fill: v("color-text-primary"),
        },
      ],
    });

    /*
     * 등장 구간을 만든다. 연속으로 나오는 묶음(run)을 몇 개 흩어 놓고, 처음과
     * 마지막을 잇는 옅은 선을 그 아래 깐다. 옅은 선이 없으면 떨어진 막대들이
     * 서로 다른 인물의 것처럼 읽힌다.
     */
    const runs = [];
    let cursor = Math.floor(rand() * 4);
    while (cursor < COLS) {
      const len = 1 + Math.floor(rand() * 3);
      const end = Math.min(cursor + len - 1, COLS - 1);
      runs.push([cursor, end]);
      cursor = end + 2 + Math.floor(rand() * 4);
    }
    if (runs.length === 0) runs.push([0, 0]);

    let appearances = 0;
    for (const [a, b] of runs) appearances += b - a + 1;

    // 막대 두께는 등장 횟수를 따라간다. 자주 나오는 인물이 굵게 읽혀야 한다.
    const ratio = Math.min(appearances / COLS, 1);
    const barH = r1(3 + Math.sqrt(ratio) * 8);
    const barY = r1(y + (LANE_H - barH) / 2);

    const first = runs[0][0];
    const last = runs[runs.length - 1][1];
    out.push({
      type: "rectangle",
      name: "Timeline Span " + rowName,
      x: r1(LABEL_W + first * colW + colW * 0.5),
      y: barY,
      width: r1((last - first) * colW),
      height: barH,
      cornerRadius: 999,
      fill: v("color-node-" + meta.kind),
      opacity: 0.16,
    });

    for (const [a, b] of runs) {
      out.push({
        type: "rectangle",
        name: "Timeline Bar " + rowName,
        x: r1(LABEL_W + a * colW + colW * 0.2),
        y: barY,
        width: r1((b - a) * colW + colW * 0.6),
        height: barH,
        cornerRadius: 999,
        fill: v("color-node-" + meta.kind),
      });
    }

    y += LANE_H;
  }
}

// --- 이름 열 경계선 --------------------------------------------------------

/*
 * 마지막에 그린다. 막대가 이름 칸으로 흘러 들어오는 일이 없도록 그 위에
 * 얹어야 경계가 끊기지 않는다.
 */
out.push({
  type: "rectangle",
  name: "Timeline Label Rule",
  x: LABEL_W,
  y: 0,
  width: 1,
  height: H,
  fill: v("color-border-default"),
});

return out;
