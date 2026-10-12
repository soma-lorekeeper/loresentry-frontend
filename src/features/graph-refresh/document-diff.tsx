"use client";

/**
 * 문서 하나의 두 버전을 나란히 놓고 **읽기만** 한다. {@link DocumentCompare} 의 고칠 수 없는 판이다.
 *
 * 버전 기록이 쓴다. 변경 사항 창과 같은 문서 상자여야 해서 같은 스타일(graph-diff-modal.module.css)과
 * 같은 비교(속성 줄, 낱말 차이, 본문의 띠와 리본)를 쓴다. 다른 것은 셋뿐이다 — 값을 고칠 수 없고,
 * 가운데 칸에 화살표가 없고, 그래서 가운데 칸이 좁다.
 *
 * 따로 한 벌을 그리지 않고 여기에 둔 까닭: 두 화면이 같은 모양이어야 한다는 것은 스타일을 베껴서는
 * 지켜지지 않는다. 한쪽만 고치는 날부터 달라진다.
 */

import { Fragment, type ReactNode } from "react";

import { Icon, type IconName } from "@/design-system/primitives";
import {
  DOCUMENT_TYPE_META,
  DOCUMENT_TYPE_SINGULAR_LABEL,
  type DocumentType,
} from "@/domain/document-types";
import type { DocumentDraft } from "@/domain/models";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import { BodyCompare } from "./body-compare";
import styles from "./graph-diff-modal.module.css";
import { bodyLines, propertyRows, type SideName } from "./merge";
import { wordDiff, type Segment } from "./word-diff";

const SIDES = ["left", "right"] as const;

/** 한 버전. 분류까지 함께 본다 — 문서를 다른 분류로 옮기기 전의 버전일 수 있다 */
export type DiffSnapshot = DocumentDraft & { docType: DocumentType };

/** 관계 칩에 그릴 대상. 지워진 문서도 이름("삭제된 파일")은 돌려준다 */
export type DiffTarget = {
  title: string;
  icon: IconName;
  docType?: DocumentType;
};

/** 고칠 수 없는 글. 바뀐 낱말에는 변경 사항 창과 같은 표시를 얹는다 */
function StaticText({
  value,
  segments,
}: {
  value: string;
  segments: Segment[] | null;
}) {
  // 비어 있는 값은 줄표로 적는다(변경 사항 창의 빈 입력란도 같은 줄표를 보인다).
  if (value === "") return <span className={styles.staticEmpty}>—</span>;
  return (
    <span className={styles.static}>
      {segments
        ? segments.map((segment, index) =>
            segment.changed ? (
              <mark key={index} className={styles.word}>
                {segment.text}
              </mark>
            ) : (
              <Fragment key={index}>{segment.text}</Fragment>
            ),
          )
        : value}
    </span>
  );
}

export function DocumentDiff({
  left,
  right,
  labels,
  notes,
  only,
  lookup,
  className,
}: {
  left: DiffSnapshot;
  right: DiffSnapshot;
  /** 두 쪽의 이름. 머리에 적고, 본문을 읽어 줄 이름에도 쓴다 */
  labels: Record<SideName, string>;
  /** 이름 옆에 붙일 말(그 버전을 남긴 때 등) */
  notes?: Partial<Record<SideName, string>>;
  /**
   * 좁은 화면에서 보일 쪽. 두 문서를 나란히 둘 폭이 없으면 이쪽만 그린다(CSS 가 화면 폭을 보고
   * 정한다 — 넓은 화면에서는 이 값과 상관없이 둘 다 보인다). 어느 쪽을 볼지 고르는 단추는 부르는
   * 쪽이 둔다. 그 단추가 이름을 말하므로, 한쪽만 보일 때는 머리의 이름을 화면에 되풀이하지 않는다.
   */
  only?: SideName;
  lookup: (id: string) => DiffTarget;
  className?: string;
}) {
  const docs = { left, right };
  const rows = propertyRows(left, right);
  const titleMarks =
    left.title === right.title ? null : wordDiff(left.title, right.title);

  /**
   * 격자의 행 번호. 세 칸에 모두 적어 둔다 — 좌우 칸만 열을 정해 두면 가운데 칸이 자동 배치되며
   * 다음 행으로 밀린다(DocumentCompare 와 같은 이유).
   */
  let nextRow = 1;

  /** 한 줄의 세 칸. 두 쪽이 다르면 같은 띠가 가운데 칸까지 이어진다 */
  const row = (
    key: string,
    label: string,
    changed: boolean,
    cell: (side: SideName) => ReactNode,
  ) => {
    const at = nextRow++;
    return (
      <Fragment key={key}>
        {SIDES.map((side) => (
          <div
            key={side}
            className={styles.cell}
            data-side={side}
            data-changed={changed || undefined}
            style={{ gridColumn: side === "left" ? 1 : 3, gridRow: at }}
            // 두 쪽의 칸이 줄마다 번갈아 놓인다. 읽어 주는 도구가 "설명 … 설명 …" 을 이어 읽으면
            // 어느 쪽 값인지 알 수 없으므로 칸마다 쪽의 이름을 붙인다.
            role="group"
            aria-label={t("{name}의 {label}", { name: labels[side], label })}
          >
            <span className={styles.label}>{label}</span>
            <span className={styles.value}>{cell(side)}</span>
          </div>
        ))}
        <div
          className={styles.gutter}
          data-changed={changed || undefined}
          style={{ gridColumn: 2, gridRow: at }}
        />
      </Fragment>
    );
  };

  return (
    <div
      className={cx(styles.compare, className)}
      data-readonly=""
      data-only={only}
    >
      <div className={styles.heads}>
        {SIDES.map((side) => (
          <Fragment key={side}>
            {side === "right" && <span className={styles.headGutter} />}
            {/* 제목 요소가 들어가므로 글자 요소(span)가 아니라 div 다. */}
            <div data-side={side}>
              <h3 className={styles.headName}>{labels[side]}</h3>
              {notes?.[side] && (
                <span className={styles.headNote}>{notes[side]}</span>
              )}
            </div>
          </Fragment>
        ))}
      </div>

      <div className={styles.sheets}>
        <span className={styles.sheet} data-side="left" aria-hidden="true" />
        <span className={styles.sheet} data-side="right" aria-hidden="true" />

        <div className={styles.props}>
          {row("type", t("분류"), left.docType !== right.docType, (side) => (
            <span className={styles.type} data-kind={docs[side].docType}>
              <Icon
                name={DOCUMENT_TYPE_META[docs[side].docType].entityIcon}
                size={14}
              />
              {DOCUMENT_TYPE_SINGULAR_LABEL[docs[side].docType]}
            </span>
          ))}

          {/* 제목은 두 버전이 다를 때만 적는다. 같으면 창의 제목이 이미 말한다. */}
          {left.title !== right.title &&
            row("title", t("제목"), true, (side) => (
              <StaticText
                value={docs[side].title}
                segments={titleMarks ? titleMarks[side] : null}
              />
            ))}

          {rows.map((line) => {
            const sample = (line.left ?? line.right)!;

            if (sample.kind === "text") {
              const text = (side: SideName) => {
                const property = line[side];
                return property?.kind === "text" ? property.value : "";
              };
              const marks = line.same
                ? null
                : wordDiff(text("left"), text("right"));
              return row(line.key, line.label, !line.same, (side) => (
                <StaticText
                  value={text(side)}
                  segments={marks ? marks[side] : null}
                />
              ));
            }

            const ids = (side: SideName) => {
              const property = line[side];
              return property?.kind === "relation" ? property.targetIds : [];
            };
            return row(line.key, line.label, !line.same, (side) => {
              const other = ids(side === "left" ? "right" : "left");
              if (ids(side).length === 0)
                return <span className={styles.staticEmpty}>—</span>;
              return (
                <span className={styles.chips}>
                  {ids(side).map((id) => {
                    const target = lookup(id);
                    return (
                      <span
                        key={id}
                        // 반대편에 없는 대상은 진하게 짚는다.
                        className={cx(
                          styles.chip,
                          !other.includes(id) && styles.chipChanged,
                        )}
                        data-kind={target.docType}
                      >
                        <Icon name={target.icon} size={14} />
                        <span className={styles.chipName}>{target.title}</span>
                      </span>
                    );
                  })}
                </span>
              );
            });
          })}
        </div>

        <BodyCompare
          left={bodyLines(left.body)}
          right={bodyLines(right.body)}
          labels={{
            left: t("{name} 본문", { name: labels.left }),
            right: t("{name} 본문", { name: labels.right }),
          }}
        />
      </div>
    </div>
  );
}
