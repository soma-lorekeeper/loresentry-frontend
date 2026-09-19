"use client";

import { useCallback, useMemo, useState } from "react";

import { useTheme } from "@/design-system/theme/theme-store";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";

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
  selectedId: string | null;
  controlsRef: React.RefObject<GraphControls | null>;
  onZoom: (scale: number) => void;
  onSelect: (node: RenderNode) => void;
}

function relationName(link: RenderLink) {
  const target = link.target;
  if (typeof target === "string") return null;
  return DOCUMENT_TYPE_META[target.kind].relationLabel;
}

// force-graph 는 캔버스와 window 에 기대므로 브라우저에서만 불러온다(graph-view 의 dynamic import).
export default function GraphCanvas({
  graph,
  favorites,
  selectedId,
  controlsRef,
  onZoom,
  onSelect,
}: GraphCanvasProps) {
  const { mode } = useTheme();
  // 테마가 바뀌면 토큰 값을 다시 읽는다. mode 는 읽기 시점을 가르는 열쇠로만 쓴다.
  const palette = useMemo(() => (void mode, readPalette()), [mode]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const highlight = useMemo(
    () => computeHighlight(graph, hoveredId),
    [graph, hoveredId],
  );
  const noop = useCallback(() => {}, []);

  return (
    <Graph2D
      graph={graph}
      palette={palette}
      highlight={highlight}
      hoveredId={hoveredId}
      focusId={null}
      centerIds={NO_CENTERS}
      favorites={favorites}
      selectedId={selectedId}
      relationName={relationName}
      controlsRef={controlsRef}
      onZoom={onZoom}
      onHover={setHoveredId}
      onFocus={onSelect}
      onLayoutStop={noop}
    />
  );
}
