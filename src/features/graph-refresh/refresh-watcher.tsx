"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useToast } from "@/design-system/primitives";
import type { RefreshRun } from "@/domain/models";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";

import { GraphDiffModal } from "./graph-diff-modal";
import { refreshLocksChanged, useRefreshRun } from "./queries";
import { onRefreshReviewRequest, requestRefreshReview } from "./review-request";

/** 결과를 기다리던 최신화가 끝났을 때의 알림. 어느 경우든 잠금이 바뀌었다 */
function finishedNotice(run: RefreshRun) {
  switch (run.status) {
    case "READY":
      return {
        icon: "git-compare-arrows" as const,
        title: t("최신화 결과가 도착했어요."),
        description: t("결과를 확정할 때까지 관련 문서는 잠겨 있어요."),
        action: {
          label: t("검토하기"),
          icon: "arrow-right" as const,
          onSelect: requestRefreshReview,
        },
      };
    case "NO_CHANGE":
      return {
        icon: "circle-check" as const,
        title: t("새로 반영할 내용이 없어요."),
        description: t("잠근 문서를 다시 편집할 수 있어요."),
      };
    case "FAILED":
      return {
        icon: "triangle-alert" as const,
        title: t("그래프 최신화를 마치지 못했어요."),
        description:
          run.error?.code === "TIMED_OUT"
            ? t(
                "한 시간 안에 결과가 오지 않았어요. 잠근 문서는 다시 편집할 수 있어요.",
              )
            : t(
                "잠근 문서는 다시 편집할 수 있어요. 잠시 후 다시 시도해 주세요.",
              ),
      };
    default:
      return null;
  }
}

/**
 * 작업공간에 하나 있는 최신화 감시자.
 *
 * <ul>
 *   <li>들어올 때 서버에서 상태를 읽는다. 결과를 기다리는 중(RUNNING)이면 끝날 때까지 다시 읽는다 — 다른
 *       브라우저나 새로 로그인한 곳에서 시작한 최신화도 이어서 본다.
 *   <li>기다리던 최신화가 끝나면 알리고, 잠금이 바뀐 문서를 다시 읽는다. 들어왔을 때 이미 끝나 있던
 *       최신화는 알리지 않는다.
 *   <li>검토 창을 띄운다. 사이드바가 닫혀 있어도 알림·편집기 안내의 "검토하기"로 열 수 있게 여기 둔다.
 * </ul>
 */
export function RefreshWatcher() {
  const { projectId } = useWorkspace();
  const toast = useToast();
  const queryClient = useQueryClient();
  const run = useRefreshRun(projectId);
  const data = run.data;
  const [reviewing, setReviewing] = useState<string | null>(null);
  const previous = useRef<RefreshRun["status"] | null>(null);

  useEffect(() => {
    if (!data) return;
    const before = previous.current;
    previous.current = data.status;
    if (before !== "RUNNING" || data.status === "RUNNING") return;
    void refreshLocksChanged(queryClient, projectId);
    const notice = finishedNotice(data);
    if (notice) toast(notice);
  }, [data, projectId, queryClient, toast]);

  const readyId = data?.status === "READY" ? data.id : null;

  useEffect(
    () =>
      onRefreshReviewRequest(() => {
        if (readyId) setReviewing(readyId);
      }),
    [readyId],
  );

  if (!readyId) return null;
  return (
    <GraphDiffModal
      key={readyId}
      runId={readyId}
      open={reviewing === readyId}
      onClose={() => setReviewing(null)}
    />
  );
}
