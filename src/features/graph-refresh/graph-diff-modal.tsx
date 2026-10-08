"use client";

import { useId, useMemo, useState } from "react";

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  InlineNotice,
  Modal,
  useToast,
} from "@/design-system/primitives";
import {
  DOCUMENT_TYPE_META,
  DOCUMENT_TYPE_SINGULAR_LABEL,
  type DocumentType,
} from "@/domain/document-types";
import type { RefreshProposal, RefreshRun } from "@/domain/models";
import { indexNodes, isDocument } from "@/features/workspace/model/tree";
import { useFileTree } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { isServiceError } from "@/services/errors";
import { cx } from "@/shared/cx";

import { DocumentCompare, type Lookup } from "./document-compare";
import styles from "./graph-diff-modal.module.css";
import {
  adoptDocument,
  initMerge,
  isResolved,
  remainingOf,
  resetDocument,
  resolvedDrafts,
} from "./merge";
import { useRefreshActions } from "./queries";

const KIND_BADGE: Record<RefreshProposal["kind"], string> = {
  modified: t("변경 종류::수정"),
  added: t("변경 종류::추가"),
  removed: t("변경 종류::삭제"),
};

const KIND_MARK: Record<RefreshProposal["kind"], string> = {
  modified: "~",
  added: "+",
  removed: "−",
};

export function GraphDiffModal({
  run,
  open,
  onClose,
}: {
  run: RefreshRun;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const toast = useToast();
  const { projectId } = useWorkspace();
  const actions = useRefreshActions(projectId);
  const tree = useFileTree(projectId);
  const index = useMemo(() => indexNodes(tree.data ?? []), [tree.data]);
  const proposals = run.proposals;
  const start = useMemo(
    () =>
      initMerge(
        proposals.map((p) => ({
          fileId: p.fileId,
          current: p.current,
          proposed: p.proposed,
        })),
      ),
    [proposals],
  );
  const [state, setState] = useState(start);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = proposals.find((p) => p.fileId === selectedId) ?? null;
  const resolvedCount = proposals.filter((p) =>
    isResolved(state, p.fileId),
  ).length;
  const allResolved = resolvedCount === proposals.length;
  const ids = proposals.map((p) => p.fileId);

  const lookup: Lookup = (id) => {
    const node = index.get(id);
    if (isDocument(node))
      return {
        title: node.title,
        icon: DOCUMENT_TYPE_META[node.docType].entityIcon,
        docType: node.docType,
      };
    const proposal = proposals.find((p) => p.fileId === id);
    return proposal
      ? {
          title: proposal.title,
          icon: DOCUMENT_TYPE_META[proposal.docType].entityIcon,
          docType: proposal.docType,
        }
      : null;
  };

  const documents = useMemo(
    () => [...index.values()].filter(isDocument),
    [index],
  );
  const candidatesOf = (type: DocumentType, exceptId: string) =>
    documents.filter((node) => node.docType === type && node.id !== exceptId);

  const adoptAll = (side: "left" | "right") =>
    setState(ids.reduce((acc, id) => adoptDocument(acc, id, side), state));

  const confirm = () =>
    actions.apply
      .mutateAsync({
        runId: run.id,
        resolved: resolvedDrafts(state, proposals),
      })
      .then(
        () => {
          onClose();
          toast({
            icon: "circle-check",
            title: t("변경 사항을 반영했어요."),
            description: t("반영 전 상태는 각 문서의 버전 기록에 남아 있어요."),
          });
        },
        () => {},
      );

  const remaining = selected ? remainingOf(state, selected.fileId) : 0;

  if (proposals.length === 0) {
    const finish = () =>
      actions.discard.mutateAsync(run.id).then(onClose, onClose);
    return (
      <Modal
        open={open}
        onClose={onClose}
        label={t("새로 반영할 내용이 없어요")}
        className={styles.emptyModal}
      >
        <EmptyState
          icon="circle-check"
          title={t("새로 반영할 내용이 없어요")}
          description={t(
            "최근 원고에서 설정 문서에 더할 내용을 찾지 못했어요. 원고를 더 쓴 뒤 다시 최신화해 주세요.",
          )}
          action={
            <Button
              variant="primary"
              busy={actions.discard.isPending}
              onClick={finish}
            >
              {t("확인")}
            </Button>
          }
        />
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className={styles.modal}
      dismissible={!actions.apply.isPending}
    >
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {t("변경 사항")}{" "}
          <span>{t("문서 {count}개", { count: proposals.length })}</span>
        </h2>
        <Button
          size="sm"
          variant={allResolved ? "primary" : "outline"}
          disabled={!allResolved}
          busy={actions.apply.isPending}
          onClick={confirm}
        >
          {t("반영 확정")}
        </Button>
        <Button size="sm" onClick={() => adoptAll("left")}>
          {t("현재 버전 전체 반영")}
        </Button>
        <Button size="sm" onClick={() => adoptAll("right")}>
          {t("신규 버전 전체 반영")}
        </Button>
        <Button size="sm" onClick={() => setState(start)}>
          {t("변경 사항::되돌리기")}
        </Button>
        <IconButton
          icon="x"
          iconSize={16}
          label={t("변경 사항 닫기")}
          onClick={onClose}
        />
      </header>
      <div className={styles.layout}>
        <nav className={styles.list} aria-label={t("달라진 문서")}>
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
                    onClick={() => setSelectedId(proposal.fileId)}
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
          {run.preview && (
            <p className={styles.previewNote}>
              {t(
                "미리보기 제안이에요. 지금은 최근 원고에서 문서 이름이 나온 문장을 모아 만들어요.",
              )}
            </p>
          )}
        </nav>
        <div className={styles.main}>
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
                    setState(adoptDocument(state, selected.fileId, "left"))
                  }
                >
                  {t("현재 버전 반영")}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setState(adoptDocument(state, selected.fileId, "right"))
                  }
                >
                  {t("신규 버전 반영")}
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setState(resetDocument(state, selected.fileId, start))
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
                onChange={setState}
              />
            </>
          )}
          {actions.apply.isError && (
            <InlineNotice icon="circle-alert">
              {isServiceError(actions.apply.error) &&
              actions.apply.error.code === "validation"
                ? actions.apply.error.message
                : t("변경 사항을 반영하지 못했어요.")}{" "}
              {t("고른 내용은 그대로 남아 있어요.")}
            </InlineNotice>
          )}
        </div>
      </div>
    </Modal>
  );
}
