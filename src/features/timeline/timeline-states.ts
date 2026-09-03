import {
  createTimelineItemDraft,
  initialTimelineItems,
  type TimelineItem,
  type TimelineItemDraft,
} from "./timeline-model";

export const TIMELINE_SCREEN_STATES = [
  {
    id: "timeline-default",
    mode: "default",
    pencilNodeId: "dCMXt",
    screenNumber: 65,
  },
  {
    id: "timeline-empty",
    mode: "empty",
    pencilNodeId: "PeNqe",
    screenNumber: 66,
  },
  {
    id: "timeline-selected",
    mode: "selected",
    pencilNodeId: "EYGdy",
    screenNumber: 67,
  },
  {
    id: "timeline-editing",
    mode: "editing",
    pencilNodeId: "PmbP9",
    screenNumber: 68,
  },
  {
    id: "timeline-delete",
    mode: "delete",
    pencilNodeId: "NcFHe",
    screenNumber: 69,
  },
  {
    id: "timeline-save-error",
    mode: "save-error",
    pencilNodeId: "v90GPC",
    screenNumber: 88,
  },
] as const satisfies ReadonlyArray<{
  id: string;
  mode: TimelineScreenMode;
  pencilNodeId: string;
  screenNumber: number;
}>;

export type TimelineScreenMode =
  "default" | "delete" | "editing" | "empty" | "save-error" | "selected";

export type TimelineStateId = (typeof TIMELINE_SCREEN_STATES)[number]["id"];

export interface TimelineScenario {
  initialDeleteTargetId?: string;
  initialDraft?: TimelineItemDraft;
  initialEditorStatus?: "editing" | "error";
  initialSelectedId?: string;
  items: TimelineItem[];
  stateId: TimelineStateId;
}

export function resolveTimelineStateId(
  value: string | null,
): TimelineStateId | undefined {
  return TIMELINE_SCREEN_STATES.some((state) => state.id === value)
    ? (value as TimelineStateId)
    : undefined;
}

export function createTimelineScenario(
  stateId: TimelineStateId,
): TimelineScenario {
  const state = TIMELINE_SCREEN_STATES.find(
    (candidate) => candidate.id === stateId,
  )!;
  const items =
    state.mode === "empty" ? [] : structuredClone(initialTimelineItems);
  const selected = items[0];

  return {
    ...(state.mode === "delete" && selected
      ? { initialDeleteTargetId: selected.id }
      : {}),
    ...(state.mode === "editing" || state.mode === "save-error"
      ? {
          initialDraft: createTimelineItemDraft(selected.id, selected),
          initialEditorStatus:
            state.mode === "save-error"
              ? ("error" as const)
              : ("editing" as const),
        }
      : {}),
    ...(state.mode !== "default" && state.mode !== "empty" && selected
      ? { initialSelectedId: selected.id }
      : {}),
    items,
    stateId,
  };
}
