"use client";

/**
 * 문서 하나를 두 버전으로 나란히 놓고 고친다.
 *
 * 두 버전은 대등한 후보다(TABLE_AND_LOGIC §7.5). 어느 쪽이든 그 자리에서 고칠 수 있고, 가운데
 * 화살표로 한 줄씩 반대편에 넣을 수도 있다. 두 쪽이 같아지면 그 문서는 끝난다.
 *
 * 다른 곳은 두 겹으로 짚는다. 줄 전체에 옅은 띠를 깔고 두 띠를 가운데에서 잇고, 짝지은 줄
 * 안에서 바뀐 낱말에는 진한 표시를 한 번 더 얹는다. 띠만으로는 무엇이 바뀌었는지 두 줄을
 * 번갈아 읽어야 찾을 수 있다.
 */

import {
  Fragment,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { Icon, IconButton, type IconName } from "@/design-system/primitives";
import {
  DOCUMENT_TYPE_META,
  DOCUMENT_TYPE_SINGULAR_LABEL,
  type DocumentType,
} from "@/domain/document-types";
import { t } from "@/i18n";
import type {
  DocumentDraft,
  DocumentNode,
  DocumentProperty,
  RefreshProposal,
  RelationProperty,
  TextProperty,
} from "@/domain/models";
import { cx } from "@/shared/cx";

import { BodyCompare } from "./body-compare";
import styles from "./graph-diff-modal.module.css";
import {
  bodyLines,
  editBody,
  editProperty,
  editTitle,
  propertyRows,
  pushBodyHunk,
  pushDocument,
  pushProperty,
  pushTitle,
  type Direction,
  type MergeState,
  type SideName,
} from "./merge";
import { wordDiff, type Segment } from "./word-diff";

export type Lookup = (
  id: string,
) => { title: string; icon: IconName; docType: DocumentType } | null;

const SIDES = ["left", "right"] as const;

function Arrows({
  onPush,
  label,
}: {
  onPush: (direction: Direction) => void;
  label: string;
}) {
  return (
    <span className={styles.arrows}>
      <IconButton
        icon="chevrons-right"
        iconSize={14}
        label={t("{label}: 현재 버전 값을 신규 버전에 넣기", { label })}
        onClick={() => onPush(">>")}
      />
      <IconButton
        icon="chevrons-left"
        iconSize={14}
        label={t("{label}: 신규 버전 값을 현재 버전에 넣기", { label })}
        onClick={() => onPush("<<")}
      />
    </span>
  );
}

/**
 * 고쳐 쓸 수 있는 글. 낱말 표시는 입력란 뒤에 깔린 거울에 그린다.
 *
 * 입력란(textarea) 안에는 표시를 얹을 수 없다. 같은 글을 같은 글꼴로 뒤에 한 번 더 그리고 표시만
 * 보이게 하면, 입력은 브라우저 그대로(한글 조합 포함) 두면서 바뀐 낱말을 짚을 수 있다. 거울이
 * 높이도 정한다 — 글이 길어지면 입력란이 따라 늘어난다.
 */
function EditableText({
  value,
  segments,
  label,
  onChange,
}: {
  value: string;
  segments: Segment[] | null;
  label: string;
  onChange: (value: string) => void;
}) {
  return (
    <span className={styles.editable}>
      <span className={styles.mirror} aria-hidden="true">
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
        {/* 끝이 줄바꿈이면 마지막 빈 줄의 높이가 사라진다. 폭 0 글자로 붙잡는다 */}
        {"​"}
      </span>
      <textarea
        className={styles.input}
        value={value}
        rows={1}
        placeholder="—"
        spellCheck={false}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      />
    </span>
  );
}

/** 연결할 문서 고르기. 대화상자 안에 띄운다 — 바깥(body)에 띄우면 모달 뒤에 깔려 누를 수 없다 */
function TargetPicker({
  candidates,
  onPick,
  onClose,
}: {
  candidates: DocumentNode[];
  onPick: (node: DocumentNode) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const filtered = candidates.filter((node) =>
    node.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      // 대화상자까지 닫히지 않게 한다. 고르기만 그만둔다.
      event.stopPropagation();
      onClose();
    } else if (event.key === "ArrowDown")
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    else if (event.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
    else if (event.key === "Enter" && filtered[active])
      onPick(filtered[active]);
    else return;
    event.preventDefault();
  };

  return (
    <div
      className={styles.picker}
      role="dialog"
      aria-label={t("연결할 문서 선택")}
    >
      <input
        autoFocus
        className={styles.pickerSearch}
        placeholder={t("문서 검색")}
        aria-label={t("연결할 문서 검색")}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
      />
      <div className={styles.pickerList} role="listbox" aria-label={t("문서")}>
        {filtered.length === 0 ? (
          <p className={styles.pickerEmpty}>{t("연결할 문서가 없어요.")}</p>
        ) : (
          filtered.map((node, index) => (
            <button
              key={node.id}
              type="button"
              role="option"
              aria-selected={index === active}
              data-active={index === active || undefined}
              data-kind={node.docType}
              className={styles.pickerItem}
              onMouseEnter={() => setActive(index)}
              onClick={() => onPick(node)}
            >
              <Icon
                name={DOCUMENT_TYPE_META[node.docType].entityIcon}
                size={15}
              />
              {node.title}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

/** 관계 값. 칩을 빼고 더할 수 있다. 반대편에 없는 대상은 진하게 짚는다 */
function RelationCell({
  property,
  otherIds,
  label,
  lookup,
  candidates,
  onChange,
}: {
  property: RelationProperty;
  otherIds: string[];
  label: string;
  lookup: Lookup;
  candidates: DocumentNode[];
  onChange: (next: RelationProperty) => void;
}) {
  const [picking, setPicking] = useState(false);
  const adder = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!picking) return;
    const onDown = (event: PointerEvent) => {
      if (!adder.current?.contains(event.target as Node)) setPicking(false);
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [picking]);

  const remove = (id: string) => {
    const descriptions = { ...property.descriptions };
    delete descriptions[id];
    onChange({
      ...property,
      targetIds: property.targetIds.filter((target) => target !== id),
      descriptions,
    });
  };

  return (
    <span className={styles.chips}>
      {property.targetIds.map((id) => {
        const target = lookup(id);
        const title = target?.title ?? t("새 문서");
        return (
          <span
            key={id}
            className={cx(
              styles.chip,
              !otherIds.includes(id) && styles.chipChanged,
            )}
            data-kind={target?.docType}
          >
            <Icon name={target?.icon ?? "file"} size={14} />
            <span className={styles.chipName}>{title}</span>
            <button
              type="button"
              className={styles.chipRemove}
              aria-label={t("{label}에서 {title} 빼기", { label, title })}
              onClick={() => remove(id)}
            >
              <Icon name="x" size={12} />
            </button>
          </span>
        );
      })}
      <span ref={adder} className={styles.adder}>
        <IconButton
          icon="plus"
          iconSize={14}
          label={t("{label}에 문서 연결", { label })}
          className={styles.add}
          aria-expanded={picking}
          onClick={() => setPicking((open) => !open)}
        />
        {picking && (
          <TargetPicker
            candidates={candidates.filter(
              (node) => !property.targetIds.includes(node.id),
            )}
            onClose={() => setPicking(false)}
            onPick={(node) => {
              onChange({
                ...property,
                targetIds: [...property.targetIds, node.id],
              });
              setPicking(false);
            }}
          />
        )}
      </span>
    </span>
  );
}

/** 한쪽에 없던 속성을 그쪽에 처음 만들 때의 빈 모양. 반대편 속성의 신원을 빌린다 */
function emptyLike(property: DocumentProperty): DocumentProperty {
  return property.kind === "text"
    ? ({ ...property, value: "" } satisfies TextProperty)
    : ({
        ...property,
        targetIds: [],
        descriptions: {},
      } satisfies RelationProperty);
}

export function DocumentCompare({
  proposal,
  state,
  start,
  lookup,
  candidatesOf,
  onChange,
}: {
  proposal: RefreshProposal;
  state: MergeState;
  /** 처음 상태. 제목 줄을 보일지는 처음 두 제목이 달랐는가로 정한다 — 고치는 도중에 줄이 사라지면 안 된다 */
  start: MergeState;
  lookup: Lookup;
  candidatesOf: (type: DocumentType, exceptId: string) => DocumentNode[];
  onChange: (next: MergeState) => void;
}) {
  const id = proposal.fileId;
  const docs = { left: state.left.get(id), right: state.right.get(id) };
  const both = !!docs.left && !!docs.right;
  const meta = DOCUMENT_TYPE_META[proposal.docType];
  const rows = propertyRows(docs.left, docs.right);
  const startTitles = [start.left.get(id)?.title, start.right.get(id)?.title];
  const showTitle =
    !!startTitles[0] && !!startTitles[1] && startTitles[0] !== startTitles[1];

  /**
   * 격자의 행 번호. 세 칸에 모두 적어 둔다 — 좌우 칸만 열을 정해 두면 가운데 칸이 자동 배치되며
   * 다음 행으로 밀려, 화살표가 엉뚱한 줄 옆에 선다.
   */
  let nextRow = 1;

  /** 한 줄의 세 칸. 가운데 칸은 두 쪽이 다를 때 띠로 이어지고 화살표가 선다 */
  const row = (
    key: string,
    label: string,
    changed: boolean,
    cell: (side: SideName, doc: DocumentDraft) => React.ReactNode,
    onPush?: (direction: Direction) => void,
  ) => {
    const at = nextRow++;
    return (
      <Fragment key={key}>
        {SIDES.map((side) => (
          <div
            key={side}
            className={styles.cell}
            data-side={side}
            data-changed={(changed && both) || undefined}
            style={{ gridColumn: side === "left" ? 1 : 3, gridRow: at }}
          >
            {docs[side] && (
              <>
                <span className={styles.label}>{label}</span>
                <span className={styles.value}>{cell(side, docs[side])}</span>
              </>
            )}
          </div>
        ))}
        <div
          className={styles.gutter}
          data-changed={(changed && both) || undefined}
          style={{ gridColumn: 2, gridRow: at }}
        >
          {changed && both && onPush && (
            <Arrows label={label} onPush={onPush} />
          )}
        </div>
      </Fragment>
    );
  };

  const titleMarks =
    docs.left && docs.right
      ? wordDiff(docs.left.title, docs.right.title)
      : null;

  return (
    <div className={styles.compare} data-tour="diff-compare">
      <div className={styles.heads}>
        <span>{t("현재 버전")}</span>
        <span className={styles.headGutter}>
          {!both && (docs.left || docs.right) && (
            <Arrows
              label={t("문서 전체")}
              onPush={(direction) =>
                onChange(pushDocument(state, id, direction))
              }
            />
          )}
        </span>
        <span>{t("신규 버전")}</span>
      </div>

      <div className={styles.sheets}>
        <span className={styles.sheet} data-side="left" aria-hidden="true" />
        <span className={styles.sheet} data-side="right" aria-hidden="true" />

        <div className={styles.props}>
          {!both && (
            <>
              {SIDES.filter((side) => !docs[side]).map((side) => (
                <p
                  key={side}
                  className={styles.absent}
                  style={{
                    gridColumn: side === "left" ? 1 : 3,
                    // 없는 쪽은 칸이 모두 비어 있다. 첫 줄에 겹쳐 둔다.
                    gridRow: 1,
                  }}
                >
                  {side === "left"
                    ? t("현재 버전에는 없는 문서예요.")
                    : t("신규 버전에서 사라진 문서예요.")}
                </p>
              ))}
            </>
          )}

          {row("type", t("분류"), false, () => (
            <span className={styles.type} data-kind={proposal.docType}>
              <Icon name={meta.entityIcon} size={14} />
              {DOCUMENT_TYPE_SINGULAR_LABEL[proposal.docType]}
            </span>
          ))}

          {showTitle &&
            row(
              "title",
              t("제목"),
              docs.left?.title !== docs.right?.title,
              (side, doc) => (
                <EditableText
                  value={doc.title}
                  segments={titleMarks ? titleMarks[side] : null}
                  label={
                    side === "left" ? t("현재 버전 제목") : t("신규 버전 제목")
                  }
                  onChange={(value) =>
                    onChange(editTitle(state, id, side, value))
                  }
                />
              ),
              (direction) => onChange(pushTitle(state, id, direction)),
            )}

          {rows.map((line) => {
            const sample = (line.left ?? line.right)!;
            const write = (side: SideName, next: DocumentProperty) =>
              onChange(editProperty(state, id, side, line.key, next));

            if (sample.kind === "text") {
              const text = (side: SideName) => {
                const property = line[side];
                return property?.kind === "text" ? property.value : "";
              };
              const marks = line.same
                ? null
                : wordDiff(text("left"), text("right"));
              return row(
                line.key,
                line.label,
                !line.same,
                (side) => (
                  <EditableText
                    value={text(side)}
                    segments={marks ? marks[side] : null}
                    label={
                      side === "left"
                        ? t("현재 버전 {label}", { label: line.label })
                        : t("신규 버전 {label}", { label: line.label })
                    }
                    onChange={(value) =>
                      write(side, {
                        ...((line[side] ?? emptyLike(sample)) as TextProperty),
                        value,
                      })
                    }
                  />
                ),
                (direction) =>
                  onChange(pushProperty(state, id, line.key, direction)),
              );
            }

            const ids = (side: SideName) => {
              const property = line[side];
              return property?.kind === "relation" ? property.targetIds : [];
            };
            return row(
              line.key,
              line.label,
              !line.same,
              (side) => (
                <RelationCell
                  property={
                    (line[side] ?? emptyLike(sample)) as RelationProperty
                  }
                  // 한쪽에만 있는 문서는 칩마다 짚지 않는다. 문서 전체가 하나의 차이다.
                  otherIds={
                    both ? ids(side === "left" ? "right" : "left") : ids(side)
                  }
                  label={
                    side === "left"
                      ? t("현재 버전 {label}", { label: line.label })
                      : t("신규 버전 {label}", { label: line.label })
                  }
                  lookup={lookup}
                  candidates={candidatesOf(sample.targetType, id)}
                  onChange={(next) => write(side, next)}
                />
              ),
              (direction) =>
                onChange(pushProperty(state, id, line.key, direction)),
            );
          })}
        </div>

        <BodyCompare
          left={docs.left ? bodyLines(docs.left.body) : undefined}
          right={docs.right ? bodyLines(docs.right.body) : undefined}
          onPush={(hunk, direction) =>
            onChange(pushBodyHunk(state, id, hunk, direction))
          }
          onEdit={(side, text) => onChange(editBody(state, id, side, text))}
        />
      </div>
    </div>
  );
}
