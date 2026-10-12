"use client";

import {
  Fragment,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import {
  Icon,
  Menu,
  type IconName,
  type MenuEntry,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import type { FileNode } from "@/domain/models";
import { t } from "@/i18n";

import { isDocument, type TreeItem } from "../model/tree";
import { beginDrag, originOf } from "../shell/drag-session";
import styles from "./file-tree.module.css";

export const TREE_INDENT = [12, 28, 46, 64, 82];
export const DRAG_MIME = "application/x-loresentry-node";

export function nodeIcon(node: FileNode, expanded: boolean): IconName {
  if (isDocument(node)) return DOCUMENT_TYPE_META[node.docType].entityIcon;
  return expanded ? "folder-open" : "folder";
}

export type TreeEdit =
  | {
      mode: "create";
      parentId: string | null;
      kind: "document" | "folder";
      docType?: DocumentType;
      icon: IconName;
      defaultTitle: string;
      /**
       * 이름을 정했고 지금 만드는 중이다. 값은 정한 이름이다. 서버가 대답할 때까지 그 자리에
       * 그 이름의 줄을 남겨 둔다 — 줄을 바로 치우면 만들어지는 동안 아무 일도 없어 보인다.
       */
      pending?: string;
    }
  | {
      mode: "rename";
      nodeId: string;
      /** 문서의 이름을 바꾸는 중이면 그 종류. 아이콘이 종류 색을 지킨다 */
      docType?: DocumentType;
      icon: IconName;
      defaultTitle: string;
    };

interface FileTreeProps {
  items: TreeItem[];
  expanded: ReadonlySet<string>;
  selectedId: string | null;
  label: string;
  edit: TreeEdit | null;
  rootDepth?: number;
  onToggle: (id: string, expand?: boolean) => void;
  onOpen: (node: FileNode) => void;
  rowMenu: (node: FileNode) => MenuEntry[];
  canDrag: (node: FileNode) => boolean;
  onDropNode: (dragId: string, target: FileNode) => void;
  onCommitEdit: (title: string) => void;
  onCancelEdit: () => void;
}

interface VisibleRow {
  item: TreeItem;
  parentId: string | null;
}

function flatten(
  items: TreeItem[],
  expanded: ReadonlySet<string>,
  parentId: string | null = null,
): VisibleRow[] {
  const rows: VisibleRow[] = [];
  for (const item of items) {
    rows.push({ item, parentId });
    if (item.node.kind === "folder" && expanded.has(item.node.id)) {
      rows.push(...flatten(item.children, expanded, item.node.id));
    }
  }
  return rows;
}

function indent(depth: number) {
  return TREE_INDENT[Math.min(depth, TREE_INDENT.length - 1)];
}

/**
 * 이름을 적는 줄. 새 문서·폴더를 만들 때와 이름을 바꿀 때 쓴다.
 *
 * <p>다 적으면 될 줄과 같은 모양으로 그린다 — 같은 자리의 종류 색 아이콘, 같은 높이. Enter 를
 * 치거나 다른 곳을 누르면 정해지고, Esc 는 그만둔다. 이름을 비우고 정하면 그만둔 것이다. 확인하는
 * 단추는 따로 두지 않는다.
 *
 * @param kind 문서면 그 종류. 아이콘이 그 종류의 색이 된다
 * @param pending 이름을 정했고 만드는 중이면 그 이름. 고칠 수 없고 줄 끝에 대기 표시가 돈다
 */
export function InlineEditRow({
  icon,
  kind,
  defaultTitle,
  depth,
  pending,
  onCommit,
  onCancel,
}: {
  icon: IconName;
  kind?: DocumentType;
  defaultTitle: string;
  depth: number;
  pending?: string;
  onCommit: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(defaultTitle);
  const committed = useRef(false);
  const commit = () => {
    if (committed.current) return;
    committed.current = true;
    if (value.trim()) onCommit(value.trim());
    else onCancel();
  };

  if (pending !== undefined) {
    return (
      <div
        className={styles.editRow}
        style={{ paddingLeft: indent(depth) }}
        data-kind={kind}
        aria-busy="true"
      >
        <Icon name={icon} size={15} />
        <span className={styles.editInput}>{pending}</span>
        <span
          className={styles.editPending}
          role="status"
          aria-label={t("만드는 중")}
        >
          <Icon name="loader-circle" size={14} />
        </span>
      </div>
    );
  }

  return (
    <div
      className={styles.editRow}
      style={{ paddingLeft: indent(depth) }}
      data-kind={kind}
    >
      <Icon name={icon} size={15} />
      <input
        autoFocus
        className={styles.editInput}
        value={value}
        aria-label={t("작업공간::이름")}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          } else if (event.key === "Escape") {
            event.preventDefault();
            committed.current = true;
            onCancel();
          }
        }}
        onBlur={commit}
      />
    </div>
  );
}

function Row({
  item,
  open,
  selected,
  focusable,
  dropTarget,
  menuEntries,
  draggable,
  onClick,
  onKeyDown,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  item: TreeItem;
  open: boolean;
  selected: boolean;
  focusable: boolean;
  dropTarget: boolean;
  menuEntries: () => MenuEntry[];
  draggable: boolean;
  onClick: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
  onDragStart: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
  onDrop: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [anchor, setAnchor] = useState<"more" | "row">("more");
  const folder = item.node.kind === "folder";
  const entries = menuOpen ? menuEntries() : [];

  return (
    <div
      ref={rowRef}
      role="treeitem"
      aria-level={item.depth + 1}
      aria-expanded={folder ? open : undefined}
      aria-selected={selected}
      tabIndex={focusable ? 0 : -1}
      data-node-id={item.node.id}
      data-drop-target={dropTarget || undefined}
      data-menu-open={menuOpen || undefined}
      data-kind={isDocument(item.node) ? item.node.docType : undefined}
      className={styles.row}
      style={{ paddingLeft: indent(item.depth) }}
      draggable={draggable}
      onClick={onClick}
      onKeyDown={(event) => {
        if (
          (event.key === "F10" && event.shiftKey) ||
          event.key === "ContextMenu"
        ) {
          event.preventDefault();
          setAnchor("more");
          setMenuOpen(true);
          return;
        }
        onKeyDown(event);
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setAnchor("row");
        setMenuOpen(true);
      }}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Icon name={nodeIcon(item.node, open)} size={15} />
      <span className={styles.label}>{item.node.title}</span>
      <button
        ref={moreRef}
        type="button"
        className={styles.more}
        tabIndex={-1}
        aria-label={t("{title} 더보기", { title: item.node.title })}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(event) => {
          event.stopPropagation();
          setAnchor("more");
          setMenuOpen((value) => !value);
        }}
      >
        <Icon name="ellipsis" size={15} />
      </button>
      {menuOpen && (
        <Menu
          anchorRef={anchor === "more" ? moreRef : rowRef}
          open={menuOpen}
          onOpenChange={(next) => {
            setMenuOpen(next);
            if (!next) rowRef.current?.focus();
          }}
          label={t("{title} 메뉴", { title: item.node.title })}
          placement={anchor === "more" ? "right-start" : "bottom-start"}
          entries={entries}
        />
      )}
    </div>
  );
}

export function FileTree({
  items,
  expanded,
  selectedId,
  label,
  edit,
  rootDepth = 0,
  onToggle,
  onOpen,
  rowMenu,
  canDrag,
  onDropNode,
  onCommitEdit,
  onCancelEdit,
}: FileTreeProps) {
  const treeRef = useRef<HTMLDivElement>(null);
  const rows = useMemo(() => flatten(items, expanded), [items, expanded]);
  const [dropTarget, setDropTarget] = useState<string | null>(null);

  const focusRow = (index: number) => {
    treeRef.current
      ?.querySelectorAll<HTMLElement>('[role="treeitem"]')
      [index]?.focus();
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

  const createAtRoot = edit?.mode === "create" && edit.parentId === null;

  return (
    <div ref={treeRef} role="tree" aria-label={label} className={styles.tree}>
      {rows.map(({ item }, index) => {
        const node = item.node;
        const folder = node.kind === "folder";
        const open = folder && expanded.has(node.id);
        const renaming = edit?.mode === "rename" && edit.nodeId === node.id;
        const createHere = edit?.mode === "create" && edit.parentId === node.id;
        return (
          <Fragment key={node.id}>
            {renaming ? (
              <InlineEditRow
                icon={edit.icon}
                kind={edit.docType}
                defaultTitle={edit.defaultTitle}
                depth={item.depth}
                onCommit={onCommitEdit}
                onCancel={onCancelEdit}
              />
            ) : (
              <Row
                item={item}
                open={open}
                selected={node.id === selectedId}
                focusable={index === firstFocusable}
                dropTarget={dropTarget === node.id}
                menuEntries={() => rowMenu(node)}
                draggable={canDrag(node)}
                onClick={() => (folder ? onToggle(node.id) : onOpen(node))}
                onKeyDown={(event) => onKeyDown(event, index)}
                onDragStart={(event) => {
                  event.dataTransfer.setData(DRAG_MIME, node.id);
                  event.dataTransfer.setData("text/plain", node.title);
                  event.dataTransfer.effectAllowed = "move";
                  // 작업 영역과 탭 막대가 끄는 동안 읽는다. 문서면 창에 열 수 있다.
                  beginDrag({
                    kind: "node",
                    fileId: node.id,
                    document: isDocument(node),
                    origin: originOf(event.currentTarget),
                  });
                }}
                onDragOver={(event) => {
                  if (!folder || !event.dataTransfer.types.includes(DRAG_MIME))
                    return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropTarget(node.id);
                }}
                onDragLeave={() =>
                  setDropTarget((current) =>
                    current === node.id ? null : current,
                  )
                }
                onDrop={(event) => {
                  setDropTarget(null);
                  const dragId = event.dataTransfer.getData(DRAG_MIME);
                  if (!folder || !dragId || dragId === node.id) return;
                  event.preventDefault();
                  onDropNode(dragId, node);
                  onToggle(node.id, true);
                }}
              />
            )}
            {createHere && (
              <InlineEditRow
                icon={edit.icon}
                kind={edit.docType}
                defaultTitle={edit.defaultTitle}
                pending={edit.pending}
                depth={item.depth + 1}
                onCommit={onCommitEdit}
                onCancel={onCancelEdit}
              />
            )}
          </Fragment>
        );
      })}
      {createAtRoot && (
        <InlineEditRow
          icon={edit.icon}
          kind={edit.docType}
          defaultTitle={edit.defaultTitle}
          pending={edit.pending}
          depth={rootDepth}
          onCommit={onCommitEdit}
          onCancel={onCancelEdit}
        />
      )}
    </div>
  );
}
