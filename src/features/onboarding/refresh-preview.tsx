"use client";

import { useEffect, useRef } from "react";

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
import { RefreshReview } from "@/features/graph-refresh/refresh-review";
import { t } from "@/i18n";

import styles from "./onboarding.module.css";

/*
 * 예시 화면(랜딩, 온보딩)의 "변경 사항" 창.
 *
 * 전에는 실제 창을 흉내 낸 그림을 따로 그렸다. 실제 창에 확정 단추·상태 줄·관계 칩·글자 단위
 * 차이 표시가 생기는 동안 그림은 그대로여서 둘이 달라졌다. 지금은 **실제 창이 쓰는 화면**
 * (graph-refresh/refresh-review.tsx)에 꾸며 낸 제안을 넣어 그린다. 실제 창이 바뀌면 예시도 함께
 * 바뀐다.
 *
 * 서버를 부르지 않는다. 아래의 제안은 예시 작품 "유리 정원의 기록" 의 것이고, 무대의 다른 장면과
 * 같은 이름을 쓴다(scenes.tsx).
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

const lookup: Lookup = (id) => {
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

const PROPOSALS: RefreshProposal[] = [
  {
    id: "stage:proposal-lena",
    kind: "modified",
    fileId: ID.lena,
    title: LENA,
    docType: "character",
    baseRevisionNo: 1,
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
    baseRevisionNo: 1,
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
    baseRevisionNo: null,
    current: null,
    proposed: {
      title: LIGHTHOUSE_KEEPERS,
      properties: [relation("manuscript", [ID.ch12])],
      body: bodyFromParagraphs(""),
    },
  },
];

const STATE = initMerge(
  PROPOSALS.map((proposal) => ({
    fileId: proposal.fileId,
    current: proposal.current,
    proposed: proposal.proposed,
  })),
);

const nothing = () => {};

/**
 * 실제 "변경 사항" 화면을 예시로 그린다. 보기만 하는 그림이라 누를 수 없다(`inert`).
 *
 * <p>화면은 실제 크기로 그린 뒤 무대의 자리에 맞게 통째로 줄인다(CSS 의 `.diffStage`). 좁은 자리에
 * 그대로 그리면 단추가 줄바꿈되어 실제와 다른 모양이 된다.
 */
export default function RefreshPreview() {
  const ref = useRef<HTMLDivElement>(null);

  // 랜딩의 실은 레나를 따라간다. 창에 실이 닿으면 이 표시가 붙은 자리가 강조된다(scenes.tsx 의
  // FOLLOWED). 목록의 줄은 실제 화면이 그리므로, 그려진 뒤에 고른 줄(레나)에 표시를 붙인다.
  useEffect(() => {
    ref.current
      ?.querySelector('[aria-current="true"]')
      ?.setAttribute("data-followed", "");
  }, []);

  return (
    <div ref={ref} className={styles.diffStage} inert>
      <RefreshReview
        proposals={PROPOSALS}
        state={STATE}
        start={STATE}
        selectedId={ID.lena}
        lookup={lookup}
        candidatesOf={() => []}
        onSelect={nothing}
        onChange={nothing}
        onConfirm={nothing}
        onClose={nothing}
      />
    </div>
  );
}
