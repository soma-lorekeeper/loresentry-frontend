"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useId, useMemo, useState } from "react";

import {
  Button,
  InlineNotice,
  Modal,
  useToast,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import type { RefreshProposal, RefreshRunDetail } from "@/domain/models";
import { QueryFailure } from "@/features/common/query-failure";
import { indexNodes, isDocument } from "@/features/workspace/model/tree";
import { useFileTree } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { isServiceError } from "@/services/errors";
import { RefreshConfirmError, type RefreshProblem } from "@/services/ports";
import { queryKeys } from "@/services/query-keys";

import type { Lookup } from "./document-compare";
import styles from "./graph-diff-modal.module.css";
import { initMerge, type MergeState } from "./merge";
import { useRefreshActions, useRefreshReview } from "./queries";
import { RefreshReview } from "./refresh-review";
import { useDraftAutosave } from "./use-draft-autosave";

/**
 * 그래프 최신화가 내놓은 제안을 검토하는 대화상자.
 *
 * <p>여기서는 자료와 동작만 맡는다 — 작업본과 파일 트리를 읽고, 고른 상태를 자동 저장하고, 확정하면
 * 반영한다. 화면은 {@link RefreshReview} 가 그린다(랜딩·온보딩·투어의 예시 화면과 같은 것).
 *
 * <p>작업본은 서버에 있다. 그래서 창을 닫았다 열거나 다른 브라우저에서 열어도 고르던 데서 이어진다.
 */
export function GraphDiffModal({
  runId,
  open,
  onClose,
}: {
  runId: string;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { projectId } = useWorkspace();
  const review = useRefreshReview(projectId, runId, open);
  const [confirmError, setConfirmError] = useState<unknown>(null);
  // 확정하는 동안에는 닫지 않는다. 닫아도 서버는 반영을 마치지만, 결과를 알릴 창이 사라진다.
  const [confirming, setConfirming] = useState(false);
  const close = () => {
    if (!confirming) onClose();
  };

  // 확정했거나 실패해 검토가 이미 끝났다. 지금 상태를 다시 읽어 맞는 버튼을 보인다.
  const ended = () => {
    onClose();
    toast({ icon: "info", title: t("이미 끝난 최신화예요.") });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.refresh(projectId),
    });
  };

  return (
    <Modal
      open={open}
      onClose={close}
      // 작업본을 읽기 전에는 제목이 그려지지 않는다. 그동안에도 대화상자에 이름이 있게 한다.
      labelledBy={review.data ? titleId : undefined}
      label={review.data ? undefined : t("변경 사항")}
      className={styles.modal}
      dismissible={!confirming}
    >
      {review.isError ? (
        <QueryFailure
          title={t("변경 사항을 불러오지 못했어요")}
          retrying={review.isFetching}
          onRetry={() => void review.refetch()}
        />
      ) : !review.data ? (
        <div className={styles.loading} aria-busy="true" />
      ) : (
        // 서버 값을 다시 읽으면(충돌·확정 거절) 고르던 상태를 그 값으로 새로 시작한다.
        <ReviewSession
          key={review.dataUpdatedAt}
          titleId={titleId}
          detail={review.data}
          confirmError={confirmError}
          onConfirmError={setConfirmError}
          confirming={confirming}
          onConfirming={setConfirming}
          onReload={() => void review.refetch()}
          onEnded={ended}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

function ReviewSession({
  titleId,
  detail,
  confirmError,
  onConfirmError,
  confirming,
  onConfirming,
  onReload,
  onEnded,
  onClose,
}: {
  titleId: string;
  detail: RefreshRunDetail;
  confirmError: unknown;
  onConfirmError: (error: unknown) => void;
  confirming: boolean;
  onConfirming: (confirming: boolean) => void;
  onReload: () => void;
  onEnded: () => void;
  onClose: () => void;
}) {
  const toast = useToast();
  const { projectId } = useWorkspace();
  const actions = useRefreshActions(projectId);
  const tree = useFileTree(projectId);
  const index = useMemo(() => indexNodes(tree.data ?? []), [tree.data]);
  const proposals = detail.proposals;
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
  const [state, setState] = useState<MergeState>(start);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const autosave = useDraftAutosave({
    projectId,
    runId: detail.id,
    proposals,
    state,
    onConflict: () => {
      toast({
        icon: "info",
        title: t("다른 곳에서 먼저 고친 내용으로 바꿨어요."),
      });
      onReload();
    },
    onEnded,
  });

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

  const confirm = async () => {
    onConfirmError(null);
    onConfirming(true);
    try {
      // 마지막으로 고친 것이 아직 저장되지 않았을 수 있다. 다 저장한 뒤에 확정한다.
      if (!(await autosave.flush())) return;
      await actions.confirm.mutateAsync(detail.id);
      onClose();
      toast({
        icon: "circle-check",
        title: t("변경 사항을 반영했어요."),
        description: t(
          "잠긴 문서를 다시 편집할 수 있어요. 반영한 내용은 버전 기록에 남아요.",
        ),
      });
    } catch (error) {
      if (isServiceError(error) && error.code === "not-found") {
        onEnded();
        return;
      }
      onConfirmError(error);
      // 맞추지 않았거나 바뀐 작업본이 있다 — 서버의 지금 값으로 다시 맞춘다.
      if (
        error instanceof RefreshConfirmError &&
        error.code !== "REFRESH_DRAFTS_INVALID"
      )
        onReload();
    } finally {
      onConfirming(false);
    }
  };

  const reasons =
    confirmError instanceof RefreshConfirmError
      ? confirmReasons(confirmError, lookup, proposals)
      : [];

  return (
    <RefreshReview
      titleId={titleId}
      proposals={proposals}
      state={state}
      start={start}
      selectedId={selectedId}
      applying={confirming}
      lookup={lookup}
      candidatesOf={candidatesOf}
      onSelect={setSelectedId}
      onChange={setState}
      onConfirm={() => void confirm()}
      onClose={onClose}
      notice={
        <>
          {autosave.failed && (
            <InlineNotice
              icon="circle-alert"
              action={
                <Button
                  size="sm"
                  icon="rotate-cw"
                  onClick={() => void autosave.flush()}
                >
                  {t("다시 시도")}
                </Button>
              }
            >
              {t("고친 내용을 저장하지 못했어요. 화면의 내용은 그대로예요.")}
            </InlineNotice>
          )}
          {confirmError !== null && (
            <InlineNotice icon="circle-alert">
              {confirmMessage(confirmError)}
            </InlineNotice>
          )}
          {reasons.length > 0 && (
            // 까닭마다 그 문서로 바로 갈 수 있다. 목록에 없는 문서(휴지통 등)는 이름만 적는다.
            <ul className={styles.problems}>
              {reasons.map((reason, at) => (
                <li key={at}>
                  {reason.fileId ? (
                    <button
                      type="button"
                      className={styles.problem}
                      onClick={() => setSelectedId(reason.fileId)}
                    >
                      {reason.text}
                    </button>
                  ) : (
                    reason.text
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      }
    />
  );
}

function confirmMessage(error: unknown): string {
  if (error instanceof RefreshConfirmError) {
    if (error.code === "REFRESH_DRAFTS_INVALID")
      return t(
        "그대로 반영할 수 없는 곳이 있어요. 고친 뒤 다시 확정해 주세요.",
      );
    if (error.code === "REFRESH_DOCUMENTS_CHANGED")
      return t("검토하는 동안 바뀐 문서가 있어 다시 불러왔어요.");
    return t("아직 저장되지 않은 문서가 있어 다시 불러왔어요.");
  }
  if (isServiceError(error) && error.code === "duplicate") return error.message;
  return t("변경 사항을 반영하지 못했어요. 고른 내용은 그대로 남아 있어요.");
}

/**
 * 확정이 거절된 까닭을 문서마다 한 줄로. 검토 목록에 있는 문서면 그 문서로 갈 수 있게 `fileId` 를 붙인다.
 * 맞추지 않았거나 바뀐 작업본은 그 문서의 이름만, 쓸 수 없는 내용은 무엇이 문제인지 적는다.
 */
function confirmReasons(
  error: RefreshConfirmError,
  lookup: Lookup,
  proposals: readonly RefreshProposal[],
): { text: string; fileId: string | null }[] {
  const listed = (fileId: string | undefined) =>
    fileId && proposals.some((p) => p.fileId === fileId) ? fileId : null;
  if (error.code !== "REFRESH_DRAFTS_INVALID")
    return error.draftIds.flatMap((draftId) => {
      const proposal = proposals.find((p) => p.id === draftId);
      return proposal
        ? [{ text: proposal.title, fileId: proposal.fileId }]
        : [];
    });
  return error.problems.map((problem) => ({
    text: problemMessage(problem, lookup, proposals),
    fileId: listed(
      problem.target ??
        problem.one ??
        proposals.find((p) => p.id === problem.draftId)?.fileId,
    ),
  }));
}

/** 확정이 거절된 까닭을 문서 이름으로 말한다 */
function problemMessage(
  problem: RefreshProblem,
  lookup: Lookup,
  proposals: readonly RefreshProposal[],
): string {
  const title = (id: string | undefined) =>
    (id && lookup(id)?.title) || t("이름 없는 문서");
  switch (problem.code) {
    case "REJECTED_CANDIDATE":
      return t("만들지 않기로 한 ‘{title}’에 이어진 관계가 남아 있어요.", {
        title: title(problem.target),
      });
    case "INVALID_RELATION_TARGET":
      return t("‘{title}’에는 이을 수 없어요. 없거나 휴지통에 있는 문서예요.", {
        title: title(problem.target),
      });
    case "BODY_REQUIRED":
      return t("‘{title}’은 본문까지 함께 정해야 반영할 수 있어요.", {
        title:
          proposals.find((p) => p.id === problem.draftId)?.title ??
          t("이름 없는 문서"),
      });
    case "RELATION_CONFLICT":
      return t(
        "‘{one}’과 ‘{other}’ 사이 관계를 한쪽에서는 더하고 다른 쪽에서는 뺐어요.",
        { one: title(problem.one), other: title(problem.other) },
      );
    default:
      return t("그대로 반영할 수 없는 내용이 있어요.");
  }
}
