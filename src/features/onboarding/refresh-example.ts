import { bodyFromParagraphs } from "@/domain/document-body";
import {
  DOCUMENT_TYPE_META,
  relationKeyOf,
  type DocumentType,
} from "@/domain/document-types";
import type {
  DocumentDraft,
  DocumentProperty,
  RefreshProposal,
} from "@/domain/models";
import type { Lookup } from "@/features/graph-refresh/document-compare";
import { initMerge } from "@/features/graph-refresh/merge";
import { t } from "@/i18n";

/*
 * 그래프 최신화 검토의 예시 자료. 예시 작품 "유리 정원의 기록" 의 12화를 쓴 뒤라는 설정이고, 무대의
 * 다른 장면과 같은 이름을 쓴다(scenes.tsx). 서버를 부르지 않는다.
 *
 * <p>두 곳이 같은 자료를 쓴다: 랜딩·온보딩의 예시 화면(refresh-preview.tsx, 보기만 함)과 작업공간
 * 투어의 예시 창(tour/refresh-example.tsx, 화살표와 확정을 해 볼 수 있음).
 */

const LENA = t("무대::레나 아르벨");
const NORTH_GREENHOUSE = t("무대::북쪽 온실");
const LIGHTHOUSE_KEEPERS = t("무대::등대 수호회");
const GLASS_MOUNTAINS = t("무대::유리 산맥");
const SILVER_VOYAGERS = t("무대::은빛 항해단");
const CH12 = t("무대::12화 · 균열의 밤");

const ID = {
  lena: "stage:lena",
  greenhouse: "stage:north-greenhouse",
  keepers: "stage:lighthouse-keepers",
  mountains: "stage:glass-mountains",
  voyagers: "stage:silver-voyagers",
  ch12: "stage:ch-12",
};

/** 무대에 나오는 문서들. 관계 칩이 이름과 종류(아이콘·색)를 여기서 찾는다 */
const DOCUMENTS: Record<string, { title: string; docType: DocumentType }> = {
  [ID.lena]: { title: LENA, docType: "character" },
  [ID.greenhouse]: { title: NORTH_GREENHOUSE, docType: "place" },
  [ID.keepers]: { title: LIGHTHOUSE_KEEPERS, docType: "organization" },
  [ID.mountains]: { title: GLASS_MOUNTAINS, docType: "place" },
  [ID.voyagers]: { title: SILVER_VOYAGERS, docType: "organization" },
  [ID.ch12]: { title: CH12, docType: "manuscript" },
};

export const exampleLookup: Lookup = (id) => {
  const document = DOCUMENTS[id];
  return document
    ? {
        title: document.title,
        icon: DOCUMENT_TYPE_META[document.docType].entityIcon,
        docType: document.docType,
      }
    : null;
};

const description = (value: string): DocumentProperty => ({
  id: "stage:description",
  kind: "text",
  key: "description",
  label: t("무대::설명"),
  value,
});

const relation = (
  type: DocumentType,
  targetIds: string[],
): DocumentProperty => ({
  id: `stage:${type}`,
  kind: "relation",
  key: relationKeyOf(type),
  label: DOCUMENT_TYPE_META[type].relationLabel,
  targetType: type,
  targetIds,
  descriptions: {},
});

const READS_MEMORY = t(
  "무대::레나는 타인의 기억이 남긴 방향을 감각으로 읽는다.",
);
const ARRIVAL = t(
  "무대::안개가 걷히자 {name}은 북쪽 온실의 문 앞에 서 있었다.",
).replace("{name}", LENA);

/** 12화를 쓰기 전의 레나. 랜딩의 문서 장면에 나온 속성 표와 같다 */
const LENA_NOW: DocumentDraft = {
  title: LENA,
  properties: [
    description(t("무대::기억 항로를 읽어 내는 은빛 항해단의 항해사")),
    relation("manuscript", [ID.ch12]),
    relation("place", [ID.mountains]),
    relation("organization", [ID.voyagers]),
  ],
  body: bodyFromParagraphs(READS_MEMORY),
};

/** 12화에서 북쪽 온실에 닿은 뒤의 레나: 설명이 바뀌고, 관련 장소와 본문 한 문단이 늘었다 */
const LENA_NEXT: DocumentDraft = {
  title: LENA,
  properties: [
    description(t("무대::북쪽 문 너머에서 돌아온 은빛 항해단의 항해사")),
    relation("manuscript", [ID.ch12]),
    relation("place", [ID.mountains, ID.greenhouse]),
    relation("organization", [ID.voyagers]),
  ],
  body: bodyFromParagraphs(`${READS_MEMORY}\n\n${ARRIVAL}`),
};

export const EXAMPLE_PROPOSALS: RefreshProposal[] = [
  {
    id: "stage:proposal-lena",
    kind: "modified",
    fileId: ID.lena,
    title: LENA,
    docType: "character",
    draftRevision: 1,
    matched: false,
    baseMismatch: false,
    current: LENA_NOW,
    proposed: LENA_NEXT,
  },
  {
    // 북쪽 온실에는 그곳에 온 인물이 이어진다.
    id: "stage:proposal-greenhouse",
    kind: "modified",
    fileId: ID.greenhouse,
    title: NORTH_GREENHOUSE,
    docType: "place",
    draftRevision: 1,
    matched: false,
    baseMismatch: false,
    current: {
      title: NORTH_GREENHOUSE,
      properties: [relation("manuscript", [ID.ch12])],
      body: bodyFromParagraphs(""),
    },
    proposed: {
      title: NORTH_GREENHOUSE,
      properties: [
        relation("manuscript", [ID.ch12]),
        relation("character", [ID.lena]),
      ],
      body: bodyFromParagraphs(""),
    },
  },
  {
    // 원고에 처음 나온 조직은 새 문서로 제안된다.
    id: "stage:proposal-keepers",
    kind: "added",
    fileId: ID.keepers,
    title: LIGHTHOUSE_KEEPERS,
    docType: "organization",
    draftRevision: 1,
    matched: false,
    baseMismatch: false,
    current: null,
    proposed: {
      title: LIGHTHOUSE_KEEPERS,
      properties: [relation("manuscript", [ID.ch12])],
      body: bodyFromParagraphs(""),
    },
  },
];

export const EXAMPLE_STATE = initMerge(
  EXAMPLE_PROPOSALS.map((proposal) => ({
    fileId: proposal.fileId,
    current: proposal.current,
    proposed: proposal.proposed,
  })),
);

/** 예시에서 처음 골라 둔 문서(레나). 비교 화면이 바로 보인다 */
export const EXAMPLE_SELECTED_ID = ID.lena;
