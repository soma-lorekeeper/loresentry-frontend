"use client";

import {
  type CSSProperties,
  type DragEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import { Menu, MenuItem } from "@/components/ui";

import { WorkspaceIcon } from "../icons";
import {
  fileItems as initialFileItems,
  primaryNavigation,
  type ProjectSummary,
  utilityNavigation,
  type WorkspaceNavItem,
} from "../workspace-data";
import styles from "./workspace.module.css";

const fileTypes = [
  "원고",
  "설정",
  "캐릭터",
  "이벤트",
  "조직",
  "아이템",
  "장소",
  "세계관",
];

interface EditState {
  itemId: string;
  mode: "create" | "rename";
  originalLabel?: string;
}

interface SidebarItemProps {
  item: WorkspaceNavItem;
  onSelect: (item: WorkspaceNavItem) => void;
  selected: boolean;
}

function SidebarItem({ item, onSelect, selected }: SidebarItemProps) {
  return (
    <button
      aria-current={selected ? "page" : undefined}
      aria-label={item.label}
      className={styles.sidebarItem}
      data-level={item.level ?? 0}
      data-selected={selected || undefined}
      onClick={() => onSelect(item)}
      type="button"
    >
      <WorkspaceIcon className={styles.itemIcon} name={item.icon} />
      <span className={styles.itemLabel}>{item.label}</span>
      {selected && <span className={styles.srOnly}>선택됨</span>}
    </button>
  );
}

interface SectionMenuProps {
  kind: "favorites" | "files";
  onCreate: (kind: "file" | "folder", fileType?: string) => void;
}

function SectionMenu({ kind, onCreate }: SectionMenuProps) {
  const isFavorites = kind === "favorites";
  const label = isFavorites ? "즐겨찾기" : "파일";

  return (
    <Menu
      buttonContent={<WorkspaceIcon name="ellipsis" />}
      buttonLabel={`${label} 메뉴`}
      className={styles.sectionMenu}
      triggerClassName={styles.moreButton}
    >
      {!isFavorites &&
        fileTypes.map((fileType) => (
          <MenuItem key={fileType} onClick={() => onCreate("file", fileType)}>
            {fileType}
          </MenuItem>
        ))}
      {!isFavorites && (
        <div className={styles.menuSeparator} role="separator" />
      )}
      <MenuItem onClick={() => onCreate("folder")}>새 폴더</MenuItem>
      {!isFavorites && <MenuItem>가져오기</MenuItem>}
      <MenuItem>이름 변경</MenuItem>
      <div className={styles.menuSeparator} role="separator" />
      <MenuItem>섹션 추가</MenuItem>
    </Menu>
  );
}

interface ItemMenuProps {
  item: WorkspaceNavItem;
  onCreate: (
    parentId: string,
    kind: "file" | "folder",
    fileType?: string,
  ) => void;
  onRename: (item: WorkspaceNavItem) => void;
  onTrash: (item: WorkspaceNavItem) => void;
}

function ItemMenu({ item, onCreate, onRename, onTrash }: ItemMenuProps) {
  const isFolder = item.kind === "folder";
  return (
    <Menu
      buttonContent={<WorkspaceIcon name="ellipsis" />}
      buttonLabel={`${item.label} 더보기`}
      className={styles.itemMenu}
      triggerClassName={styles.itemMoreButton}
    >
      {isFolder &&
        fileTypes.map((fileType) => (
          <MenuItem
            key={fileType}
            onClick={() => onCreate(item.id, "file", fileType)}
          >
            {fileType}
          </MenuItem>
        ))}
      {isFolder && <div className={styles.menuSeparator} role="separator" />}
      {isFolder && (
        <MenuItem onClick={() => onCreate(item.id, "folder")}>새 폴더</MenuItem>
      )}
      {isFolder && <MenuItem>가져오기</MenuItem>}
      <MenuItem onClick={() => onRename(item)}>이름 변경</MenuItem>
      <div className={styles.menuSeparator} role="separator" />
      <MenuItem className={styles.dangerMenuItem} onClick={() => onTrash(item)}>
        휴지통으로 이동
      </MenuItem>
    </Menu>
  );
}

function collectDescendantIds(items: WorkspaceNavItem[], rootId: string) {
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
        ids.add(item.id);
        changed = true;
      }
    }
  }
  return ids;
}

function isInvalidFolderTarget(
  items: WorkspaceNavItem[],
  sourceId: string,
  targetId: string,
) {
  return collectDescendantIds(items, sourceId).has(targetId);
}

export interface WorkspaceSidebarProps {
  currentProject: ProjectSummary;
  onProjectSelect: (project: ProjectSummary) => void;
  onRename: (contentId: string, label: string) => void;
  onSelect: (item: WorkspaceNavItem) => void;
  onTrash: (contentIds: string[]) => void;
  projects: ProjectSummary[];
  selectedId: string;
  userName: string;
}

export function WorkspaceSidebar({
  currentProject,
  onProjectSelect,
  onRename,
  onSelect,
  onTrash,
  projects,
  selectedId,
  userName,
}: WorkspaceSidebarProps) {
  const [items, setItems] = useState(initialFileItems);
  const [favoriteSourceIds, setFavoriteSourceIds] = useState([
    "file-manuscript-12",
  ]);
  const [expandedFolderIds, setExpandedFolderIds] = useState(
    new Set(["folder-manuscript"]),
  );
  const [editing, setEditing] = useState<EditState | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const counterRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) requestAnimationFrame(() => inputRef.current?.focus());
  }, [editing]);

  const beginCreate = (
    parentId: string | undefined,
    kind: "file" | "folder",
    fileType?: string,
  ) => {
    counterRef.current += 1;
    const item: WorkspaceNavItem = {
      id: `created-${kind}-${counterRef.current}`,
      icon: kind === "folder" ? "folder" : "file",
      kind,
      label: "",
      parentId,
    };
    setItems((current) => [...current, item]);
    if (parentId) {
      setExpandedFolderIds((current) => new Set(current).add(parentId));
    }
    setDraftName(fileType ? `새 ${fileType}` : "새 폴더");
    setEditing({ itemId: item.id, mode: "create" });
  };

  const beginRename = (item: WorkspaceNavItem) => {
    setDraftName(item.label);
    setEditing({ itemId: item.id, mode: "rename", originalLabel: item.label });
  };

  const cancelEdit = () => {
    if (editing?.mode === "create") {
      setItems((current) =>
        current.filter((item) => item.id !== editing.itemId),
      );
    }
    setEditing(null);
    setDraftName("");
  };

  const commitEdit = () => {
    if (!editing || !draftName.trim()) return;
    setItems((current) =>
      current.map((item) => {
        if (item.id !== editing.itemId) return item;
        return { ...item, label: draftName.trim() };
      }),
    );
    const previous = items.find((item) => item.id === editing.itemId);
    if (previous) {
      onRename(previous.contentId ?? previous.id, draftName.trim());
      if (editing.mode === "create" && previous.kind === "file") {
        onSelect({ ...previous, label: draftName.trim() });
      }
    }
    setEditing(null);
    setDraftName("");
    setAnnouncement(
      editing.mode === "create"
        ? `${draftName.trim()}을 만들었습니다.`
        : `${editing.originalLabel}의 이름을 ${draftName.trim()}으로 변경했습니다.`,
    );
  };

  const handleEditKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitEdit();
    } else if (event.key === "Escape") {
      event.preventDefault();
      cancelEdit();
    }
  };

  const trashItem = (item: WorkspaceNavItem) => {
    const removedIds = collectDescendantIds(items, item.id);
    const removedItems = items.filter((candidate) =>
      removedIds.has(candidate.id),
    );
    const contentIds = removedItems.map(
      (candidate) => candidate.contentId ?? candidate.id,
    );
    setItems((current) =>
      current.filter((candidate) => !removedIds.has(candidate.id)),
    );
    setFavoriteSourceIds((current) =>
      current.filter((sourceId) => !removedIds.has(sourceId)),
    );
    onTrash(contentIds);
    setAnnouncement(`${item.label}을 휴지통으로 이동했습니다.`);
  };

  const moveItem = (sourceId: string, parentId?: string) => {
    const source = items.find((item) => item.id === sourceId);
    if (!source || source.parentId === parentId) return;
    if (parentId && isInvalidFolderTarget(items, sourceId, parentId)) {
      setAnnouncement("해당 폴더로는 이동할 수 없습니다.");
      return;
    }
    setItems((current) =>
      current.map((item) =>
        item.id === sourceId ? { ...item, parentId } : item,
      ),
    );
    setAnnouncement(`${source.label}의 위치를 이동했습니다.`);
  };

  const dragId = (event: DragEvent) =>
    event.dataTransfer.getData("text/workspace-item") || draggingId;

  const dropOnFolder = (event: DragEvent, folderId: string) => {
    event.preventDefault();
    event.stopPropagation();
    const sourceId = dragId(event);
    if (sourceId) moveItem(sourceId, folderId);
    setDropTargetId(null);
    setDraggingId(null);
  };

  const dropOnFiles = (event: DragEvent) => {
    event.preventDefault();
    const sourceId = dragId(event);
    if (sourceId) moveItem(sourceId);
    setDropTargetId(null);
    setDraggingId(null);
  };

  const dropOnFavorites = (event: DragEvent) => {
    event.preventDefault();
    const sourceId = dragId(event);
    if (sourceId && items.some((item) => item.id === sourceId)) {
      setFavoriteSourceIds((current) =>
        current.includes(sourceId) ? current : [...current, sourceId],
      );
      const source = items.find((item) => item.id === sourceId);
      setAnnouncement(`${source?.label ?? "항목"}을 즐겨찾기에 추가했습니다.`);
    }
    setDropTargetId(null);
    setDraggingId(null);
  };

  const renderTree = (parentId?: string, level = 0) =>
    items
      .filter((item) => item.parentId === parentId)
      .map((item) => {
        const isFolder = item.kind === "folder";
        const expanded = isFolder && expandedFolderIds.has(item.id);
        const isEditing = editing?.itemId === item.id;
        const validDropTarget =
          isFolder &&
          draggingId !== null &&
          !isInvalidFolderTarget(items, draggingId, item.id);
        return (
          <div className={styles.treeBranch} key={item.id}>
            <div
              className={styles.treeItemRow}
              data-dragging={draggingId === item.id || undefined}
              data-drop-target={dropTargetId === item.id || undefined}
              data-item-id={item.id}
              data-parent-id={item.parentId}
              draggable={!isEditing}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTargetId(null);
              }}
              onDragStart={(event) => {
                event.dataTransfer.setData("text/workspace-item", item.id);
                setDraggingId(item.id);
              }}
              onDragOver={(event) => {
                if (!validDropTarget) return;
                event.preventDefault();
                event.stopPropagation();
                setDropTargetId(item.id);
              }}
              onDrop={(event) =>
                validDropTarget && dropOnFolder(event, item.id)
              }
              style={{ "--tree-level": level } as CSSProperties}
            >
              {isFolder ? (
                <button
                  aria-expanded={expanded}
                  aria-label={`${item.label} 폴더 ${expanded ? "접기" : "펼치기"}`}
                  className={styles.folderToggle}
                  onClick={() =>
                    setExpandedFolderIds((current) => {
                      const next = new Set(current);
                      if (next.has(item.id)) next.delete(item.id);
                      else next.add(item.id);
                      return next;
                    })
                  }
                  type="button"
                >
                  <WorkspaceIcon name="chevron" />
                </button>
              ) : (
                <span
                  aria-hidden="true"
                  className={styles.folderToggleSpacer}
                />
              )}
              {isEditing ? (
                <div className={styles.inlineEdit}>
                  <WorkspaceIcon className={styles.itemIcon} name={item.icon} />
                  <input
                    aria-invalid={!draftName.trim() || undefined}
                    aria-label={
                      editing.mode === "create"
                        ? "새 항목 이름"
                        : `${editing.originalLabel} 새 이름`
                    }
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={handleEditKeyDown}
                    ref={inputRef}
                    value={draftName}
                  />
                  <span className={styles.srOnly}>
                    Enter로 저장, Escape로 취소
                  </span>
                </div>
              ) : (
                <button
                  aria-current={selectedId === item.id ? "page" : undefined}
                  aria-label={item.label}
                  className={styles.treeItemButton}
                  data-selected={selectedId === item.id || undefined}
                  onClick={() => onSelect(item)}
                  onDoubleClick={() => beginRename(item)}
                  type="button"
                >
                  <WorkspaceIcon className={styles.itemIcon} name={item.icon} />
                  <span className={styles.itemLabel}>{item.label}</span>
                  {selectedId === item.id && (
                    <span className={styles.srOnly}>선택됨</span>
                  )}
                </button>
              )}
              {!isEditing && (
                <ItemMenu
                  item={item}
                  onCreate={beginCreate}
                  onRename={beginRename}
                  onTrash={trashItem}
                />
              )}
              {dropTargetId === item.id && (
                <span className={styles.dropHint}>이 폴더로 이동</span>
              )}
            </div>
            {expanded && renderTree(item.id, level + 1)}
          </div>
        );
      });

  const favoriteItems = favoriteSourceIds
    .map((sourceId) => items.find((item) => item.id === sourceId))
    .filter((item): item is WorkspaceNavItem => Boolean(item));

  return (
    <aside aria-label="Workspace 사이드바" className={styles.sidebar}>
      <div className={styles.userSummary}>
        <span aria-hidden="true" className={styles.avatar} />
        <span>{userName}</span>
      </div>

      <Menu
        buttonContent={
          <>
            <WorkspaceIcon name="book" />
            <span className={styles.projectName}>{currentProject.name}</span>
            <WorkspaceIcon className={styles.chevron} name="chevron" />
          </>
        }
        buttonLabel={`프로젝트 전환: ${currentProject.name}`}
        className={styles.projectSwitcher}
        placement="start"
        triggerClassName={styles.projectButton}
      >
        <MenuItem>프로젝트 목록</MenuItem>
        {projects.map((project) => (
          <MenuItem
            key={project.id}
            onClick={() => onProjectSelect(project)}
            selected={project.id === currentProject.id}
          >
            {project.name}
          </MenuItem>
        ))}
      </Menu>

      <nav aria-label="프로젝트 기능" className={styles.primaryNavigation}>
        {primaryNavigation.map((item) => (
          <SidebarItem
            item={item}
            key={item.id}
            onSelect={onSelect}
            selected={item.id === selectedId}
          />
        ))}
      </nav>

      <section
        aria-labelledby="favorites-heading"
        className={styles.sidebarSection}
        data-drop-target={dropTargetId === "favorites" || undefined}
        onDragOver={(event) => {
          if (!draggingId) return;
          event.preventDefault();
          setDropTargetId("favorites");
        }}
        onDrop={dropOnFavorites}
      >
        <div className={styles.sectionHeader}>
          <h2 id="favorites-heading">즐겨찾기</h2>
          <SectionMenu
            kind="favorites"
            onCreate={(kind) => beginCreate(undefined, kind)}
          />
        </div>
        {dropTargetId === "favorites" && (
          <span className={styles.sectionDropHint}>
            여기에 놓아 즐겨찾기에 추가
          </span>
        )}
        <div className={styles.sectionItems}>
          {favoriteItems.map((item) => (
            <div className={styles.favoriteRow} key={item.id}>
              <SidebarItem
                item={{ ...item, id: `favorite-${item.contentId ?? item.id}` }}
                onSelect={onSelect}
                selected={
                  selectedId === `favorite-${item.contentId ?? item.id}`
                }
              />
              <button
                aria-label={`${item.label} 즐겨찾기에서 제거`}
                className={styles.itemMoreButton}
                onClick={() =>
                  setFavoriteSourceIds((current) =>
                    current.filter((id) => id !== item.id),
                  )
                }
                type="button"
              >
                <WorkspaceIcon name="close" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="files-heading"
        className={styles.sidebarSection}
        data-drop-target={dropTargetId === "files" || undefined}
        onDragOver={(event) => {
          if (!draggingId) return;
          event.preventDefault();
          setDropTargetId("files");
        }}
        onDrop={dropOnFiles}
      >
        <div className={styles.sectionHeader}>
          <h2 id="files-heading">파일</h2>
          <SectionMenu
            kind="files"
            onCreate={(kind, fileType) =>
              beginCreate(undefined, kind, fileType)
            }
          />
        </div>
        {dropTargetId === "files" && (
          <span className={styles.sectionDropHint}>
            여기에 놓아 최상위로 이동
          </span>
        )}
        <div className={styles.sectionItems}>{renderTree()}</div>
      </section>

      <nav aria-label="프로젝트 관리" className={styles.utilityNavigation}>
        {utilityNavigation.map((item) => (
          <SidebarItem
            item={item}
            key={item.id}
            onSelect={onSelect}
            selected={item.id === selectedId}
          />
        ))}
      </nav>
      <p aria-live="polite" className={styles.srOnly}>
        {announcement}
      </p>
    </aside>
  );
}
