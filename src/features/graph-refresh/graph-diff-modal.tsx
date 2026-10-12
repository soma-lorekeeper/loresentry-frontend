"use client";

import { useId, useMemo, useState } from "react";

import {
  Button,
  EmptyState,
  InlineNotice,
  Modal,
  useToast,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import type { RefreshRun } from "@/domain/models";
import { indexNodes, isDocument } from "@/features/workspace/model/tree";
import { useFileTree } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { isServiceError } from "@/services/errors";

import type { Lookup } from "./document-compare";
import styles from "./graph-diff-modal.module.css";
import { initMerge, resolvedDrafts } from "./merge";
import { useRefreshActions } from "./queries";
import { RefreshReview } from "./refresh-review";

/**
 * 그래프 최신화가 내놓은 제안을 검토하는 대화상자.
 *
 * <p>여기서는 자료와 동작만 맡는다 — 제안과 파일 트리를 읽고, 고른 상태를 쥐고, 확정하면 반영한다.
 * 화면은 {@link RefreshReview} 가 그린다(랜딩·온보딩의 예시 화면과 같은 것).
 */
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
        <div data-tour="diff-empty">
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
        </div>
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
      <RefreshReview
        titleId={titleId}
        proposals={proposals}
        state={state}
        start={start}
        selectedId={selectedId}
        preview={run.preview}
        applying={actions.apply.isPending}
        lookup={lookup}
        candidatesOf={candidatesOf}
        onSelect={setSelectedId}
        onChange={setState}
        onConfirm={confirm}
        onClose={onClose}
        notice={
          actions.apply.isError && (
            <InlineNotice icon="circle-alert">
              {isServiceError(actions.apply.error) &&
              actions.apply.error.code === "validation"
                ? actions.apply.error.message
                : t("변경 사항을 반영하지 못했어요.")}{" "}
              {t("고른 내용은 그대로 남아 있어요.")}
            </InlineNotice>
          )
        }
      />
    </Modal>
  );
}
