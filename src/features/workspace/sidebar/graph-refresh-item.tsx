"use client";

import { useState } from "react";

import { SidebarButton, useToast } from "@/design-system/primitives";
import { GraphDiffModal } from "@/features/graph-refresh/graph-diff-modal";
import { isUnavailable } from "@/features/common/preparing-state";
import {
  useRefreshActions,
  useRefreshRun,
} from "@/features/graph-refresh/queries";

import { useWorkspace } from "../workspace-context";
import styles from "./sidebar.module.css";

export function GraphRefreshItem() {
  const { projectId } = useWorkspace();
  const toast = useToast();
  const run = useRefreshRun(projectId);
  const { start } = useRefreshActions(projectId);
  const [reviewing, setReviewing] = useState(false);
  const status = run.data?.status ?? "IDLE";

  // 서버에 최신화가 아직 없다. 누르면 실패할 버튼을 누를 수 있게 두지 않는다.
  if (isUnavailable(run.error)) {
    return (
      <SidebarButton icon="clock-3" label="그래프 최신화 (준비 중)" disabled />
    );
  }

  if (status === "RUNNING" || start.isPending) {
    return (
      <SidebarButton
        icon="loader-circle"
        label="그래프 추출 중…"
        disabled
        aria-busy="true"
        className={styles.extracting}
      />
    );
  }

  if (status === "READY" && run.data) {
    return (
      <>
        <SidebarButton
          icon="git-compare-arrows"
          label="변경 사항 반영"
          selected={reviewing}
          onClick={() => setReviewing(true)}
        />
        <GraphDiffModal
          key={run.data.id}
          run={run.data}
          open={reviewing}
          onClose={() => setReviewing(false)}
        />
      </>
    );
  }

  return (
    <SidebarButton
      icon="refresh-cw"
      label="그래프 최신화"
      onClick={() =>
        start.mutate(undefined, {
          onError: () =>
            toast({
              icon: "triangle-alert",
              title: "그래프 최신화를 시작하지 못했어요.",
              description: "잠시 후 다시 시도해 주세요.",
            }),
        })
      }
    />
  );
}
