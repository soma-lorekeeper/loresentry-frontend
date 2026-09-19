"use client";

import { useMemo, useRef, type KeyboardEvent } from "react";

import { Icon } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { FileNode } from "@/domain/models";

import { isDocument, type TreeItem } from "../model/tree";
import styles from "./file-tree.module.css";

export const TREE_INDENT = [12, 28, 46, 64, 82];

export function nodeIcon(node: FileNode, expanded: boolean) {
  if (isDocument(node)) return DOCUMENT_TYPE_META[node.docType].entityIcon;
  return expanded ? "folder-open" : "folder";
}

interface FileTreeProps {
  items: TreeItem[];
  expanded: ReadonlySet<string>;
  selectedId: string | null;
  label: string;
  onToggle: (id: string, expand?: boolean) => void;
  onOpen: (node: FileNode) => void;
}

interface VisibleRow {
  item: TreeItem;
  parentId: string | null;
}

function flatten(
  items: TreeItem[],
  expanded: ReadonlySet<string>,
  parentId: string | null = null,
) {
  const rows: VisibleRow[] = [];
  for (const item of items) {
    rows.push({ item, parentId });
    if (item.node.kind === "folder" && expanded.has(item.node.id)) {
      rows.push(...flatten(item.children, expanded, item.node.id));
    }
  }
  return rows;
}

export function FileTree({
  items,
  expanded,
  selectedId,
  label,
  onToggle,
  onOpen,
}: FileTreeProps) {
  const treeRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => flatten(items, expanded), [items, expanded]);

  const focusRow = (index: number) => {
    const target =
      treeRef.current?.querySelectorAll<HTMLElement>('[role="treeitem"]')[
        index
      ];
    target?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>, index: number) => {
    const { item, parentId } = rows[index];
    const folder = item.node.kind === "folder";
    const open = folder && expanded.has(item.node.id);
    if (event.key === "ArrowDown")
      focusRow(Math.min(index + 1, rows.length - 1));
    else if (event.key === "ArrowUp") focusRow(Math.max(index - 1, 0));
    else if (event.key === "Home") focusRow(0);
    else if (event.key === "End") focusRow(rows.length - 1);
    else if (event.key === "ArrowRight") {
      if (folder && !open) onToggle(item.node.id, true);
      else if (folder) focusRow(index + 1);
    } else if (event.key === "ArrowLeft") {
      if (open) onToggle(item.node.id, false);
      else if (parentId)
        focusRow(rows.findIndex((row) => row.item.node.id === parentId));
    } else if (event.key === "Enter" || event.key === " ") {
      if (folder) onToggle(item.node.id);
      else onOpen(item.node);
    } else return;
    event.preventDefault();
  };

  const firstFocusable = Math.max(
    0,
    rows.findIndex((row) => row.item.node.id === selectedId),
  );

  return (
    <div ref={treeRef} role="tree" aria-label={label} className={styles.tree}>
      {rows.map(({ item }, index) => {
        const folder = item.node.kind === "folder";
        const open = folder && expanded.has(item.node.id);
        return (
          <div
            key={item.node.id}
            role="treeitem"
            aria-level={item.depth + 1}
            aria-expanded={folder ? open : undefined}
            aria-selected={item.node.id === selectedId}
            tabIndex={index === firstFocusable ? 0 : -1}
            data-node-id={item.node.id}
            className={styles.row}
            style={{
              paddingLeft:
                TREE_INDENT[Math.min(item.depth, TREE_INDENT.length - 1)],
            }}
            onClick={() =>
              folder ? onToggle(item.node.id) : onOpen(item.node)
            }
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <Icon name={nodeIcon(item.node, open)} size={15} />
            <span className={styles.label}>{item.node.title}</span>
          </div>
        );
      })}
    </div>
  );
}

export function isVisibleFile(node: FileNode | undefined) {
  return isDocument(node);
}
