"use client";

import { useEffect, useState } from "react";

import {
  Button,
  DialogCard,
  SidebarButton,
  useToast,
} from "@/design-system/primitives";
import { isUnavailable } from "@/features/common/preparing-state";
import { QueryFailure } from "@/features/common/query-failure";
import { saveOpenDocuments } from "@/features/documents/open-sessions";
import {
  useRefreshActions,
  useRefreshRun,
} from "@/features/graph-refresh/queries";
import { requestRefreshReview } from "@/features/graph-refresh/review-request";
import { t } from "@/i18n";
import { isServiceError } from "@/services/errors";

import { useWorkspace } from "../workspace-context";
import styles from "./sidebar.module.css";

/** 결과를 기다린 시간을 다시 셀 간격. 분 단위로만 보이므로 자주 셀 필요가 없다 */
const ELAPSED_TICK_MS = 30_000;

/**
 * 결과를 기다린 시간(분). 최신화는 몇 분에서 길게는 한 시간까지 걸려, 아직 도는지 알 수 있게 보인다.
 * 서버 시각과 브라우저 시각이 조금 어긋나도 음수가 되지 않게 0 에서 멈춘다.
 */
function useElapsedMinutes(startedAt: string | null, running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    // 처음 그린 시각은 오래전일 수 있다(한참 열어 둔 뒤 시작). 기다리기 시작하면 곧바로 한 번 다시 잰다.
    const sync = () => setNow(Date.now());
    const first = window.setTimeout(sync, 0);
    const timer = window.setInterval(sync, ELAPSED_TICK_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [running]);
  if (!running || !startedAt) return 0;
  return Math.max(0, Math.floor((now - Date.parse(startedAt)) / 60_000));
}

/**
 * 사이드바의 그래프 최신화 단추. 지금 상태에 맞는 한 가지 일만 보인다 — 시작, 기다리는 중, 검토.
 * 알림과 검토 창은 작업공간의 RefreshWatcher 가 맡는다.
 */
export function GraphRefreshItem() {
  const { projectId } = useWorkspace();
  const toast = useToast();
  const run = useRefreshRun(projectId);
  const { start } = useRefreshActions(projectId);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const status = run.data?.status ?? "IDLE";
  const running = status === "RUNNING";
  const minutes = useElapsedMinutes(run.data?.startedAt ?? null, running);

  // 서버에 최신화가 아직 없다. 누르면 실패할 버튼을 누를 수 있게 두지 않는다.
  if (isUnavailable(run.error)) {
    return (
      <SidebarButton
        icon="clock-3"
        label={t("그래프 최신화 (준비 중)")}
        disabled
      />
    );
  }

  if (run.isError)
    return (
      <QueryFailure
        compact
        title={t("최신화 상태를 불러오지 못했어요")}
        retrying={run.isFetching}
        onRetry={() => void run.refetch()}
      />
    );
  if (run.isPending)
    return (
      <SidebarButton
        icon="loader-circle"
        label={t("최신화 상태를 불러오는 중…")}
        disabled
        aria-busy="true"
      />
    );

  if (running || start.isPending || saving) {
    return (
      <SidebarButton
        icon="loader-circle"
        label={
          minutes > 0
            ? t("그래프 최신화 중… {minutes}분", { minutes })
            : t("그래프 최신화 중…")
        }
        data-tour="refresh-running"
        disabled
        aria-busy="true"
        className={styles.extracting}
      />
    );
  }

  if (status === "READY") {
    return (
      <SidebarButton
        icon="git-compare-arrows"
        label={t("작업공간::변경 사항 반영")}
        data-tour="refresh-review"
        onClick={requestRefreshReview}
      />
    );
  }

  const begin = async () => {
    setConfirming(false);
    // 쓰던 글을 먼저 저장한다. 서버는 저장된 문서만 보내고, 보낸 문서는 곧바로 잠근다.
    setSaving(true);
    try {
      await saveOpenDocuments();
    } finally {
      setSaving(false);
    }
    start.mutate(undefined, {
      onSuccess: ({ run: started, lockedFileIds }) =>
        toast(
          started
            ? {
                icon: "lock",
                title: t("문서 {count}개를 잠갔어요.", {
                  count: lockedFileIds.length,
                }),
                description: t("결과를 확정할 때까지 편집할 수 없어요."),
              }
            : {
                icon: "info",
                title: t("최신화할 변경이 없어요."),
                description: t("지난 최신화 뒤 고친 문서가 없어요."),
              },
        ),
      onError: (error) =>
        toast({
          icon: "triangle-alert",
          title: t("그래프 최신화를 시작하지 못했어요."),
          description: isServiceError(error)
            ? error.message
            : t("작업공간::잠시 후 다시 시도해 주세요."),
        }),
    });
  };

  return (
    <>
      <SidebarButton
        icon="refresh-cw"
        label={t("작업공간::그래프 최신화")}
        data-tour="refresh-start"
        onClick={() => setConfirming(true)}
      />
      {/* 시작하면 읽는 문서가 결과를 확정할 때까지 잠긴다. 쓰던 회차가 갑자기 잠기지 않게 먼저 묻는다. */}
      <DialogCard
        open={confirming}
        onClose={() => setConfirming(false)}
        title={t("그래프 최신화를 시작할까요?")}
        description={t(
          "지난 최신화 뒤 고친 원고와 설정 문서를 AI가 읽어요. 읽는 문서는 결과를 확정할 때까지 편집할 수 없어요.",
        )}
        footerHint={t("보통 몇 분 · 최대 1시간")}
        actions={
          <>
            <Button size="md" icon="x" onClick={() => setConfirming(false)}>
              {t("취소")}
            </Button>
            <Button
              size="md"
              variant="primary"
              icon="refresh-cw"
              onClick={() => void begin()}
            >
              {t("최신화 시작")}
            </Button>
          </>
        }
      />
    </>
  );
}
