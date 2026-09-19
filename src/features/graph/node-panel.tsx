"use client";

import { Icon, IconButton } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { GraphNode, ProjectGraph } from "@/domain/models";
import { cx } from "@/shared/cx";

import styles from "./graph-view.module.css";

export function neighborsOf(graph: ProjectGraph, id: string): GraphNode[] {
  const ids = new Set<string>();
  for (const edge of graph.edges) {
    if (edge.source === id) ids.add(edge.target);
    if (edge.target === id) ids.add(edge.source);
  }
  return graph.nodes.filter((node) => ids.has(node.id));
}

function Card({
  node,
  tag,
  selected,
  onOpen,
}: {
  node: GraphNode;
  tag?: string;
  selected?: boolean;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        className={cx(styles.card, selected && styles.cardSelected)}
        onClick={onOpen}
      >
        <span className={styles.cardTitle}>
          <Icon name={DOCUMENT_TYPE_META[node.docType].entityIcon} size={15} />
          {node.title}
        </span>
        {tag && <span className={styles.cardTag}>{tag}</span>}
        {node.description && (
          <span className={styles.cardDescription}>{node.description}</span>
        )}
      </button>
    </li>
  );
}

export function NodePanel({
  graph,
  nodeId,
  onClose,
  onOpen,
}: {
  graph: ProjectGraph;
  nodeId: string;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;
  const neighbors = neighborsOf(graph, nodeId);
  return (
    <aside className={styles.nodePanel} aria-label="선택한 노드">
      <header className={styles.nodePanelHeader}>
        <h2>선택한 노드</h2>
        <IconButton
          icon="x"
          iconSize={15}
          label="선택 해제"
          onClick={onClose}
        />
      </header>
      <ul className={styles.cards}>
        <Card node={node} selected onOpen={() => onOpen(node.id)} />
        {neighbors.map((neighbor) => (
          <Card
            key={neighbor.id}
            node={neighbor}
            tag={node.title}
            onOpen={() => onOpen(neighbor.id)}
          />
        ))}
      </ul>
    </aside>
  );
}
