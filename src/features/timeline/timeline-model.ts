import type { PropertyReference } from "@/features/property/components/property-document";

interface TimelineItemBase {
  description?: string;
  id: string;
  references?: PropertyReference[];
  title: string;
}

export interface DateTimelineItem extends TimelineItemBase {
  date: string;
  time?: string;
  type: "date";
}

export interface OrderTimelineItem extends TimelineItemBase {
  order: number;
  type: "order";
}

export interface UnscheduledTimelineItem extends TimelineItemBase {
  type: "unscheduled";
}

export type TimelineItem =
  DateTimelineItem | OrderTimelineItem | UnscheduledTimelineItem;
export type TimelineItemType = TimelineItem["type"];

export interface TimelineItemDraft {
  date: string;
  description: string;
  id: string;
  order: number;
  references: PropertyReference[];
  time: string;
  title: string;
  type: TimelineItemType;
}

export const timelineTypeLabels: Record<TimelineItemType, string> = {
  date: "날짜·시간",
  order: "순서",
  unscheduled: "미정",
};

function formatDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return `${year}. ${month}. ${day}.`;
}

export function formatTimelineItemTime(item: TimelineItem) {
  if (item.type === "date") {
    return `${formatDate(item.date)}${item.time ? ` · ${item.time}` : ""}`;
  }
  if (item.type === "order") return `순서 ${item.order}`;
  return "시간 미정";
}

export function createTimelineItemDraft(
  id: string,
  item?: TimelineItem,
): TimelineItemDraft {
  return {
    date: item?.type === "date" ? item.date : "",
    description: item?.description ?? "",
    id,
    order: item?.type === "order" ? item.order : 1,
    references: structuredClone(item?.references ?? []),
    time: item?.type === "date" ? (item.time ?? "") : "",
    title: item?.title ?? "",
    type: item?.type ?? "unscheduled",
  };
}

export function isTimelineItemDraftValid(draft: TimelineItemDraft) {
  return Boolean(
    draft.title.trim() &&
    (draft.type !== "date" || /^\d{4}-\d{2}-\d{2}$/.test(draft.date)),
  );
}

export function timelineItemFromDraft(draft: TimelineItemDraft): TimelineItem {
  const optional = {
    ...(draft.description.trim()
      ? { description: draft.description.trim() }
      : {}),
    ...(draft.references.length > 0
      ? { references: structuredClone(draft.references) }
      : {}),
  };
  if (draft.type === "date") {
    return {
      ...optional,
      date: draft.date,
      id: draft.id,
      ...(draft.time ? { time: draft.time } : {}),
      title: draft.title.trim(),
      type: "date",
    };
  }
  if (draft.type === "order") {
    return {
      ...optional,
      id: draft.id,
      order: draft.order,
      title: draft.title.trim(),
      type: "order",
    };
  }
  return {
    ...optional,
    id: draft.id,
    title: draft.title.trim(),
    type: "unscheduled",
  };
}

export function groupTimelineItems(items: TimelineItem[]) {
  const dates = items
    .filter((item): item is DateTimelineItem => item.type === "date")
    .toSorted((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      if (a.time && b.time) return a.time.localeCompare(b.time);
      if (a.time) return -1;
      if (b.time) return 1;
      return 0;
    });
  const orders = items
    .filter((item): item is OrderTimelineItem => item.type === "order")
    .toSorted((a, b) => a.order - b.order);
  const unscheduled = items.filter(
    (item): item is UnscheduledTimelineItem => item.type === "unscheduled",
  );

  return [
    { items: dates, label: timelineTypeLabels.date, type: "date" as const },
    { items: orders, label: timelineTypeLabels.order, type: "order" as const },
    {
      items: unscheduled,
      label: timelineTypeLabels.unscheduled,
      type: "unscheduled" as const,
    },
  ].filter((group) => group.items.length > 0);
}

export const initialTimelineItems: TimelineItem[] = [
  {
    date: "1024-03-18",
    description: "항구의 모든 부유 등대가 동시에 빛을 잃는다.",
    id: "lighthouse-stops",
    references: [{ id: "place", title: "은빛 항구", type: "place" }],
    time: "21:30",
    title: "유리 등대가 멈추다",
    type: "date",
  },
  {
    description: "항해단이 남은 기록으로 임시 항로를 연결한다.",
    id: "memory-route",
    order: 2,
    references: [
      { id: "organization", title: "은빛 항해단", type: "organization" },
    ],
    title: "기억 항로를 복원하다",
    type: "order",
  },
  {
    description: "발생 시점이 확정되지 않은 조사 단계다.",
    id: "fracture-origin",
    references: [
      {
        id: "manuscript-1",
        title: "1장 · 균열의 시작",
        type: "manuscript",
      },
    ],
    title: "균열의 근원을 찾다",
    type: "unscheduled",
  },
];

export function createInitialTimelineItems(documentId: string) {
  return documentId === "event" ? structuredClone(initialTimelineItems) : [];
}
