"use client";

import {
  PropertyFileChip,
  type PropertyReference,
} from "@/features/property/components/property-document";
import {
  WorkspaceIcon,
  type WorkspaceIconName,
} from "@/features/workspace/icons";

import {
  formatTimelineItemTime,
  groupTimelineItems,
  type TimelineItem,
  type TimelineItemType,
} from "../timeline-model";
import styles from "./event-timeline.module.css";

const timelineTypeIcons: Record<TimelineItemType, WorkspaceIconName> = {
  date: "calendar-days",
  order: "list-ordered",
  unscheduled: "circle-help",
};

interface TimelineItemCardProps {
  item: TimelineItem;
  onMore?: (item: TimelineItem, trigger: HTMLButtonElement) => void;
  onOpenReference?: (reference: PropertyReference) => void;
  onRemoveReference?: (
    item: TimelineItem,
    reference: PropertyReference,
  ) => void;
  onSelect?: (item: TimelineItem) => void;
}

export function TimelineItemCard({
  item,
  onMore,
  onOpenReference,
  onRemoveReference,
  onSelect,
}: TimelineItemCardProps) {
  const timeLabel = formatTimelineItemTime(item);

  return (
    <article className={styles.item} data-timeline-item-id={item.id}>
      <span aria-hidden="true" className={styles.marker}>
        <WorkspaceIcon name={timelineTypeIcons[item.type]} />
      </span>
      <div className={styles.itemBody}>
        <div className={styles.timeRow}>
          <span className={styles.timeLabel}>
            <WorkspaceIcon name={timelineTypeIcons[item.type]} />
            <span>{timeLabel}</span>
          </span>
          <button
            aria-label={`${item.title} 더보기`}
            className={styles.moreButton}
            onClick={(event) => onMore?.(item, event.currentTarget)}
            type="button"
          >
            <WorkspaceIcon name="ellipsis" />
          </button>
        </div>
        <button
          aria-label={`${item.title} 선택`}
          className={styles.itemSelect}
          onClick={() => onSelect?.(item)}
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
                onRemove={
                  onRemoveReference
                    ? () => onRemoveReference(item, reference)
                    : undefined
                }
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
  items: TimelineItem[];
  onAdd?: () => void;
  onMore?: (item: TimelineItem, trigger: HTMLButtonElement) => void;
  onOpenReference?: TimelineItemCardProps["onOpenReference"];
  onRemoveReference?: TimelineItemCardProps["onRemoveReference"];
  onSelect?: (item: TimelineItem) => void;
}

export function EventTimeline({
  items,
  onAdd,
  onMore,
  onOpenReference,
  onRemoveReference,
  onSelect,
}: EventTimelineProps) {
  const groups = groupTimelineItems(items);

  return (
    <section aria-labelledby="event-timeline-heading">
      <header className={styles.header}>
        <h2 id="event-timeline-heading">시간 흐름</h2>
        <button className={styles.addButton} onClick={onAdd} type="button">
          <WorkspaceIcon name="plus" />
          <span>항목 추가</span>
        </button>
      </header>

      {groups.length === 0 ? (
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
                  <TimelineItemCard
                    item={item}
                    key={item.id}
                    onMore={onMore}
                    onOpenReference={onOpenReference}
                    onRemoveReference={onRemoveReference}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
