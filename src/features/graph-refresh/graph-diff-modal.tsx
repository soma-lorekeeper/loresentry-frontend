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
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import type { RefreshProposal, RefreshRun } from "@/domain/models";
import { indexNodes, isDocument } from "@/features/workspace/model/tree";
import { useFileTree } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";
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
  modified: "수정",
  added: "추가",
  removed: "삭제",
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
    actions.apply.mutate(
      { runId: run.id, resolved: resolvedDrafts(state, proposals) },
      {
        onSuccess: () => {
          onClose();
          toast({
            icon: "circle-check",
            title: "변경 사항을 반영했어요.",
            description: "반영 전 상태는 각 문서의 버전 기록에 남아 있어요.",
          });
        },
      },
    );

  const remaining = selected ? remainingOf(state, selected.fileId) : 0;

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
          변경 사항 <span>문서 {proposals.length}개</span>
        </h2>
        <Button
          size="sm"
          variant={allResolved ? "primary" : "outline"}
          disabled={!allResolved}
          busy={actions.apply.isPending}
          onClick={confirm}
        >
          반영 확정
        </Button>
        <Button size="sm" onClick={() => adoptAll("left")}>
          현재 버전 전체 반영
        </Button>
        <Button size="sm" onClick={() => adoptAll("right")}>
          신규 버전 전체 반영
        </Button>
        <Button size="sm" onClick={() => setState(start)}>
          되돌리기
        </Button>
        <IconButton
          icon="x"
          iconSize={16}
          label="변경 사항 닫기"
          onClick={onClose}
        />
      </header>
      <div className={styles.layout}>
        <nav className={styles.list} aria-label="달라진 문서">
          <span className={styles.listLabel}>
            <strong>변경 {proposals.length - resolvedCount}</strong>
            <span>확정 {resolvedCount}</span>
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
                    <Icon name={meta.entityIcon} size={15} label={meta.label} />
                    <span className={styles.itemTitle}>{proposal.title}</span>
                    {done ? (
                      <Icon name="check" size={15} label="확정" />
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
          {!selected ? (
            <EmptyState
              icon="git-compare-arrows"
              title={`달라진 문서가 ${proposals.length}개 있어요`}
              description={
                <>
                  <span>왼쪽에서 문서를 하나 골라주세요.</span>
                  <span>
                    가운데 화살표로 옮기거나 양쪽을 직접 고칠 수 있어요.
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
                    ? "✓ 두 버전이 같아져서 반영이 끝났어요"
                    : `아직 다른 곳이 ${remaining}군데 있어요`}
                </span>
                <Button
                  size="sm"
                  onClick={() =>
                    setState(adoptDocument(state, selected.fileId, "left"))
                  }
                >
                  현재 버전 반영
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setState(adoptDocument(state, selected.fileId, "right"))
                  }
                >
                  신규 버전 반영
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setState(resetDocument(state, selected.fileId, start))
                  }
                >
                  되돌리기
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
                : "변경 사항을 반영하지 못했어요."}{" "}
              고른 내용은 그대로 남아 있어요.
            </InlineNotice>
          )}
        </div>
      </div>
    </Modal>
  );
}
