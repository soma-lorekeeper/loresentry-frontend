"use client";

import { useMemo, useRef, useState, type DragEvent } from "react";

import {
  Button,
  DialogCard,
  IconButton,
  InlineNotice,
  Menu,
  SidebarButton,
  useToast,
  type IconName,
  type MenuEntry,
} from "@/design-system/primitives";
import {
  DOCUMENT_TYPE_META,
  DOCUMENT_TYPES,
  type DocumentType,
} from "@/domain/document-types";
import type { FileNode, FolderNode } from "@/domain/models";
import { UserMenu } from "@/features/projects/user-menu";
import { isServiceError } from "@/services/errors";

import { activeTabOf, type WorkspaceViewKind } from "../model/layout";
import {
  ancestorsOf,
  buildTree,
  descendantIds,
  indexNodes,
  isDocument,
} from "../model/tree";
import {
  useCreateFile,
  useFavorites,
  useFileTree,
  useMoveFile,
  useEpisodeMutations,
  useRenameFile,
  useSetFavorite,
  useTrashFile,
} from "../queries";
import { useWorkspace } from "../workspace-context";
import { DRAG_MIME, FileTree, type TreeEdit } from "./file-tree";
import { GraphRefreshItem } from "./graph-refresh-item";
import { HelpMenu } from "./help-menu";
import { ProjectSwitcher } from "./project-switcher";
import styles from "./sidebar.module.css";

const PRIMARY_NAV: Array<{
  kind: WorkspaceViewKind;
  label: string;
  icon: IconName;
}> = [
  { kind: "graph", label: "그래프", icon: "waypoints" },
  { kind: "timeline", label: "타임라인", icon: "chart-no-axes-gantt" },
  { kind: "memo", label: "메모", icon: "notebook-pen" },
];

const UTILITY_NAV: Array<{
  kind: WorkspaceViewKind;
  label: string;
  icon: IconName;
}> = [
  { kind: "trash", label: "휴지통", icon: "trash-2" },
  { kind: "settings", label: "설정", icon: "settings" },
];

type PendingDialog =
  | { kind: "trash"; node: FileNode }
  | { kind: "episode"; node: FolderNode }
  | { kind: "section"; node: FolderNode; files: number; folders: number }
  | null;

function SectionHeader({
  title,
  entries,
  onDrop,
}: {
  title: string;
  /** 없으면 더보기 버튼을 그리지 않는다. 즐겨찾기처럼 더할 것이 없는 묶음이 그렇다. */
  entries?: () => MenuEntry[];
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  return (
    <div
      className={styles.sectionHeader}
      data-drop-target={over || undefined}
      onDragOver={(event) => {
        if (!onDrop || !event.dataTransfer.types.includes(DRAG_MIME)) return;
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        setOver(false);
        onDrop?.(event);
      }}
    >
      <span className={styles.sectionTitle}>{title}</span>
      {entries && (
        <IconButton
          ref={ref}
          icon="ellipsis"
          iconSize={15}
          label={`${title} 더보기`}
          className={styles.sectionMore}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        />
      )}
      {entries && open && (
        <Menu
          anchorRef={ref}
          open={open}
          onOpenChange={setOpen}
          label={`${title} 메뉴`}
          placement="right-start"
          entries={entries()}
        />
      )}
    </div>
  );
}

export function WorkspaceSidebar() {
  const toast = useToast();
  const { projectId, user, open, dispatch, activePane, activeFileId } =
    useWorkspace();
  const tree = useFileTree(projectId);
  const favorites = useFavorites(projectId);
  const setFavorite = useSetFavorite(projectId);
  const create = useCreateFile(projectId);
  const rename = useRenameFile(projectId);
  const move = useMoveFile(projectId);
  const trash = useTrashFile(projectId);
  const episodes = useEpisodeMutations(projectId);

  const nodes = useMemo(() => tree.data ?? [], [tree.data]);
  const index = useMemo(() => indexNodes(nodes), [nodes]);
  const roots = useMemo(() => buildTree(nodes), [nodes]);
  const fileRoots = roots.filter(
    (item) => item.node.kind === "folder" && item.node.role !== "section",
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<string | null>(null);
  const [edit, setEdit] = useState<TreeEdit | null>(null);
  const [dialog, setDialog] = useState<PendingDialog>(null);
  const [dialogError, setDialogError] = useState(false);
  const activeKind = activeTabOf(activePane).target.kind;

  if (activeFileId && activeFileId !== revealed && index.has(activeFileId)) {
    setRevealed(activeFileId);
    const path = ancestorsOf(index, activeFileId).map((node) => node.id);
    if (!path.every((id) => expanded.has(id))) {
      setExpanded(new Set([...expanded, ...path]));
    }
  }

  const toggle = (id: string, expand?: boolean) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (expand ?? !next.has(id)) next.add(id);
      else next.delete(id);
      return next;
    });

  const failed = (error: unknown, fallback: string) =>
    toast({
      icon: "triangle-alert",
      title: fallback,
      description: isServiceError(error)
        ? error.message
        : "잠시 후 다시 시도해 주세요.",
    });

  const startCreate = (
    parentId: string | null,
    kind: "document" | "folder",
    docType?: DocumentType,
  ) => {
    if (parentId) toggle(parentId, true);
    const parent = parentId ? index.get(parentId) : undefined;
    if (kind === "document") {
      const meta = DOCUMENT_TYPE_META[docType ?? "manuscript"];
      setEdit({
        mode: "create",
        parentId,
        kind,
        docType,
        icon: meta.entityIcon,
        defaultTitle: `새 ${meta.label}`,
      });
      return;
    }
    const episode = parent?.kind === "folder" && parent.role === "category";
    setEdit({
      mode: "create",
      parentId,
      kind,
      icon: "folder",
      defaultTitle: episode ? "새 에피소드" : "새 폴더",
    });
  };

  const commitEdit = (title: string) => {
    const current = edit;
    setEdit(null);
    if (!current) return;
    if (current.mode === "rename") {
      if (title === current.defaultTitle) return;
      rename.mutate(
        { fileId: current.nodeId, title },
        { onError: (error) => failed(error, "이름을 바꾸지 못했어요.") },
      );
      return;
    }
    create.mutate(
      {
        parentId: current.parentId,
        kind: current.kind,
        title,
        docType: current.docType,
      },
      {
        onSuccess: (node) => {
          if (isDocument(node)) open({ kind: "file", fileId: node.id });
        },
        onError: (error) => failed(error, "만들지 못했어요."),
      },
    );
  };

  const createEntries = (parentId: string): MenuEntry[] =>
    DOCUMENT_TYPES.map((type) => ({
      id: `create-${type}`,
      label: DOCUMENT_TYPE_META[type].label,
      icon: DOCUMENT_TYPE_META[type].entityIcon,
      onSelect: () => {
        const parent = index.get(parentId);
        const target =
          parent?.kind === "folder" &&
          parent.role === "category" &&
          parent.category !== type
            ? (nodes.find(
                (n) =>
                  n.kind === "folder" &&
                  n.role === "category" &&
                  n.category === type,
              )?.id ?? parentId)
            : parentId;
        startCreate(target, "document", type);
      },
    }));

  const manuscriptRoot = nodes.find(
    (n): n is FolderNode =>
      n.kind === "folder" &&
      n.role === "category" &&
      n.category === "manuscript",
  );

  const filesMenu = (): MenuEntry[] => [
    ...createEntries(manuscriptRoot?.id ?? ""),
  ];

  const rowMenu = (node: FileNode): MenuEntry[] => {
    const favorite = (favorites.data ?? []).includes(node.id);
    if (node.kind === "folder" && node.role === "category") {
      return [
        ...(node.category === "manuscript"
          ? [
              {
                id: "episode",
                label: "에피소드 추가",
                icon: "folder-plus" as const,
                onSelect: () => startCreate(node.id, "folder"),
              },
            ]
          : []),
        {
          id: "create",
          label: `${DOCUMENT_TYPE_META[node.category ?? "manuscript"].label} 추가`,
          icon: "file-plus",
          onSelect: () =>
            startCreate(node.id, "document", node.category ?? "manuscript"),
        },
      ];
    }
    if (node.kind === "folder" && node.role === "episode") {
      return [
        {
          id: "create",
          label: "원고 추가",
          icon: "file-plus",
          onSelect: () => startCreate(node.id, "document", "manuscript"),
        },
        { type: "separator", id: "s1" },
        {
          id: "rename",
          label: "이름 변경",
          icon: "pencil",
          onSelect: () =>
            setEdit({
              mode: "rename",
              nodeId: node.id,
              icon: "folder",
              defaultTitle: node.title,
            }),
        },
        {
          id: "delete",
          label: "에피소드 폴더 삭제",
          icon: "trash-2",
          onSelect: () => {
            setDialogError(false);
            setDialog({ kind: "episode", node });
          },
        },
      ];
    }
    if (node.kind === "folder") {
      return [
        ...createEntries(node.id),
        { type: "separator", id: "s1" },
        {
          id: "rename",
          label: "이름 변경",
          icon: "pencil",
          onSelect: () =>
            setEdit({
              mode: "rename",
              nodeId: node.id,
              icon: "folder",
              defaultTitle: node.title,
            }),
        },
        { type: "separator", id: "s2" },
        {
          id: "trash",
          label: "휴지통으로 이동",
          icon: "trash-2",
          onSelect: () => setDialog({ kind: "trash", node }),
        },
      ];
    }
    return [
      {
        id: "side",
        label: "옆에 열기",
        icon: "panels-top-left",
        onSelect: () =>
          open({ kind: "file", fileId: node.id }, { toSide: true }),
      },
      {
        id: "favorite",
        label: favorite ? "즐겨찾기에서 제거" : "즐겨찾기에 추가",
        icon: "star",
        onSelect: () =>
          setFavorite.mutate({ fileId: node.id, favorite: !favorite }),
      },
      {
        id: "rename",
        label: "이름 변경",
        icon: "pencil",
        onSelect: () =>
          setEdit({
            mode: "rename",
            nodeId: node.id,
            icon: DOCUMENT_TYPE_META[node.docType].entityIcon,
            defaultTitle: node.title,
          }),
      },
      { type: "separator", id: "s1" },
      {
        id: "trash",
        label: "휴지통으로 이동",
        icon: "trash-2",
        onSelect: () => setDialog({ kind: "trash", node }),
      },
    ];
  };

  const canDrag = (node: FileNode) =>
    !(
      node.kind === "folder" &&
      (node.role === "category" || node.role === "section")
    );

  const dropNode = (dragId: string, target: FileNode) =>
    move.mutate(
      { fileId: dragId, parentId: target.id, beforeId: null },
      { onError: (error) => failed(error, "옮기지 못했어요.") },
    );

  const confirmDialog = () => {
    if (!dialog) return;
    const done = () => {
      setDialog(null);
      setDialogError(false);
    };
    if (dialog.kind === "trash") {
      const ids = [dialog.node.id, ...descendantIds(index, dialog.node.id)];
      trash.mutate(dialog.node.id, {
        onSuccess: () => {
          dispatch({ type: "closeFiles", fileIds: ids });
          toast({
            icon: "trash-2",
            title: "휴지통으로 옮겼어요.",
            description: `‘${dialog.node.title}’은 휴지통에서 복원할 수 있어요.`,
          });
          done();
        },
        onError: () => setDialogError(true),
      });
    } else if (dialog.kind === "episode") {
      episodes.removeEpisode.mutate(dialog.node.id, {
        onSuccess: done,
        onError: () => setDialogError(true),
      });
    }
  };

  const busy = trash.isPending || episodes.removeEpisode.isPending;
  const favoriteNodes = (favorites.data ?? [])
    .map((id) => index.get(id))
    .filter(isDocument);

  const treeProps = {
    expanded,
    selectedId: activeFileId,
    edit,
    onToggle: toggle,
    onOpen: (node: FileNode) => open({ kind: "file", fileId: node.id }),
    rowMenu,
    canDrag,
    onDropNode: dropNode,
    onCommitEdit: commitEdit,
    onCancelEdit: () => setEdit(null),
  };

  return (
    <nav className={styles.sidebar} aria-label="작업공간">
      <UserMenu user={user} />
      <ProjectSwitcher />
      <div className={styles.nav}>
        {PRIMARY_NAV.map((item) => (
          <SidebarButton
            key={item.kind}
            icon={item.icon}
            label={item.label}
            selected={activeKind === item.kind}
            onClick={() => open({ kind: item.kind })}
          />
        ))}
      </div>
      <div className={styles.nav}>
        <div className={styles.divider} />
        <GraphRefreshItem />
      </div>
      <div className={styles.scroll}>
        <section className={styles.section} aria-label="즐겨찾기">
          <SectionHeader
            title="즐겨찾기"
            onDrop={(event) => {
              const dragId = event.dataTransfer.getData(DRAG_MIME);
              if (dragId && isDocument(index.get(dragId))) {
                event.preventDefault();
                setFavorite.mutate({ fileId: dragId, favorite: true });
              }
            }}
          />
          {favoriteNodes.length === 0 ? (
            <p className={styles.empty}>
              문서의 별을 눌러 즐겨찾기에 추가하세요.
            </p>
          ) : (
            favoriteNodes.map((node) => (
              <SidebarButton
                key={node.id}
                icon={DOCUMENT_TYPE_META[node.docType].entityIcon}
                label={node.title}
                selected={node.id === activeFileId}
                onClick={() => open({ kind: "file", fileId: node.id })}
              />
            ))
          )}
        </section>
        <section className={styles.section} aria-label="파일">
          <SectionHeader title="파일" entries={filesMenu} />
          <FileTree items={fileRoots} label="파일" {...treeProps} />
        </section>
      </div>
      <div className={styles.utility}>
        {UTILITY_NAV.map((item) => (
          <SidebarButton
            key={item.kind}
            icon={item.icon}
            label={item.label}
            selected={activeKind === item.kind}
            onClick={() => open({ kind: item.kind })}
          />
        ))}
        <HelpMenu selected={activeKind === "help"} />
      </div>

      <DialogCard
        open={dialog?.kind === "trash"}
        onClose={() => !busy && setDialog(null)}
        title="휴지통으로 옮길까요?"
        description="휴지통에서 원래 위치로 복원할 수 있어요."
        target={
          dialog?.kind === "trash"
            ? {
                icon: isDocument(dialog.node)
                  ? DOCUMENT_TYPE_META[dialog.node.docType].entityIcon
                  : "folder",
                name: dialog.node.title,
              }
            : undefined
        }
        actions={
          <>
            <Button
              size="md"
              icon="x"
              onClick={() => setDialog(null)}
              disabled={busy}
            >
              취소
            </Button>
            <Button
              size="md"
              variant="primary"
              icon="trash-2"
              busy={busy}
              onClick={confirmDialog}
            >
              휴지통으로 이동
            </Button>
          </>
        }
      >
        {dialogError && (
          <InlineNotice icon="circle-alert">
            휴지통으로 옮기지 못했어요. 다시 시도해 주세요.
          </InlineNotice>
        )}
      </DialogCard>

      <DialogCard
        open={dialog?.kind === "episode"}
        onClose={() => !busy && setDialog(null)}
        title="에피소드 폴더를 삭제할까요?"
        description="폴더만 사라지고 안에 있던 회차는 원고 폴더로 돌아갑니다."
        target={
          dialog?.kind === "episode"
            ? { icon: "folder", name: dialog.node.title }
            : undefined
        }
        actions={
          <>
            <Button
              size="md"
              icon="x"
              onClick={() => setDialog(null)}
              disabled={busy}
            >
              취소
            </Button>
            <Button
              size="md"
              variant="primary"
              icon="trash-2"
              busy={busy}
              onClick={confirmDialog}
            >
              영구 삭제
            </Button>
          </>
        }
      >
        {dialogError && (
          <InlineNotice icon="circle-alert">
            에피소드 폴더를 삭제하지 못했어요. 다시 시도해 주세요.
          </InlineNotice>
        )}
      </DialogCard>

      <DialogCard
        open={dialog?.kind === "section"}
        onClose={() => !busy && setDialog(null)}
        title={
          dialogError
            ? "섹션을 삭제하지 못했습니다"
            : `${dialog?.kind === "section" ? dialog.node.title : ""} 섹션을 삭제할까요?`
        }
        description={
          dialog?.kind !== "section"
            ? undefined
            : dialogError
              ? `${dialog.node.title}와 내부 항목은 변경되지 않았습니다. 잠시 후 다시 시도해 주세요.`
              : `파일 ${dialog.files}개와 폴더 ${dialog.folders}개는 파일 > ${dialog.node.title}로 이동합니다.`
        }
        target={
          dialog?.kind === "section"
            ? {
                icon: "folder",
                name: dialogError
                  ? `${dialog.node.title} · 파일 ${dialog.files}개 · 폴더 ${dialog.folders}개`
                  : `파일 / ${dialog.node.title} · 총 ${dialog.files + dialog.folders}개 항목`,
              }
            : undefined
        }
        actions={
          <>
            <Button
              size="md"
              icon="x"
              onClick={() => setDialog(null)}
              disabled={busy}
            >
              취소
            </Button>
            <Button
              size="md"
              variant="primary"
              icon={dialogError ? "refresh-cw" : "trash-2"}
              busy={busy}
              onClick={confirmDialog}
            >
              {dialogError ? "다시 시도" : "섹션 삭제"}
            </Button>
          </>
        }
      />
    </nav>
  );
}
