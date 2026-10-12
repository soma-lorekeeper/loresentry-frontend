"use client";

import { Icon, IconButton } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { GraphNode, ProjectGraph } from "@/domain/models";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import styles from "./graph-view.module.css";

/**
 * 고른 노드들 가운데 하나에라도 바로 이어진 문서. 고른 노드 자신은 뺀다 —
 * 패널이 그것들을 맨 위에 따로 보여 주기 때문이다.
 */
export function neighborsOf(
  graph: ProjectGraph,
  ids: ReadonlySet<string>,
): GraphNode[] {
  const neighbors = new Set<string>();
  for (const edge of graph.edges) {
    if (ids.has(edge.source)) neighbors.add(edge.target);
    if (ids.has(edge.target)) neighbors.add(edge.source);
  }
  return graph.nodes.filter(
    (node) => neighbors.has(node.id) && !ids.has(node.id),
  );
}

function Card({
  node,
  selected,
  onOpen,
}: {
  node: GraphNode;
  selected?: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        data-kind={node.docType}
        aria-current={selected || undefined}
        className={cx(styles.card, selected && styles.cardSelected)}
        onClick={onOpen}
      >
        <span className={styles.cardTitle}>
          <Icon name={DOCUMENT_TYPE_META[node.docType].entityIcon} size={15} />
          {node.title}
        </span>
        {node.description && (
          <span className={styles.cardDescription}>{node.description}</span>
        )}
      </button>
    </li>
  );
}

/**
 * 고른 노드들과, 그 노드들에 바로 이어진 문서 목록.
 *
 * 노드를 여러 개 고르면 캔버스가 각 노드의 1-hop 을 합쳐 밝히므로, 여기서도 고른 노드를
 * 고른 순서대로 위에 두고 그 아래에 이어진 문서를 한 번씩만 늘어놓는다.
 */
export function NodePanel({
  graph,
  nodeIds,
  onClose,
  onOpen,
}: {
  graph: ProjectGraph;
  nodeIds: readonly string[];
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const selected = nodeIds
    .map((id) => graph.nodes.find((candidate) => candidate.id === id))
    .filter((node): node is GraphNode => node !== undefined);
  if (selected.length === 0) return null;
  const neighbors = neighborsOf(graph, new Set(selected.map((n) => n.id)));
  return (
    <aside
      className={styles.nodePanel}
      aria-label={t("선택한 노드")}
      data-tour="node-panel"
    >
      <header className={styles.nodePanelHeader}>
        <h2>
          {t("선택한 노드")}
          {selected.length > 1 && (
            <span className={styles.nodePanelCount}>{selected.length}</span>
          )}
        </h2>
        <IconButton
          icon="x"
          iconSize={15}
          label={t("선택 해제")}
          onClick={onClose}
        />
      </header>
      <ul className={styles.cards}>
        {selected.map((node) => (
          <Card
            key={node.id}
            node={node}
            selected
            onOpen={() => onOpen(node.id)}
          />
        ))}
        {neighbors.map((neighbor) => (
          <Card
            key={neighbor.id}
            node={neighbor}
            onOpen={() => onOpen(neighbor.id)}
          />
        ))}
      </ul>
    </aside>
  );
}
