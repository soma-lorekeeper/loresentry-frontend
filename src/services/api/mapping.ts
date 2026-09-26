import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import type { IconName } from "@/design-system/icons/icon";
import type { DocumentProperty } from "@/domain/models";

/**
 * 서버의 기본 분류 코드와 화면의 문서 종류는 이름이 다르다 — `place` 는 `LOCATION` 이다.
 * 대문자 변환으로 유추하지 않고 표로 둔다. 한 글자라도 어긋나면 잘못된 폴더에 문서가 생긴다.
 */
const FOLDER_CODE_BY_TYPE: Record<DocumentType, string> = {
  manuscript: "MANUSCRIPT",
  character: "CHARACTER",
  place: "LOCATION",
  organization: "ORGANIZATION",
  item: "ITEM",
  event: "EVENT",
  worldview: "WORLDVIEW",
};

const TYPE_BY_FOLDER_CODE: Record<string, DocumentType> = Object.fromEntries(
  Object.entries(FOLDER_CODE_BY_TYPE).map(([type, code]) => [
    code,
    type as DocumentType,
  ]),
) as Record<string, DocumentType>;

export function folderCodeOf(type: DocumentType): string {
  return FOLDER_CODE_BY_TYPE[type];
}

export function documentTypeOf(folderCode: string): DocumentType {
  return TYPE_BY_FOLDER_CODE[folderCode] ?? "worldview";
}

/**
 * 분류 폴더는 서버에 행이 없다. 전역 시드이고 프로젝트마다 복제되지 않기 때문이다
 * (`CONTENT_PROJECT_API.md` §3.2). 그래서 트리에 쓸 id 는 화면이 만들고, 서버로 돌려보낼 때
 * 다시 코드로 바꾼다. 이 두 함수 말고 어디서도 이 id 모양을 알 필요가 없다.
 */
const CATEGORY_PREFIX = "category:";

export function categoryNodeId(folderCode: string): string {
  return `${CATEGORY_PREFIX}${folderCode}`;
}

export function folderCodeOfNodeId(nodeId: string | null): string | null {
  if (!nodeId || !nodeId.startsWith(CATEGORY_PREFIX)) return null;
  return nodeId.slice(CATEGORY_PREFIX.length);
}

export function isCategoryNodeId(nodeId: string | null): boolean {
  return folderCodeOfNodeId(nodeId) !== null;
}

/** 서버가 주는 텍스트 속성 한 줄. */
export interface ApiTextProperty {
  key: string;
  value: string;
}

export interface ApiRelation {
  relation_key: string;
  target_document_id: string;
}

/**
 * 관계 키와 대상 문서 종류의 대응. 서버는 `relation_key` 문자열만 저장하고 어떤 종류를 가리키는지는
 * 모른다. 화면이 칩을 그리려면 종류를 알아야 하므로 여기서 정한다.
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
) as Record<string, DocumentType>;

export function relationKeyOf(type: DocumentType): string {
  return RELATION_KEY_BY_TYPE[type];
}

/**
 * 화면이 모르는 관계 키의 행들. {@link toProperties} 가 이것들을 버리므로, 저장할 때 다시 실어
 * 보내지 않으면 **다음 저장이 서버에서 그 관계를 지운다.** 화면은 자기가 모르는 관계를 지울
 * 권한이 없다 — AI 최신화처럼 다른 곳이 쓴 것일 수 있다.
 */
export function unknownRelations(relations: ApiRelation[]): ApiRelation[] {
  return relations.filter(
    (relation) => !TYPE_BY_RELATION_KEY[relation.relation_key],
  );
}

/**
 * 서버의 두 목록(텍스트 속성, 관계)을 화면의 속성 한 목록으로 합친다.
 * `label` 은 저장하지 않는 값이므로 키에서 되살린다.
 */
export function toProperties(
  texts: ApiTextProperty[],
  relations: ApiRelation[],
): DocumentProperty[] {
  const properties: DocumentProperty[] = texts.map((text) => ({
    id: `text:${text.key}`,
    kind: "text",
    key: text.key,
    label: textPropertyLabel(text.key),
    value: text.value,
  }));

  // 같은 관계 키의 칩들을 하나의 관계 속성으로 모은다. 서버는 칩마다 한 행이다.
  const grouped = new Map<string, string[]>();
  for (const relation of relations) {
    const targets = grouped.get(relation.relation_key) ?? [];
    targets.push(relation.target_document_id);
    grouped.set(relation.relation_key, targets);
  }

  for (const [key, targetIds] of grouped) {
    const targetType = TYPE_BY_RELATION_KEY[key];
    if (!targetType) continue;
    properties.push({
      id: `relation:${key}`,
      kind: "relation",
      key,
      label: DOCUMENT_TYPE_META[targetType].relationLabel,
      targetType,
      targetIds,
    });
  }

  return properties;
}

/** 화면의 속성 목록을 서버의 두 목록으로 되돌린다. */
export function fromProperties(properties: DocumentProperty[]): {
  properties: ApiTextProperty[];
  relations: ApiRelation[];
} {
  const texts: ApiTextProperty[] = [];
  const relations: ApiRelation[] = [];

  for (const property of properties) {
    if (property.kind === "text") {
      texts.push({ key: property.key, value: property.value });
      continue;
    }
    for (const targetId of property.targetIds) {
      relations.push({
        relation_key: property.key,
        target_document_id: targetId,
      });
    }
  }

  return { properties: texts, relations };
}

const TEXT_PROPERTY_LABELS: Record<string, string> = {
  description: "설명",
  alias: "별칭",
};

function textPropertyLabel(key: string): string {
  return TEXT_PROPERTY_LABELS[key] ?? key;
}

/**
 * 프로젝트 아이콘은 서버에 두지 않기로 했다(`CONTENT_PROJECT_API.md` §9-3). 사용자가 고르는 UI 가
 * 없으므로 id 에서 결정론적으로 고른다 — 같은 프로젝트는 언제 열어도 같은 아이콘이다.
 */
const PROJECT_ICONS: IconName[] = [
  "book-open",
  "sparkles",
  "library",
  "orbit",
  "notebook-tabs",
];

export function projectIconOf(projectId: string): IconName {
  let hash = 0;
  for (let i = 0; i < projectId.length; i++) {
    hash = (hash * 31 + projectId.charCodeAt(i)) % 100000;
  }
  return PROJECT_ICONS[hash % PROJECT_ICONS.length];
}
