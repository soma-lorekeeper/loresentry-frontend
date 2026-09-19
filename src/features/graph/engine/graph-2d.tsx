"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import ForceGraph2D, { type ForceGraphMethods } from "react-force-graph-2d";

import { applyPackedLayout, spacingFor } from "./packed-layout";
import {
  JELLYFISH_ALPHA_DECAY,
  JELLYFISH_VELOCITY_DECAY,
  installPhysics,
} from "./physics";
import { startReveal } from "./reveal";
import { drawFavoriteStar, drawKindIcon } from "./kind-icon";
import { drawCanvasGrid } from "./canvas-grid";
import { createLabelPacker } from "./label-layout";
import type { Highlight } from "./highlight";
import type { Palette } from "./palette";
import type { RenderGraph, RenderLink, RenderNode } from "./render-graph";
import { useElementSize } from "./use-element-size";

/**
 * 라벨을 붙일 최소 노드 크기(화면 픽셀 기준 반지름).
 *
 * 배율로 자르지 않고 **화면에 보이는 노드 크기**로 자른다. 그래야 줌아웃하면 허브만
 * 이름이 남고 잔챙이는 저절로 빠지며, 줌인하면 점점 더 많은 이름이 드러난다 — 지도가
 * 축척에 따라 지명을 늘려 보여주는 것과 같은 방식이다.
 *
 * 배율 하나로 자르던 예전 방식(1.6배 이상에서만 표시)은 첫 화면이 항상 그보다
 * 작아서 이름이 하나도 안 보이는 문제가 있었다.
 */
const LABEL_MIN_SCREEN_RADIUS = 3.5;
/**
 * 라벨은 노드 수로 막지 않는다. 대신 세 가지로 비용과 밀도를 잡는다.
 *
 *  - 화면에서 너무 작은 노드는 건너뛴다(LABEL_MIN_SCREEN_RADIUS)
 *  - 화면 밖 노드의 라벨은 건너뛴다. force-graph 는 시야 밖 노드도 매 프레임 그리므로
 *    이 컷이 없으면 줌인했을 때 보이지도 않는 글자를 수천 개 그리게 된다
 *  - 남은 것 중 이미 그린 라벨과 겹치는 것은 그리지 않는다(labelPacker)
 */
/**
 * 이 개수를 넘으면 halo 를 끈다.
 * shadowBlur 는 노드마다 매 프레임 블러를 새로 굽는 셈이라 비용이 커서,
 * 규모 측정 구간에서는 렌더러가 아니라 이 장식을 재게 된다.
 */
const RICH_NODE_LIMIT = 600;
// 실험 레포는 4 였다. 서비스 시드는 노드가 수십 개라 화면 맞춤 배율이 1 근처에 머물고,
// 그 크기에서는 분류 아이콘이 그려지는 컷(ICON_MIN_SCREEN_RADIUS)에 닿지 않는다.
// 와이어프레임 145 처럼 노드 안의 아이콘이 보이도록 기본 크기를 키운다.
const NODE_REL_SIZE = 6;
/**
 * 차수가 반지름을 키우는 정도.
 *
 * 0.5 였을 때는 가장 큰 노드가 가장 작은 노드의 7배까지 벌어져서, 허브 몇 개가 화면을
 * 덮고 그 아래 노드들이 가렸다. 값을 낮추면 "많이 이어진 노드가 크다"는 신호는 남고
 * 차이만 완만해진다.
 */
const NODE_DEGREE_WEIGHT = 0.22;
/**
 * 반지름 상한.
 *
 * pensiv 그래프에서 가장 큰 노드가 가장 작은 노드의 3배쯤이다. 이 상한을 두면 회차가
 * 200 화로 늘어 허브 차수가 아무리 커져도 그 비율이 유지된다.
 */
const NODE_MAX_RADIUS = 15;
/**
 * 노드 안에 분류 아이콘을 그리기 시작하는 화면 반지름(px).
 *
 * 이보다 작으면 24×24 짜리 선 아이콘이 점 두어 개로 뭉개져서, 그리는 값보다 어수선한
 * 값이 커진다.
 */
const ICON_MIN_SCREEN_RADIUS = 9;
/**
 * 방향 화살표 길이(그래프 좌표).
 *
 * 실험 레포는 엣지를 무방향으로 그렸지만, 서비스에서는 관계 속성을 가진 문서(source)
 * 에서 대상 문서(target)로 향한다(GRAPH_INBOX_PATTERN §3). 누가 누구를 가리키는지가
 * 드러나도록 대상 쪽 끝에 작은 화살표를 붙인다.
 */
const ARROW_LENGTH = 3.2;

/** 바깥에서 줌·화면 맞춤을 부르는 손잡이 */
export interface GraphControls {
  zoomBy(factor: number): void;
  zoomTo(scale: number): void;
  fit(): void;
  centerOn(id: string): void;
}

interface Props {
  graph: RenderGraph;
  /** 즐겨찾기한 노드. 노드 모서리에 별을 얹는다 */
  favorites: ReadonlySet<string>;
  /** 선택한 노드. 테두리를 두른다 */
  selectedId: string | null;
  /** 엣지 위에 얹을 관계 이름 */
  relationName: (link: RenderLink) => string | null;
  controlsRef?: React.RefObject<GraphControls | null>;
  onZoom?: (scale: number) => void;
  palette: Palette;
  highlight: Highlight;
  hoveredId: string | null;
  /** 문서에서 돌아왔을 때 중앙에 둘 노드 */
  focusId: string | null;
  /**
   * 포커스로 불러모은 center 들.
   *
   * 배치에서 원의 한가운데를 차지하고, 포커스 중에는 강조와 상관없이 모든 관계
   * 이름을 그린다.
   */
  centerIds: readonly string[];
  onHover: (id: string | null) => void;
  /** 노드를 누르면 그 노드를 center 로 넣거나 뺀다. 문서로 가지 않는다 */
  onFocus: (node: RenderNode) => void;
  onLayoutStop: () => void;
}

/**
 * 그려지는 반지름. 차수가 클수록 크다.
 *
 * 받는 것을 RenderNode 가 아니라 차수 하나로 좁혀 둔다 — 물리(physics.ts)가 겹침
 * 반경으로 이 함수를 그대로 받아 쓰는데, 그쪽은 노드를 더 좁은 모양으로 다룬다.
 */
function nodeRadius(node: { degree: number }) {
  const grown = Math.sqrt(1 + node.degree * NODE_DEGREE_WEIGHT) * NODE_REL_SIZE;
  return Math.min(grown, NODE_MAX_RADIUS);
}

/**
 * force-graph 에 넘길 크기 값.
 *
 * 라이브러리는 포인터 판정에 `sqrt(val) * nodeRelSize` 를 쓴다. 우리가 그리는 반지름을
 * 그 식에 거꾸로 넣어야 상한에 걸린 노드도 보이는 만큼만 눌린다 — 안 그러면 커서가
 * 원 밖에서도 잡힌다.
 */
function nodeValue(node: RenderNode) {
  const radius = nodeRadius(node) / NODE_REL_SIZE;
  return radius * radius;
}

export function Graph2D({
  graph,
  favorites,
  selectedId,
  relationName,
  controlsRef,
  onZoom,
  palette,
  highlight,
  hoveredId,
  focusId,
  centerIds,
  onHover,
  onFocus,
  onLayoutStop,
}: Props) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  /** 컨테이너가 측정되어 캔버스가 실제로 붙었는지. 포스·격자 설치 시점을 가른다 */
  const mounted = size.width > 0;
  const methods = useRef<ForceGraphMethods<RenderNode, RenderLink> | undefined>(
    undefined,
  );
  const fitted = useRef<RenderGraph | null>(null);

  /** halo 를 켤지. 규모가 커지면 끈다 */
  const rich = graph.nodes.length <= RICH_NODE_LIMIT;
  const dimming = hoveredId !== null;

  /*
   * 즐겨찾기는 여기서 **읽기만** 한다 — 켜고 끄는 것은 문서에서만 할 수 있다.
   *
   * 이 값이 바뀌면 drawNode 의 identity 가 바뀌고, force-graph 는 접근자 prop 이
   * 바뀌면 리드로를 예약한다(아래 autoPauseRedraw 주석 참고). 배치는 그대로다.
   */

  /**
   * 지금 화면에 보이는 그래프 좌표 범위.
   *
   * 배경 격자를 그릴 때 어차피 계산하므로 거기서 담아두고, 노드를 그릴 때 재사용한다.
   * nodeCanvasObject 는 프레임 시작 훅이 따로 없어서 이렇게 넘긴다.
   */
  const viewport = useRef({
    minX: -Infinity,
    minY: -Infinity,
    maxX: Infinity,
    maxY: Infinity,
  });

  /** 이번 프레임에 이미 그린 라벨들. 겹치는 이름을 걸러내는 데 쓴다 */
  const labelPacker = useMemo(() => createLabelPacker(), []);

  // 매 노드·매 프레임 getComputedStyle 을 부르면 레이아웃을 계속 다시 계산하게 된다.
  const fontFamily = useMemo(
    () => getComputedStyle(document.body).fontFamily,
    [],
  );

  const isLit = useCallback(
    (id: string) => !dimming || highlight.nodes.has(id),
    [dimming, highlight],
  );

  const drawNode = useCallback(
    (node: RenderNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const radius = nodeRadius(node);
      const lit = isLit(node.id);
      const hovered = node.id === hoveredId || node.id === selectedId;
      const base = lit ? palette.node[node.kind] : palette.nodeDim;

      if (rich) {
        // 경계를 부드럽게 풀어주는 옅은 번짐. 반사광이 아니라 halo 라서 무광 느낌을
        // 해치지 않으면서 원이 캔버스에 딱 잘린 것처럼 보이는 걸 막는다.
        ctx.shadowColor = base;
        ctx.shadowBlur = (hovered ? radius * 1.3 : radius * 0.65) / globalScale;
      }

      // 무광. 그라디언트도 반사광도 넣지 않고 파스텔 단색으로만 채운다.
      ctx.fillStyle = base;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fill();

      // 번짐이 남아 있으면 이후에 그리는 테두리와 글자에도 묻는다.
      ctx.shadowBlur = 0;

      // 충분히 큰 노드에만 분류 아이콘을 얹는다. 원 안에 들어가야 하므로 지름의
      // 60% 정도로 잡는다 — 꽉 채우면 테두리에 붙어 원이 아이콘 액자처럼 보인다.
      if (lit && radius * globalScale >= ICON_MIN_SCREEN_RADIUS) {
        drawKindIcon(ctx, node.kind, x, y, radius * 1.2, palette.nodeIcon);
      }

      // 즐겨찾기 별. 원 안은 분류 아이콘이 쓰고 있으므로 오른쪽 위 모서리에 얹는다.
      // 분류 아이콘과 같은 크기 컷을 쓴다 — 아이콘이 안 보일 만큼 작으면 별도 점이다.
      if (
        favorites.has(node.baseId) &&
        radius * globalScale >= ICON_MIN_SCREEN_RADIUS
      ) {
        drawFavoriteStar(
          ctx,
          x + radius * 0.72,
          y - radius * 0.72,
          radius * 0.95,
          // 흐림 상태에서는 별도 함께 물러난다. 강조 중에 별만 또렷하면
          // 1-hop 이 눈에 들어오지 않는다.
          lit ? palette.favorite : palette.nodeDim,
          palette.canvasBg,
        );
      }

      if (hovered) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 2 / globalScale, 0, 2 * Math.PI);
        ctx.lineWidth = 2 / globalScale;
        ctx.strokeStyle = palette.nodeStroke;
        ctx.stroke();
      }
    },
    [favorites, hoveredId, isLit, palette, rich, selectedId],
  );

  /**
   * 강조된 엣지 위의 관계 이름.
   *
   * 엣지는 두 노드가 이어져 있다는 것만 알려준다. 그게 어떤 관계인지는 사용자가
   * 문서에서 붙인 이름에만 있는데, 그 이름을 보려고 매번 문서로 나가야 했다.
   *
   * 언제 그리는가 — 마우스를 올렸으면 그 노드에 붙은 엣지만, 포커스 중이면 화면에
   * 남은 엣지 전부다. 포커스는 이미 몇십 개로 좁혀진 화면이라 전부 그려도 읽힌다.
   *
   * 이름이 없는 엣지는 건너뛴다. 지금 데이터는 대부분이 그래서, 실제로 글자가
   * 얹히는 엣지는 몇 개 되지 않는다.
   *
   * 노드 이름을 다 그린 뒤에 부른다 — 같은 labelPacker 를 쓰므로 자리가 겹치면
   * 관계 이름 쪽이 밀린다. 이름이 무엇인지가 관계가 무엇인지보다 먼저다.
   */
  const drawRelationNames = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      if (!dimming && centerIds.length === 0) return;

      const view = viewport.current;
      // 마우스를 올렸을 때는 굵게. 그 순간 화면에 남는 관계는 몇 개뿐이고, 그것이
      // 지금 무엇을 보고 있는지를 말해주는 글자다.
      const fontSize = Math.max(9 / globalScale, 1.4);
      ctx.font = `${dimming ? 600 : 400} ${fontSize}px ${fontFamily}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      for (const link of graph.links) {
        // 마우스를 올리고 있으면 그 노드에 붙은 엣지만 대상이다.
        if (dimming && !highlight.links.has(link)) continue;

        // force-graph 가 첫 렌더에서 문자열을 노드 객체로 바꿔 넣는다.
        const source = link.source;
        const target = link.target;
        if (typeof source === "string" || typeof target === "string") continue;

        const name = relationName(link);
        if (!name) continue;

        const x = ((source.x ?? 0) + (target.x ?? 0)) / 2;
        const y = ((source.y ?? 0) + (target.y ?? 0)) / 2;
        if (x < view.minX || x > view.maxX || y < view.minY || y > view.maxY) {
          continue;
        }

        const half = ctx.measureText(name).width / 2;
        if (
          !labelPacker.place(
            x - half - fontSize * 0.35,
            y - fontSize * 0.6,
            x + half + fontSize * 0.35,
            y + fontSize * 0.6,
            false,
          )
        ) {
          continue;
        }

        // 선 위에 바로 얹히므로 배경을 깔아야 글자가 선에 잘리지 않는다.
        ctx.lineJoin = "round";
        ctx.lineWidth = fontSize * 0.5;
        ctx.strokeStyle = palette.canvasBg;
        ctx.strokeText(name, x, y);

        ctx.fillStyle = palette.graphLinkLabel;
        ctx.fillText(name, x, y);
      }
    },
    [
      dimming,
      fontFamily,
      graph,
      highlight,
      labelPacker,
      palette,
      centerIds,
      relationName,
    ],
  );

  /**
   * 이름표.
   *
   * 노드를 그리는 콜백 안에서 같이 그리지 않고 **모든 노드를 그린 뒤**(프레임 후처리)
   * 한꺼번에 그린다. 노드 안에서 그리면 뒤이어 그려지는 다른 노드의 원이 앞 노드의
   * 이름을 덮어버려서, 빽빽한 구역의 이름이 절반쯤 잘려 보인다.
   *
   * 여기서 그리면 순서를 우리가 정할 수 있다는 이점도 있다 — 자리가 모자랄 때
   * 잔챙이가 아니라 허브의 이름이 남도록 큰 노드부터 자리를 잡는다.
   */
  const drawLabels = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      labelPacker.reset();
      const view = viewport.current;

      // 마우스를 올리고 있으면 그 노드와 1-hop 이웃만 후보다. 나머지 이름은 끈다 —
      // 강조된 몇 개만 남아야 읽히기 때문이다.
      // 평상시에는 화면 안에 있고 충분히 큰 노드만 후보다.
      const candidates = graph.nodes.filter((node) => {
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        if (x < view.minX || x > view.maxX || y < view.minY || y > view.maxY) {
          return false;
        }
        return dimming
          ? isLit(node.id)
          : nodeRadius(node) * globalScale >= LABEL_MIN_SCREEN_RADIUS;
      });
      // 큰 노드부터. 겹치면 뒤에 오는 쪽이 밀린다.
      candidates.sort((a, b) => b.degree - a.degree);

      ctx.textAlign = "center";
      ctx.textBaseline = "top";

      for (const node of candidates) {
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        const hovered = node.id === hoveredId;
        const fontSize = Math.max((hovered ? 11 : 10) / globalScale, 1.6);
        ctx.font = `${hovered ? 600 : 400} ${fontSize}px ${fontFamily}`;

        const top = y + nodeRadius(node) + fontSize * 0.45;
        const textWidth = ctx.measureText(node.name).width;
        // 이미 자리를 잡은 이름과 겹치면 포기한다. 허브에 마우스를 올리면 이웃이
        // 수백 개라, 이 컷이 없으면 이름들이 서로 포개져 하나도 못 읽는다.
        // 마우스를 올린 노드 자신은 반드시 보여야 하므로 겹침 검사를 건너뛴다.
        // 자리를 잡을 때는 글자보다 조금 넉넉하게 잡아, 살아남은 이름끼리도
        // 최소한의 간격이 남게 한다.
        const gapX = fontSize * 0.35;
        const gapY = fontSize * 0.2;
        if (
          !labelPacker.place(
            x - textWidth / 2 - gapX,
            top - gapY,
            x + textWidth / 2 + gapX,
            top + fontSize + gapY,
            hovered,
          )
        ) {
          continue;
        }

        if (dimming) {
          // 강조 중에는 선 위에 글자가 겹쳐 읽기 어려워지므로 칩 배경을 깐다.
          const padX = fontSize * 0.4;
          const padY = fontSize * 0.18;
          ctx.beginPath();
          ctx.roundRect(
            x - textWidth / 2 - padX,
            top - padY,
            textWidth + padX * 2,
            fontSize + padY * 2,
            fontSize * 0.35,
          );
          ctx.fillStyle = palette.canvasBg;
          ctx.globalAlpha = 0.88;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        // 글자 둘레를 배경색으로 한 번 두른다. 노드 색이 밝은 다크 테마에서는
        // 이 테두리가 없으면 밝은 노드 위에 얹힌 글자가 그대로 사라진다.
        ctx.lineJoin = "round";
        ctx.lineWidth = fontSize * 0.28;
        ctx.strokeStyle = palette.canvasBg;
        ctx.strokeText(node.name, x, top);

        ctx.fillStyle = palette.nodeLabel;
        ctx.fillText(node.name, x, top);
      }

      drawRelationNames(ctx, globalScale);
    },
    [
      dimming,
      drawRelationNames,
      fontFamily,
      graph,
      hoveredId,
      isLit,
      labelPacker,
      palette,
    ],
  );

  // 커스텀 렌더를 쓰면 클릭 판정 영역도 직접 칠해야 원과 어긋나지 않는다.
  const paintPointerArea = useCallback(
    (node: RenderNode, color: string, ctx: CanvasRenderingContext2D) => {
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, nodeRadius(node) + 2, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    },
    [],
  );

  const linkColor = useCallback(
    (link: RenderLink) => {
      if (!dimming) return palette.graphLink;
      return highlight.links.has(link) ? palette.linkHot : palette.graphLinkDim;
    },
    [dimming, highlight, palette],
  );

  // 강조는 색으로만 한다. 굵기는 그 색이 눈에 들어오게 거드는 정도만.
  const linkWidth = useCallback(
    (link: RenderLink) => (highlight.links.has(link) ? 2.2 : 0.6),
    [highlight],
  );

  const handleHover = useCallback(
    (node: RenderNode | null) => onHover(node ? node.id : null),
    [onHover],
  );

  /**
   * 자리를 계산해 노드에 못박는다.
   *
   * 힘을 심지 않는다 — 전체를 정확한 원으로 만들고 간격을 균일하게 하는 건 힘의
   * 평형점이 아니라서, 배치를 packed-layout.ts 가 직접 계산한다. 결과는 fx/fy 로
   * 고정되므로 시뮬레이션이 돌든 말든 노드는 이 자리에 있는다.
   *
   * graph 가 같은 객체면 결과도 같다(결정적). 그래서 문서에 갔다 와도 그림이 그대로다.
   */
  const layout = useMemo(
    () =>
      applyPackedLayout(graph, {
        // 자리 크기를 하나로 고정해야 간격이 균일해진다. 가장 큰 노드를 기준으로 잡아
        // 어떤 노드도 이웃과 겹치지 않게 한다.
        nodeRadius: NODE_MAX_RADIUS,
        centerIds,
      }),
    [centerIds, graph],
  );

  /**
   * 엔진을 켜 둘지.
   *
   * 평소에는 끈다(cooldownTicks 0). 노드가 전부 못박혀 있어 시뮬레이션이 할 일이
   * 없고, 캔버스 리드로도 쉬어야 한다. 연출이 도는 동안과 드래그하는 동안에만 켠다 —
   * 우리가 좌표를 프레임마다 바꾸므로 그때는 화면이 매 프레임 다시 그려져야 한다.
   */
  /**
   * 펼침이 끝나면 화면을 맞춘다. 그래프당 한 번만.
   *
   * 예전에는 onEngineStop 이 이 일을 했는데, 이제 엔진이 영영 멈추지 않는다. 노드가
   * 최종 자리에 앉는 시점은 연출이 끝나는 때이므로 그쪽에서 부른다.
   */
  const fitOnce = useCallback(() => {
    if (fitted.current === graph) return;
    fitted.current = graph;
    methods.current?.zoomToFit(400, 60);
  }, [graph]);

  /**
   * 그래프가 바뀔 때마다 중심으로 모았다가 계산된 자리로 펼치고, 힘을 심는다.
   *
   * useLayoutEffect 인 이유는 브라우저가 칠하기 전에 좌표를 중심으로 옮겨 놓아야
   * 하기 때문이다. useEffect 면 완성된 원이 한 프레임 번쩍인 뒤 모였다가 다시
   * 펼쳐진다.
   *
   * 연출이 끝나면 reveal 이 못을 뽑아 물리에 넘긴다. 그때부터 그래프는 계속 살아
   * 있고, 배치는 출발 모양으로만 남는다.
   */
  const revealed = useRef(false);
  useLayoutEffect(() => {
    // 배치는 위 useMemo 에서 이미 끝났다. 계측은 그 시간을 재는 것이지 뒤따르는
    // 연출(고정 길이다)을 재는 게 아니다.
    onLayoutStop();

    // 힘은 그래프가 바뀔 때마다 다시 심는다 — force-graph 가 링크를 갈아끼우면
    // 링크 힘 객체도 새로 만들어진다.
    const instance = methods.current;
    if (instance) {
      installPhysics(instance, {
        // 엣지마다의 기준 거리를 배치가 준 길이로 잡는다 — 그래야 배치 자체가
        // 힘의 평형점이 되어 원이 유지된다(physics.ts 머리 주석 참고).
        home: layout.home,
        spacing: spacingFor(NODE_MAX_RADIUS),
        // 화면에 그리는 것과 같은 함수를 넘긴다 — 큰 노드는 그만큼 넓게 밀어낸다.
        nodeRadius,
      });
    }

    const first = !revealed.current;
    revealed.current = true;
    // 연출이 끝나기 전에 그래프가 또 바뀌면(필터를 연달아 누르는 경우) 이전 루프가
    // 남아 새 좌표를 덮어쓴다.
    return startReveal(graph.nodes, layout.home, { first }, () => fitOnce());
  }, [fitOnce, graph, layout, mounted, onLayoutStop]);

  /**
   * 배경 격자. 보이는 범위를 담아두는 것도 여기서 한다 — 프레임의 첫 훅이라
   * 이후 이름표를 그릴 때 그 값을 그대로 쓸 수 있다.
   */
  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, globalScale: number) => {
      const instance = methods.current;
      if (!instance || size.width === 0) return;

      const topLeft = instance.screen2GraphCoords(0, 0);
      const bottomRight = instance.screen2GraphCoords(size.width, size.height);
      viewport.current = {
        minX: topLeft.x,
        minY: topLeft.y,
        maxX: bottomRight.x,
        maxY: bottomRight.y,
      };

      drawCanvasGrid(ctx, globalScale, viewport.current, palette);
    },
    [palette, size.height, size.width],
  );

  // 연출이 끝나 엔진이 멈추면 화면을 맞춘다. 그때가 노드가 최종 자리에 앉은 시점이다.
  // 문서에서 돌아오면 방금 보던 노드를 중앙에 둔다.
  //
  // mounted 를 의존성에 넣는 이유: 컨테이너 크기를 재기 전에는 캔버스가 아예 없어서
  // methods.current 가 비어 있다. 그래서 마운트 직후 한 번만 도는 효과로는 아무 일도
  // 일어나지 않았고, 문서에서 돌아와도 그 노드로 이동하지 않았다.
  useEffect(() => {
    if (!focusId || !mounted) return;
    const target = graph.nodes.find((node) => node.id === focusId);
    if (!target || target.x === undefined || target.y === undefined) return;
    methods.current?.centerAt(target.x, target.y, 600);
    methods.current?.zoom(2.4, 600);
  }, [focusId, graph, mounted]);

  useEffect(() => {
    if (!controlsRef) return;
    controlsRef.current = {
      zoomBy: (factor) => {
        const instance = methods.current;
        if (instance) instance.zoom(instance.zoom() * factor, 250);
      },
      zoomTo: (scale) => methods.current?.zoom(scale, 250),
      fit: () => methods.current?.zoomToFit(400, 60),
      centerOn: (id) => {
        const target = graph.nodes.find((node) => node.id === id);
        if (!target || target.x === undefined || target.y === undefined) return;
        methods.current?.centerAt(target.x, target.y, 500);
      },
    };
    return () => {
      controlsRef.current = null;
    };
  }, [controlsRef, graph]);

  const graphData = useMemo(
    () => ({ nodes: graph.nodes, links: graph.links }),
    [graph],
  );

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      {mounted && (
        <ForceGraph2D<RenderNode, RenderLink>
          ref={methods}
          width={size.width}
          height={size.height}
          graphData={graphData}
          backgroundColor={palette.canvasBg}
          onRenderFramePre={drawGrid}
          // 이름표는 노드를 다 그린 뒤에 얹는다(drawLabels 주석 참고)
          onRenderFramePost={drawLabels}
          nodeRelSize={NODE_REL_SIZE}
          nodeVal={nodeValue}
          nodeLabel={(node) => node.name}
          nodeCanvasObject={drawNode}
          nodePointerAreaPaint={paintPointerArea}
          linkColor={linkColor}
          linkWidth={linkWidth}
          linkDirectionalArrowLength={ARROW_LENGTH}
          linkDirectionalArrowRelPos={1}
          linkDirectionalArrowColor={linkColor}
          onZoom={onZoom ? ({ k }) => onZoom(k) : undefined}
          onNodeHover={handleHover}
          onNodeClick={onFocus}
          // autoPauseRedraw 는 기본값(true) 그대로 둔다. 레이아웃이 수렴하고 아무
          // 상호작용이 없으면 캔버스 리드로를 쉬어서 배터리와 발열에 유리하다.
          //
          // 외부 state 를 읽어 그리는 hover 강조가 반영되지 않을까 걱정할 수 있는데,
          // force-graph 는 nodeCanvasObject / linkColor / linkWidth 같은 접근자
          // prop 이 바뀌면 onChange: notifyRedraw 로 리드로를 예약한다. 우리 접근자는
          // hover 마다 identity 가 바뀌므로 강조는 정상적으로 다시 그려진다.
          warmupTicks={0}
          // 느낌을 만드는 세 값은 physics.ts 에 모여 있다
          d3VelocityDecay={JELLYFISH_VELOCITY_DECAY}
          // 식지 않게 둔다 — 멈추면 해파리가 아니라 표본이 된다
          d3AlphaDecay={JELLYFISH_ALPHA_DECAY}
          // 엔진을 멈추지 않는다. 그래프가 계속 살아 있어야 하고, 연출이 도는
          // 동안에도 우리가 프레임마다 좌표를 바꾸므로 리드로가 필요하다
          // (autoPauseRedraw 는 엔진이 멈춰 있으면 리드로를 건너뛴다).
          cooldownTicks={Infinity}
          cooldownTime={Infinity}
        />
      )}
    </div>
  );
}
