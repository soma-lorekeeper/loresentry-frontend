"use client";

import { useRef, useState } from "react";

import { Menu, MenuItem } from "@/components/ui";
import {
  PropertyFileChip,
  type PropertyReference,
} from "@/features/property/components/property-document";
import {
  WorkspaceIcon,
  type WorkspaceIconName,
} from "@/features/workspace/icons";

import {
  createTimelineItemDraft,
  formatTimelineItemTime,
  groupTimelineItems,
  timelineItemFromDraft,
  type TimelineItem,
  type TimelineItemDraft,
  type TimelineItemType,
} from "../timeline-model";
import styles from "./event-timeline.module.css";
import { TimelineDeleteDialog } from "./timeline-delete-dialog";
import {
  TimelineItemEditor,
  type TimelineEditorStatus,
} from "./timeline-item-editor";

const timelineTypeIcons: Record<TimelineItemType, WorkspaceIconName> = {
  date: "calendar-days",
  order: "list-ordered",
  unscheduled: "circle-help",
};

interface TimelineItemCardProps {
  item: TimelineItem;
  onDelete: (item: TimelineItem) => void;
  onEdit: (item: TimelineItem) => void;
  onOpenReference?: (reference: PropertyReference) => void;
  onSelect: (item: TimelineItem) => void;
  selected: boolean;
}

export function TimelineItemCard({
  item,
  onDelete,
  onEdit,
  onOpenReference,
  onSelect,
  selected,
}: TimelineItemCardProps) {
  const typeIcon = selected ? "circle-check" : timelineTypeIcons[item.type];
  const timeLabel = formatTimelineItemTime(item);

  return (
    <article
      className={styles.item}
      data-selected={selected || undefined}
      data-timeline-item-id={item.id}
    >
      <span aria-hidden="true" className={styles.marker}>
        <WorkspaceIcon name={typeIcon} />
      </span>
      <div className={styles.itemBody}>
        <div className={styles.timeRow}>
          <span className={styles.timeLabel}>
            <WorkspaceIcon name={timelineTypeIcons[item.type]} />
            <span>{timeLabel}</span>
          </span>
          <Menu
            buttonContent={<WorkspaceIcon name="ellipsis" />}
            buttonLabel={`${item.title} 더보기`}
            triggerClassName={styles.moreButton}
          >
            <MenuItem onClick={() => onEdit(item)}>편집</MenuItem>
            <MenuItem onClick={() => onDelete(item)}>삭제</MenuItem>
          </Menu>
        </div>
        <button
          aria-label={`${item.title} 선택`}
          className={styles.itemSelect}
          id={`timeline-item-${item.id}`}
          onClick={() => onSelect(item)}
          type="button"
        >
          <strong>{item.title}</strong>
          {item.description && <span>{item.description}</span>}
        </button>
        {item.references && item.references.length > 0 && (
          <div
            aria-label={`${item.title} 관련 파일`}
            className={styles.references}
          >
            {item.references.map((reference) => (
              <PropertyFileChip
                key={reference.id}
                onOpen={() => onOpenReference?.(reference)}
                reference={reference}
              />
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export interface EventTimelineProps {
  availableFiles?: PropertyReference[];
  deleteItem?: (itemId: string) => Promise<void>;
  eventTitle?: string;
  items: TimelineItem[];
  onItemsChange?: (items: TimelineItem[]) => void;
  onOpenReference?: TimelineItemCardProps["onOpenReference"];
  saveItem?: (item: TimelineItem) => Promise<void>;
}

export function EventTimeline({
  availableFiles = [],
  deleteItem,
  eventTitle = "사건",
  items,
  onItemsChange,
  onOpenReference,
  saveItem,
}: EventTimelineProps) {
  const [selectedId, setSelectedId] = useState<string>();
  const [draft, setDraft] = useState<TimelineItemDraft>();
  const [isNew, setIsNew] = useState(false);
  const [editorStatus, setEditorStatus] =
    useState<TimelineEditorStatus>("editing");
  const [deleteTarget, setDeleteTarget] = useState<TimelineItem>();
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const newItemCounterRef = useRef(0);
  const groups = groupTimelineItems(items);

  const focusControl = (itemId?: string) => {
    requestAnimationFrame(() =>
      document
        .getElementById(itemId ? `timeline-item-${itemId}` : "timeline-add")
        ?.focus(),
    );
  };

  const openEditor = (item: TimelineItem) => {
    setSelectedId(item.id);
    setDraft(createTimelineItemDraft(item.id, item));
    setIsNew(false);
    setEditorStatus("editing");
  };

  const addItem = () => {
    newItemCounterRef.current += 1;
    const nextOrder =
      Math.max(
        0,
        ...items
          .filter((item) => item.type === "order")
          .map((item) => item.order),
      ) + 1;
    setSelectedId(undefined);
    setDraft({
      ...createTimelineItemDraft(`timeline-new-${newItemCounterRef.current}`),
      order: nextOrder,
    });
    setIsNew(true);
    setEditorStatus("editing");
  };

  const cancelEdit = () => {
    const returnId = isNew ? undefined : draft?.id;
    setDraft(undefined);
    setEditorStatus("editing");
    focusControl(returnId);
  };

  const commitDraft = async () => {
    if (!draft || editorStatus === "saving") return;
    if (!saveItem) {
      setEditorStatus("waiting");
      return;
    }
    setEditorStatus("saving");
    const nextItem = timelineItemFromDraft(draft);
    try {
      await saveItem(nextItem);
      const exists = items.some((item) => item.id === nextItem.id);
      const nextItems = exists
        ? items.map((item) => (item.id === nextItem.id ? nextItem : item))
        : [...items, nextItem];
      onItemsChange?.(nextItems);
      setSelectedId(nextItem.id);
      setDraft(undefined);
      setEditorStatus("editing");
      focusControl(nextItem.id);
    } catch {
      setEditorStatus("error");
    }
  };

  const requestDelete = (item: TimelineItem) => {
    setSelectedId(item.id);
    setDeleteError("");
    setDeleteTarget(item);
  };

  const cancelDelete = () => {
    const returnId = deleteTarget?.id;
    setDeleteTarget(undefined);
    setDeleteError("");
    focusControl(returnId);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    if (!deleteItem) {
      setDeleteError(
        "백엔드 삭제 기능이 연결되지 않았습니다. 시간 항목은 유지됩니다.",
      );
      return;
    }
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteItem(deleteTarget.id);
      const orderedItems = groups.flatMap<TimelineItem>((group) => [
        ...group.items,
      ]);
      const deletedIndex = orderedItems.findIndex(
        (item) => item.id === deleteTarget.id,
      );
      const nextFocus =
        orderedItems[deletedIndex + 1]?.id ??
        orderedItems[deletedIndex - 1]?.id;
      const nextItems = items.filter((item) => item.id !== deleteTarget.id);
      onItemsChange?.(nextItems);
      setSelectedId(nextFocus);
      setDeleteTarget(undefined);
      setDeleting(false);
      focusControl(nextFocus);
    } catch {
      setDeleteError(
        "시간 항목을 삭제하지 못했습니다. 항목을 유지한 채 다시 시도할 수 있습니다.",
      );
      setDeleting(false);
    }
  };

  return (
    <section aria-labelledby="event-timeline-heading">
      <header className={styles.header}>
        <h2 id="event-timeline-heading">시간 흐름</h2>
        <button
          className={styles.addButton}
          id="timeline-add"
          onClick={addItem}
          type="button"
        >
          <WorkspaceIcon name="plus" />
          <span>시간 항목 추가</span>
        </button>
      </header>

      {groups.length === 0 && !draft ? (
        <p className={styles.empty}>아직 시간 항목이 없습니다</p>
      ) : (
        <div className={styles.groups}>
          {groups.map((group) => (
            <section
              aria-labelledby={`timeline-group-${group.type}`}
              className={styles.group}
              data-timeline-group={group.type}
              key={group.type}
            >
              <h3 id={`timeline-group-${group.type}`}>{group.label}</h3>
              <div className={styles.itemList}>
                {group.items.map((item) => (
                  <div key={item.id}>
                    <TimelineItemCard
                      item={item}
                      onDelete={requestDelete}
                      onEdit={openEditor}
                      onOpenReference={onOpenReference}
                      onSelect={(selected) => setSelectedId(selected.id)}
                      selected={selectedId === item.id}
                    />
                    {draft?.id === item.id && !isNew && (
                      <TimelineItemEditor
                        availableFiles={availableFiles}
                        draft={draft}
                        onCancel={cancelEdit}
                        onChange={(nextDraft) => {
                          setDraft(nextDraft);
                          setEditorStatus("editing");
                        }}
                        onComplete={() => void commitDraft()}
                        onOpenReference={onOpenReference}
                        onRetry={() => void commitDraft()}
                        status={editorStatus}
                      />
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
          {draft && isNew && (
            <TimelineItemEditor
              availableFiles={availableFiles}
              draft={draft}
              isNew
              onCancel={cancelEdit}
              onChange={(nextDraft) => {
                setDraft(nextDraft);
                setEditorStatus("editing");
              }}
              onComplete={() => void commitDraft()}
              onOpenReference={onOpenReference}
              onRetry={() => void commitDraft()}
              status={editorStatus}
            />
          )}
        </div>
      )}

      <TimelineDeleteDialog
        deleting={deleting}
        error={deleteError}
        eventTitle={eventTitle}
        onCancel={cancelDelete}
        onConfirm={() => void confirmDelete()}
        target={deleteTarget}
      />
    </section>
  );
}
