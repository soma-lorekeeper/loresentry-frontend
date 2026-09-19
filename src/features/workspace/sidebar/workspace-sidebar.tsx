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
  useRenameFile,
  useSectionMutations,
  useSetFavorite,
  useTrashFile,
} from "../queries";
import { IMPORT_ACCEPT, useImportDocument } from "../use-import-document";
import { useWorkspace } from "../workspace-context";
import { DRAG_MIME, FileTree, InlineEditRow, type TreeEdit } from "./file-tree";
import { GraphRefreshItem } from "./graph-refresh-item";
import { ProjectSwitcher } from "./project-switcher";
import styles from "./sidebar.module.css";

const PRIMARY_NAV: Array<{
  kind: WorkspaceViewKind;
  label: string;
  icon: IconName;
}> = [
  { kind: "search", label: "검색", icon: "search" },
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
  { kind: "help", label: "도움말", icon: "circle-help" },
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
  entries: () => MenuEntry[];
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
      {open && (
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
  const sections = useSectionMutations(projectId);
  const importDocument = useImportDocument(projectId);
  const fileInput = useRef<HTMLInputElement>(null);
  const importTarget = useRef<string | null>(null);

  const nodes = useMemo(() => tree.data ?? [], [tree.data]);
  const index = useMemo(() => indexNodes(nodes), [nodes]);
  const roots = useMemo(() => buildTree(nodes), [nodes]);
  const fileRoots = roots.filter(
    (item) => item.node.kind === "folder" && item.node.role !== "section",
  );
  const sectionRoots = roots.filter(
    (item) => item.node.kind === "folder" && item.node.role === "section",
  );

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<string | null>(null);
  const [edit, setEdit] = useState<TreeEdit | null>(null);
  const [dialog, setDialog] = useState<PendingDialog>(null);
  const [sectionEdit, setSectionEdit] = useState<
    { mode: "create" } | { mode: "rename"; id: string; title: string } | null
  >(null);
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

  const commitSection = (title: string) => {
    const current = sectionEdit;
    setSectionEdit(null);
    if (!current) return;
    if (current.mode === "create") {
      sections.create.mutate(title, {
        onError: (error) => failed(error, "섹션을 만들지 못했어요."),
      });
    } else if (title !== current.title) {
      rename.mutate(
        { fileId: current.id, title },
        { onError: (error) => failed(error, "섹션 이름을 바꾸지 못했어요.") },
      );
    }
  };

  const startImport = (parentId: string) => {
    importTarget.current = parentId;
    fileInput.current?.click();
  };

  const createEntries = (parentId: string): MenuEntry[] =>
    DOCUMENT_TYPES.map((type) => ({
      id: `create-${type}`,
      label: DOCUMENT_TYPE_META[type].label,
      icon: DOCUMENT_TYPE_META[type].createIcon,
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
    { type: "separator", id: "s1" },
    {
      id: "folder",
      label: "새 폴더",
      icon: "folder-plus",
      onSelect: () => startCreate(null, "folder"),
    },
    {
      id: "import",
      label: "가져오기",
      icon: "download",
      disabled: !manuscriptRoot,
      onSelect: () => manuscriptRoot && startImport(manuscriptRoot.id),
    },
    { type: "separator", id: "s2" },
    {
      id: "section",
      label: "섹션 추가",
      icon: "list-plus",
      onSelect: () => startSection(),
    },
  ];

  const favoritesMenu = (): MenuEntry[] => [
    {
      id: "section",
      label: "섹션 추가",
      icon: "list-plus",
      onSelect: () => startSection(),
    },
  ];

  const startSection = () => setSectionEdit({ mode: "create" });

  const sectionMenu = (section: FolderNode): MenuEntry[] => [
    ...createEntries(section.id),
    { type: "separator", id: "s1" },
    {
      id: "folder",
      label: "새 폴더",
      icon: "folder-plus",
      onSelect: () => startCreate(section.id, "folder"),
    },
    {
      id: "import",
      label: "가져오기",
      icon: "download",
      onSelect: () => startImport(section.id),
    },
    {
      id: "rename",
      label: "이름 변경",
      icon: "pencil",
      onSelect: () =>
        setSectionEdit({
          mode: "rename",
          id: section.id,
          title: section.title,
        }),
    },
    { type: "separator", id: "s2" },
    {
      id: "section",
      label: "섹션 추가",
      icon: "list-plus",
      onSelect: () => startSection(),
    },
    { type: "separator", id: "s3" },
    {
      id: "delete",
      label: "섹션 삭제",
      icon: "trash-2",
      onSelect: () => {
        const inside = descendantIds(index, section.id).map((id) =>
          index.get(id),
        );
        setDialogError(false);
        setDialog({
          kind: "section",
          node: section,
          files: inside.filter((n) => n?.kind === "document").length,
          folders: inside.filter((n) => n?.kind === "folder").length,
        });
      },
    },
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
        ...(node.category === "manuscript"
          ? [
              {
                id: "import",
                label: "가져오기",
                icon: "download" as const,
                onSelect: () => startImport(node.id),
              },
            ]
          : []),
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
      sections.removeEpisode.mutate(dialog.node.id, {
        onSuccess: done,
        onError: () => setDialogError(true),
      });
    } else {
      sections.remove.mutate(dialog.node.id, {
        onSuccess: done,
        onError: () => setDialogError(true),
      });
    }
  };

  const busy =
    trash.isPending ||
    sections.remove.isPending ||
    sections.removeEpisode.isPending;
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
      <div className={styles.user}>
        <span className={styles.avatar} aria-hidden="true" />
        {user.displayName}
      </div>
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
            entries={favoritesMenu}
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
        {sectionEdit?.mode === "create" && (
          <InlineEditRow
            icon="list-plus"
            defaultTitle="새 섹션"
            depth={0}
            onCommit={commitSection}
            onCancel={() => setSectionEdit(null)}
          />
        )}
        {sectionRoots.map((section) => (
          <section
            key={section.node.id}
            className={styles.section}
            aria-label={section.node.title}
          >
            {sectionEdit?.mode === "rename" &&
            sectionEdit.id === section.node.id ? (
              <InlineEditRow
                icon="list-plus"
                defaultTitle={section.node.title}
                depth={0}
                onCommit={commitSection}
                onCancel={() => setSectionEdit(null)}
              />
            ) : (
              <SectionHeader
                title={section.node.title}
                entries={() => sectionMenu(section.node as FolderNode)}
                onDrop={(event) => {
                  const dragId = event.dataTransfer.getData(DRAG_MIME);
                  if (dragId) {
                    event.preventDefault();
                    dropNode(dragId, section.node);
                  }
                }}
              />
            )}
            <FileTree
              items={section.children}
              label={section.node.title}
              rootDepth={0}
              {...treeProps}
              edit={
                edit?.mode === "create" && edit.parentId === section.node.id
                  ? { ...edit, parentId: null }
                  : edit
              }
            />
          </section>
        ))}
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
      </div>

      <input
        ref={fileInput}
        type="file"
        accept={IMPORT_ACCEPT}
        hidden
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          const parentId = importTarget.current;
          if (!file || !parentId) return;
          toggle(parentId, true);
          const node = await importDocument(file, parentId);
          if (node) open({ kind: "file", fileId: node.id });
        }}
      />

      <DialogCard
        open={dialog?.kind === "trash"}
        onClose={() => !busy && setDialog(null)}
        icon="trash-2"
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
        icon="folder-minus"
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
        icon={dialogError ? "triangle-alert" : "folder-input"}
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
