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

/**
 * 관계 키는 **가리키는 쪽의 분류**를 이름에 담는다. 원고 A 가 캐릭터 B 를 가리키면 A 에 저장되는
 * 키는 `related_character` 이고, 같은 관계를 B 에서 보면 키는 `related_manuscript` 다. 관계에는
 * 방향이 없으므로 서버가 양쪽에 행을 두고, 각 행의 키는 반대쪽 문서의 분류가 정한다.
 *
 * <p>서버의 같은 표(`loresentry-content` 의 `RelationKeys` 와 `base_folders.relation_key`)와 한
 * 글자도 어긋나면 안 된다 — 어긋난 키는 화면에서 아무 속성에도 속하지 않아 조용히 사라진다.
 * 그래서 화면 안에서도 이 표를 한 벌만 둔다.
 *
 * <p>`place` 만 서버의 분류 코드(`LOCATION`)와 이름이 다르다. 분류 이름을 그대로 붙이지 않고 표로
 * 둔 이유다.
 */
const RELATION_KEY_BY_TYPE: Record<DocumentType, string> = {
  manuscript: "related_manuscript",
  character: "related_character",
  place: "related_place",
  organization: "related_organization",
  item: "related_item",
  event: "related_event",
  worldview: "related_worldview",
};

const TYPE_BY_RELATION_KEY: Record<string, DocumentType> = Object.fromEntries(
  Object.entries(RELATION_KEY_BY_TYPE).map(([type, key]) => [
    key,
    type as DocumentType,
  ]),
);

/** 이 분류의 문서를 가리킬 때 쓰는 키. */
export function relationKeyOf(type: DocumentType): string {
  return RELATION_KEY_BY_TYPE[type];
}

/** 이 키가 가리키는 문서의 분류. 화면이 모르는 키면 `undefined` 다. */
export function documentTypeOfRelationKey(
  key: string,
): DocumentType | undefined {
  return TYPE_BY_RELATION_KEY[key];
}
