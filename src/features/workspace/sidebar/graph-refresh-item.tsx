"use client";

import { useEffect, useRef, useState } from "react";

import { SidebarButton, useToast } from "@/design-system/primitives";
import { GraphDiffModal } from "@/features/graph-refresh/graph-diff-modal";
import { isUnavailable } from "@/features/common/preparing-state";
import {
  useRefreshActions,
  useRefreshRun,
} from "@/features/graph-refresh/queries";
import { t } from "@/i18n";

import { useWorkspace } from "../workspace-context";
import styles from "./sidebar.module.css";

export function GraphRefreshItem() {
  const { projectId } = useWorkspace();
  const toast = useToast();
  const run = useRefreshRun(projectId);
  const { start } = useRefreshActions(projectId);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const status = run.data?.status ?? "IDLE";
  const previous = useRef(status);

  useEffect(() => {
    if (previous.current === "RUNNING" && status === "FAILED") {
      toast({
        icon: "triangle-alert",
        title: t("그래프 최신화를 마치지 못했어요."),
        description: t("작업공간::잠시 후 다시 시도해 주세요."),
      });
    }
    previous.current = status;
  }, [status, toast]);

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

  if (status === "RUNNING" || start.isPending) {
    return (
      <SidebarButton
        icon="loader-circle"
        label={t("작업공간::그래프 추출 중…")}
        disabled
        aria-busy="true"
        className={styles.extracting}
      />
    );
  }

  if (status === "READY" && run.data) {
    const open = reviewing === run.data.id;
    const runId = run.data.id;
    return (
      <>
        <SidebarButton
          icon="git-compare-arrows"
          label={t("작업공간::변경 사항 반영")}
          selected={open}
          onClick={() => setReviewing(runId)}
        />
        <GraphDiffModal
          key={runId}
          run={run.data}
          open={open}
          onClose={() => setReviewing(null)}
        />
      </>
    );
  }

  return (
    <SidebarButton
      icon="refresh-cw"
      label={t("작업공간::그래프 최신화")}
      onClick={() =>
        start.mutate(undefined, {
          onError: () =>
            toast({
              icon: "triangle-alert",
              title: t("그래프 최신화를 시작하지 못했어요."),
              description: t("작업공간::잠시 후 다시 시도해 주세요."),
            }),
        })
      }
    />
  );
}
