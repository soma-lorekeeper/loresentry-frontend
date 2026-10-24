"use client";

import type { ReactNode } from "react";

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
} from "@/design-system/primitives";
import {
  DOCUMENT_TYPE_META,
  DOCUMENT_TYPE_SINGULAR_LABEL,
  type DocumentType,
} from "@/domain/document-types";
import type { DocumentNode, RefreshProposal } from "@/domain/models";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import { DocumentCompare, type Lookup } from "./document-compare";
import styles from "./graph-diff-modal.module.css";
import {
  adoptDocument,
  isResolved,
  remainingOf,
  resetDocument,
  type MergeState,
} from "./merge";

const KIND_BADGE: Record<RefreshProposal["kind"], string> = {
  modified: t("변경 종류::수정"),
  added: t("변경 종류::추가"),
};

const KIND_MARK: Record<RefreshProposal["kind"], string> = {
  modified: "~",
  added: "+",
};

/**
 * "변경 사항" 창의 화면. 달라진 문서의 목록과, 고른 문서의 현재 버전·신규 버전 비교.
 *
 * <p><b>화면만 그린다.</b> 무엇을 보일지(제안, 지금까지 고른 상태)와 눌렀을 때 할 일은 모두
 * 바깥에서 받는다. 그래서 두 곳이 같은 화면을 쓴다:
 * <ul>
 *   <li>실제 창(graph-diff-modal.tsx) — 서버의 작업본을 받아 대화상자 안에 그리고, 확정하면 반영한다.
 *   <li>랜딩과 온보딩의 예시 화면(onboarding/refresh-preview.tsx) — 꾸며 낸 제안을 그려 보이기만
 *       한다. 예시를 따로 만들어 두면 실제 창이 바뀔 때마다 예시가 뒤처진다 — 실제로 그랬다.
 *   <li>투어의 예시 창(tour/refresh-example.tsx) — 같은 꾸민 제안으로 화살표와 확정을 해 보게 한다.
 * </ul>
 *
 * @param state 지금까지 고른 상태. `start` 는 처음 상태(되돌리기의 기준)다
 * @param selectedId 비교해 보고 있는 문서. 없으면 목록에서 고르라는 안내가 보인다
 * @param applying 확정한 것을 반영하는 중인가
 * @param notice 비교 위에 띄울 알림(저장·확정 실패 등). 머리의 확정 단추 가까이에 보이게 맨 위에 둔다
 */
export function RefreshReview({
  titleId,
  proposals,
  state,
  start,
  selectedId,
  applying = false,
  confirmDisabled = false,
  notice,
  lookup,
  candidatesOf,
  onSelect,
  onChange,
  onConfirm,
  onClose,
}: {
  titleId?: string;
  proposals: RefreshProposal[];
  state: MergeState;
  start: MergeState;
  selectedId: string | null;
  applying?: boolean;
  confirmDisabled?: boolean;
  notice?: ReactNode;
  lookup: Lookup;
  candidatesOf: (type: DocumentType, exceptId: string) => DocumentNode[];
  onSelect: (fileId: string) => void;
  onChange: (next: MergeState) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const selected = proposals.find((p) => p.fileId === selectedId) ?? null;
  const resolvedCount = proposals.filter((p) =>
    isResolved(state, p.fileId),
  ).length;
  const allResolved = resolvedCount === proposals.length;
  const remaining = selected ? remainingOf(state, selected.fileId) : 0;
  /** 모든 문서를 한쪽 버전으로 맞춘다 */
  const adoptAll = (side: "left" | "right") =>
    onChange(
      proposals.reduce(
        (acc, proposal) => adoptDocument(acc, proposal.fileId, side),
        state,
      ),
    );

  return (
    <div className={styles.review}>
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {t("변경 사항")}{" "}
          <span>{t("문서 {count}개", { count: proposals.length })}</span>
        </h2>
        <Button
          size="sm"
          variant={allResolved ? "primary" : "outline"}
          data-tour="diff-confirm"
          disabled={!allResolved || confirmDisabled}
          busy={applying}
          onClick={onConfirm}
        >
          {t("반영 확정")}
        </Button>
        <Button size="sm" disabled={applying} onClick={() => adoptAll("left")}>
          {t("현재 버전 전체 반영")}
        </Button>
        <Button size="sm" disabled={applying} onClick={() => adoptAll("right")}>
          {t("신규 버전 전체 반영")}
        </Button>
        <Button size="sm" disabled={applying} onClick={() => onChange(start)}>
          {t("변경 사항::되돌리기")}
        </Button>
        <IconButton
          icon="x"
          iconSize={16}
          label={t("변경 사항 닫기")}
          disabled={applying}
          onClick={onClose}
        />
      </header>
      <div className={styles.layout} inert={applying}>
        <nav
          className={styles.list}
          aria-label={t("달라진 문서")}
          data-tour="diff-list"
        >
          <span className={styles.listLabel}>
            <strong>
              {t("변경 {count}", { count: proposals.length - resolvedCount })}
            </strong>
            <span>{t("확정 {count}", { count: resolvedCount })}</span>
          </span>
          <ul>
            {proposals.map((proposal) => {
              const done = isResolved(state, proposal.fileId);
              const meta = DOCUMENT_TYPE_META[proposal.docType];
              return (
                <li key={proposal.id}>
                  <button
                    type="button"
                    data-kind={proposal.docType}
                    className={cx(
                      styles.item,
                      proposal.fileId === selectedId && styles.itemSelected,
                    )}
                    aria-current={proposal.fileId === selectedId || undefined}
                    onClick={() => onSelect(proposal.fileId)}
                  >
                    <Icon
                      name={meta.entityIcon}
                      size={15}
                      label={DOCUMENT_TYPE_SINGULAR_LABEL[proposal.docType]}
                    />
                    <span className={styles.itemTitle}>{proposal.title}</span>
                    {done ? (
                      <Icon name="check" size={15} label={t("확정")} />
                    ) : (
                      <span
                        className={styles.mark}
                        aria-label={KIND_BADGE[proposal.kind]}
                      >
                        {KIND_MARK[proposal.kind]}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={styles.main}>
          {notice}
          {!selected ? (
            <EmptyState
              icon="git-compare-arrows"
              title={t("달라진 문서가 {count}개 있어요", {
                count: proposals.length,
              })}
              description={
                <>
                  <span>{t("왼쪽에서 문서를 하나 골라주세요.")}</span>
                  <span>
                    {t("가운데 화살표로 옮기거나 양쪽을 직접 고칠 수 있어요.")}
                  </span>
                </>
              }
            />
          ) : (
            <>
              <div className={styles.docHeader}>
                <h3>{selected.title}</h3>
                <span className={styles.badge}>
                  {KIND_BADGE[selected.kind]}
                </span>
                {selected.baseMismatch && (
                  <span className={styles.mismatch}>
                    <Icon name="info" size={14} />
                    {t("AI가 읽은 뒤 바뀐 문서")}
                  </span>
                )}
              </div>
              <div className={styles.status} role="status">
                <span>
                  {remaining === 0
                    ? t("✓ 두 버전이 같아져서 반영이 끝났어요")
                    : t("아직 다른 곳이 {count}군데 있어요", {
                        count: remaining,
                      })}
                </span>
                <Button
                  size="sm"
                  onClick={() =>
                    onChange(adoptDocument(state, selected.fileId, "left"))
                  }
                >
                  {t("현재 버전 반영")}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    onChange(adoptDocument(state, selected.fileId, "right"))
                  }
                >
                  {t("신규 버전 반영")}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    onChange(resetDocument(state, selected.fileId, start))
                  }
                >
                  {t("변경 사항::되돌리기")}
                </Button>
              </div>
              <DocumentCompare
                proposal={selected}
                state={state}
                start={start}
                lookup={lookup}
                candidatesOf={candidatesOf}
                onChange={onChange}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
