import type { IconName } from "@/design-system/icons/icon";
import type { TokenName } from "@/design-system/tokens/tokens";

export const DOCUMENT_TYPES = [
  "manuscript",
  "character",
  "place",
  "organization",
  "item",
  "event",
  "worldview",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const SETTING_DOCUMENT_TYPES = DOCUMENT_TYPES.filter(
  (type): type is Exclude<DocumentType, "manuscript"> => type !== "manuscript",
);

export type SettingDocumentType = (typeof SETTING_DOCUMENT_TYPES)[number];

interface DocumentTypeMeta {
  label: string;
  relationLabel: string;
  entityIcon: IconName;
  createIcon: IconName;
  nodeColor: TokenName;
}

export const DOCUMENT_TYPE_META: Record<DocumentType, DocumentTypeMeta> = {
  manuscript: {
    label: "원고",
    relationLabel: "관련 원고",
    entityIcon: "file-text",
    createIcon: "file-text",
    nodeColor: "color-node-manuscript",
  },
  character: {
    label: "캐릭터",
    relationLabel: "관련 캐릭터",
    entityIcon: "circle-user-round",
    createIcon: "user-round",
    nodeColor: "color-node-character",
  },
  place: {
    label: "장소",
    relationLabel: "관련 장소",
    entityIcon: "map-pin",
    createIcon: "map-pin",
    nodeColor: "color-node-place",
  },
  organization: {
    label: "조직",
    relationLabel: "관련 조직",
    entityIcon: "building-2",
    createIcon: "users-round",
    nodeColor: "color-node-organization",
  },
  item: {
    label: "아이템",
    relationLabel: "관련 아이템",
    entityIcon: "package",
    createIcon: "gem",
    nodeColor: "color-node-item",
  },
  event: {
    label: "이벤트",
    relationLabel: "관련 이벤트",
    entityIcon: "scroll",
    createIcon: "calendar-days",
    nodeColor: "color-node-event",
  },
  worldview: {
    label: "세계관",
    relationLabel: "관련 세계관",
    entityIcon: "globe",
    createIcon: "globe",
    nodeColor: "color-node-worldview",
  },
};

export function isDocumentType(value: unknown): value is DocumentType {
  return (DOCUMENT_TYPES as readonly unknown[]).includes(value);
}
