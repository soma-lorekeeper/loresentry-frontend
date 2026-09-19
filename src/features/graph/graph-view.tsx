"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Menu,
  type MenuEntry,
} from "@/design-system/primitives";
import { DOCUMENT_TYPES } from "@/domain/document-types";
import { useFavorites } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";

import type { GraphControls } from "./engine/graph-2d";
import { getEpisodeGraph } from "./engine/episode-filter";
import { getRenderGraph } from "./engine/render-graph";
import {
  DEFAULT_KINDS,
  LARGE_GRAPH_NODES,
  NODE_KINDS,
  type NodeKind,
} from "./engine/types";
import { getFilteredGraph } from "./engine/view-graph";
import { GraphLegend, GraphTools } from "./graph-tools";
import styles from "./graph-view.module.css";
import { NodePanel } from "./node-panel";
import { useProjectGraph } from "./queries";

const GraphCanvas = dynamic(() => import("./graph-canvas"), {
  ssr: false,
  loading: () => <div className={styles.canvasLoading} aria-busy="true" />,
});

const ZOOM_STEP = 1.25;

function isNodeKind(value: string): value is NodeKind {
  return (DOCUMENT_TYPES as readonly string[]).includes(value);
}

export function GraphView() {
  const { projectId, layout, dispatch, open } = useWorkspace();
  const graph = useProjectGraph(projectId);
  const favorites = useFavorites(projectId);
  const controls = useRef<GraphControls | null>(null);
  const episodeRef = useRef<HTMLButtonElement>(null);
  const [episodeOpen, setEpisodeOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  const view = layout.graphView;
  const savedKinds = view?.kinds;
  const savedEpisodes = view?.episodeIds;
  const data = graph.data;
  const large = (data?.nodes.length ?? 0) > LARGE_GRAPH_NODES;
  const kinds = useMemo(
    () =>
      new Set<NodeKind>(
        savedKinds
          ? savedKinds.filter(isNodeKind)
          : large
            ? DEFAULT_KINDS
            : NODE_KINDS,
      ),
    [savedKinds, large],
  );
  const episodeIds = useMemo(
    () =>
      (savedEpisodes ?? []).filter((id) =>
        data?.episodes.some((episode) => episode.id === id),
      ),
    [savedEpisodes, data],
  );

  const renderGraph = useMemo(() => {
    if (!data) return null;
    const base =
      episodeIds.length > 0
        ? getEpisodeGraph(data, episodeIds)
        : getRenderGraph(data);
    return getFilteredGraph(base, kinds);
  }, [data, episodeIds, kinds]);

  const favoriteSet = useMemo(
    () => new Set(favorites.data ?? []),
    [favorites.data],
  );

  const saveView = (next: { kinds?: NodeKind[]; episodeIds?: string[] }) =>
    dispatch({
      type: "setGraphView",
      graphView: {
        kinds: next.kinds ?? view?.kinds ?? null,
        episodeIds: next.episodeIds ?? episodeIds,
      },
    });

  const episodeLabel =
    episodeIds.length === 0
      ? "전체"
      : episodeIds.length === 1
        ? (data?.episodes.find((e) => e.id === episodeIds[0])?.title ?? "전체")
        : `${episodeIds.length}개 선택`;

  const episodeEntries: MenuEntry[] = [
    {
      id: "all",
      label: "전체",
      checked: episodeIds.length === 0,
      onSelect: () => saveView({ episodeIds: [] }),
    },
    { type: "separator", id: "sep" },
    ...(data?.episodes ?? []).map((episode) => ({
      id: episode.id,
      label: episode.title,
      checked: episodeIds.includes(episode.id),
      onSelect: () =>
        saveView({
          episodeIds: episodeIds.includes(episode.id)
            ? episodeIds.filter((id) => id !== episode.id)
            : [...episodeIds, episode.id],
        }),
    })),
  ];

  const pick = (id: string) => {
    setSelectedId(id);
    controls.current?.centerOn(id);
  };

  return (
    <div className={styles.view}>
      <div className={styles.toolbar} role="toolbar" aria-label="그래프 도구">
        <button
          ref={episodeRef}
          type="button"
          className={styles.episode}
          aria-haspopup="menu"
          aria-expanded={episodeOpen}
          onClick={() => setEpisodeOpen((value) => !value)}
        >
          <span className={styles.episodeLabel}>에피소드</span>
          <strong>{episodeLabel}</strong>
          <Icon name="chevron-down" size={14} />
        </button>
        {episodeOpen && (
          <Menu
            anchorRef={episodeRef}
            open={episodeOpen}
            onOpenChange={setEpisodeOpen}
            label="에피소드 선택"
            placement="bottom-start"
            width={240}
            entries={episodeEntries}
          />
        )}
        <div className={styles.zoom} role="group" aria-label="확대/축소">
          <IconButton
            icon="minus"
            iconSize={14}
            label="축소"
            onClick={() => controls.current?.zoomBy(1 / ZOOM_STEP)}
          />
          <button
            type="button"
            className={styles.zoomValue}
            aria-label="100%로 보기"
            onClick={() => controls.current?.zoomTo(1)}
          >
            {Math.round(zoom * 100)}%
          </button>
          <IconButton
            icon="plus"
            iconSize={14}
            label="확대"
            onClick={() => controls.current?.zoomBy(ZOOM_STEP)}
          />
        </div>
        <Button size="sm" icon="scan" onClick={() => controls.current?.fit()}>
          화면 맞춤
        </Button>
      </div>

      <div className={styles.stage}>
        <div className={styles.canvas}>
          {graph.isPending ? (
            <div className={styles.canvasLoading} aria-busy="true" />
          ) : !data || !renderGraph ? (
            <EmptyState
              role="alert"
              icon="triangle-alert"
              title="그래프를 불러오지 못했어요"
              description="연결을 확인한 뒤 다시 시도해 주세요."
              action={
                <Button
                  size="md"
                  icon="refresh-cw"
                  onClick={() => graph.refetch()}
                >
                  다시 시도
                </Button>
              }
            />
          ) : (
            <>
              <GraphCanvas
                graph={renderGraph}
                favorites={favoriteSet}
                selectedId={selectedId}
                controlsRef={controls}
                onZoom={setZoom}
                onSelect={(node) =>
                  setSelectedId((current) =>
                    current === node.id ? null : node.id,
                  )
                }
              />
              {renderGraph.nodes.length === 0 && (
                <EmptyState
                  icon="waypoints"
                  title="표시할 노드가 없어요"
                  description="분류 필터나 에피소드 선택을 바꿔 보세요."
                  className={styles.canvasEmpty}
                />
              )}
              {large && !view?.kinds && !noticeDismissed && (
                <div className={styles.notice} role="status">
                  <Icon name="info" size={15} />
                  <span>
                    노드가 {data.nodes.length}개라 원고·캐릭터·이벤트만 먼저
                    보여 주고 있어요.
                  </span>
                  <Button
                    size="sm"
                    onClick={() => saveView({ kinds: [...NODE_KINDS] })}
                  >
                    모두 보기
                  </Button>
                  <IconButton
                    icon="x"
                    iconSize={14}
                    label="안내 닫기"
                    onClick={() => setNoticeDismissed(true)}
                  />
                </div>
              )}
              <GraphTools
                nodes={renderGraph.nodes}
                kinds={kinds}
                onKindsChange={(next) => saveView({ kinds: [...next] })}
                onPick={(node) => pick(node.id)}
              />
              <GraphLegend kinds={kinds} hasFavorites />
            </>
          )}
        </div>
        {data && selectedId && (
          <NodePanel
            graph={data}
            nodeId={selectedId}
            onClose={() => setSelectedId(null)}
            onOpen={(id) => open({ kind: "file", fileId: id })}
          />
        )}
      </div>
    </div>
  );
}
