"use client";

import type { CSSProperties } from "react";
import { createPortal } from "react-dom";

import {
  DOCUMENT_TYPE_SINGULAR_LABEL,
  type DocumentType,
} from "@/domain/document-types";
import type { DocumentProperty, FileNode, FolderNode } from "@/domain/models";
import { t } from "@/i18n";

/** 인쇄 지면에 적는 속성 한 줄 */
export interface PrintRow {
  label: string;
  value: string;
}

/**
 * 인쇄 지면에 적을 속성 줄들. 화면의 속성 표(property-table.tsx)와 같은 순서다 —
 * 분류, 설명, (원고면) 에피소드, 그 밖의 속성.
 *
 * <p>비어 있는 속성은 적지 않는다. 화면에서는 채워 넣을 자리지만 종이에서는 빈 줄일 뿐이다.
 * 관계는 이어진 문서의 이름을 적고, 그 연결에 적어 둔 설명이 있으면 괄호로 곁들인다.
 * 휴지통으로 간 문서는 이름을 알 수 없어 뺀다.
 */
export function printRows(
  docType: DocumentType,
  properties: readonly DocumentProperty[],
  index: ReadonlyMap<string, FileNode>,
  episode: FolderNode | null,
): PrintRow[] {
  const valueOf = (property: DocumentProperty) =>
    property.kind === "text"
      ? property.value.trim()
      : property.targetIds
          .flatMap((id) => {
            const title = index.get(id)?.title;
            if (!title) return [];
            const note = property.descriptions[id]?.trim();
            return [note ? `${title} (${note})` : title];
          })
          .join(", ");
  const row = (property: DocumentProperty): PrintRow => ({
    label: property.label,
    value: valueOf(property),
  });
  const isDescription = (property: DocumentProperty) =>
    property.kind === "text" && property.key === "description";

  return [
    { label: t("분류"), value: DOCUMENT_TYPE_SINGULAR_LABEL[docType] },
    ...properties.filter(isDescription).map(row),
    ...(docType === "manuscript" && episode
      ? [{ label: t("에피소드"), value: episode.title }]
      : []),
    ...properties.filter((property) => !isDescription(property)).map(row),
  ].filter((line) => line.value !== "");
}

/**
 * 인쇄(PDF 내보내기)에만 쓰는 지면. 제목, 속성 표, 본문을 담는다.
 *
 * <p><b>`body` 바로 아래에 그린다.</b> 인쇄할 때는 `body` 의 자식 가운데 이 지면만 남기고 나머지를
 * 모두 감춘다(app/globals.css). 지면이 편집 화면 안쪽에 있으면 함께 감춰져 빈 종이가 나온다 —
 * 실제로 그랬다.
 *
 * <p>화면에서는 보이지 않는다. 글꼴·크기·줄 간격은 `style` 로 받은 에디터 설정을 그대로 쓰므로
 * 화면에서 보던 모양대로 찍힌다.
 *
 * @param html 본문. 에디터가 제 스키마로 만들어 낸 HTML 이다(문단별 정렬 포함)
 */
export function PrintSheet({
  title,
  rows,
  html,
  style,
}: {
  title: string;
  rows: PrintRow[];
  html: string;
  style: CSSProperties;
}) {
  return createPortal(
    <article className="lk-print-sheet" style={style}>
      <h1 className="lk-print-title">{title}</h1>
      {rows.length > 0 && (
        <table className="lk-print-properties">
          <tbody>
            {rows.map((line, position) => (
              <tr key={position}>
                <th scope="row">{line.label}</th>
                <td>{line.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div
        className="lk-print-body"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>,
    document.body,
  );
}
