"use client";

import { useCallback, useMemo, useState } from "react";

import { useTheme } from "@/design-system/theme/theme-store";

import { Graph2D, type GraphControls } from "./engine/graph-2d";
import { computeHighlight } from "./engine/highlight";
import { readPalette } from "./engine/palette";
import type {
  RenderGraph,
  RenderLink,
  RenderNode,
} from "./engine/render-graph";

const NO_CENTERS: readonly string[] = [];

export interface GraphCanvasProps {
  graph: RenderGraph;
  favorites: ReadonlySet<string>;
  /** 고른 노드들. 고른 순서대로 온다 */
  selectedIds: readonly string[];
  controlsRef: React.RefObject<GraphControls | null>;
  onZoom: (scale: number) => void;
  /** 노드를 눌렀다. 고른 목록에 넣거나 빼는 것은 부르는 쪽이 정한다 */
  onSelect: (node: RenderNode) => void;
  /** 빈 배경을 눌렀다. 고른 노드를 모두 푼다 */
  onClearSelection: () => void;
}

/**
 * 엣지 위에 얹을 글자. 작가가 그 연결에 적은 설명이다.
 *
 * 전에는 대상 노드의 분류 이름("관련 원고")을 돌려줬다. 관계는 대칭이라 어느 쪽이
 * target 인지는 그리기 순서일 뿐이어서, 같은 엣지가 그릴 때마다 다른 분류로 읽혔다.
 */
function relationName(link: RenderLink) {
  return link.description.trim() || null;
}

// force-graph 는 캔버스와 window 에 기대므로 브라우저에서만 불러온다(graph-view 의 dynamic import).
export default function GraphCanvas({
  graph,
  favorites,
  selectedIds,
  controlsRef,
  onZoom,
  onSelect,
  onClearSelection,
}: GraphCanvasProps) {
  const { mode } = useTheme();
  // 테마가 바뀌면 토큰 값을 다시 읽는다. mode 는 읽기 시점을 가르는 열쇠로만 쓴다.
  const palette = useMemo(() => (void mode, readPalette()), [mode]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  // 강조는 마우스를 올린 동안이 아니라 누른 노드에 고정된다. 필터로 빠진 노드는 강조에서
  // 뺀다 — 고른 것이 모두 빠지면 강조가 풀리고 전체가 다시 또렷해진다.
  const activeIds = useMemo(() => {
    const present = new Set(graph.nodes.map((node) => node.id));
    return new Set(selectedIds.filter((id) => present.has(id)));
  }, [graph, selectedIds]);
  const highlight = useMemo(
    () => computeHighlight(graph, activeIds),
    [graph, activeIds],
  );
  const noop = useCallback(() => {}, []);

  return (
    <Graph2D
      graph={graph}
      palette={palette}
      highlight={highlight}
      activeIds={activeIds}
      hoveredId={hoveredId}
      focusId={null}
      centerIds={NO_CENTERS}
      favorites={favorites}
      relationName={relationName}
      controlsRef={controlsRef}
      onZoom={onZoom}
      onHover={setHoveredId}
      onFocus={onSelect}
      onBackgroundClick={onClearSelection}
      onLayoutStop={noop}
    />
  );
}
