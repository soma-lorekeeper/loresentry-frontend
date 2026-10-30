"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { useToast } from "@/design-system/primitives";
import type { DocumentNode, FileNode } from "@/domain/models";
import type { SettingCheckSummary } from "@/domain/setting-check";
import { onFileCreated } from "@/features/workspace/file-events";
import { inTreeOrder } from "@/features/workspace/model/tree";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { queryKeys } from "@/services/query-keys";

import { focusChapter } from "./focus";
import { chapterStatus } from "./ledger";
import { useSettingCheckSummary } from "./queries";
import { useStartSettingCheck } from "./use-start-check";

/**
 * 새 회차가 놓일 자리의 바로 앞 회차. 새 파일은 그 폴더의 맨 끝에 붙으므로, 트리 순서에서 그 폴더가
 * 끝나기 전의 마지막 원고다.
 */
export function previousChapter(
  nodes: readonly FileNode[],
  created: FileNode,
): DocumentNode | null {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const inside = (node: FileNode) => {
    for (let at: FileNode | undefined = node; at;) {
      if (at.id === created.parentId) return true;
      at = at.parentId ? byId.get(at.parentId) : undefined;
    }
    return false;
  };
  let previous: DocumentNode | null = null;
  let entered = false;
  for (const node of inTreeOrder(nodes)) {
    const within = inside(node);
    if (entered && !within) break;
    if (within) entered = true;
    if (
      node.id !== created.id &&
      node.kind === "document" &&
      node.docType === "manuscript"
    )
      previous = node;
  }
  return previous;
}

/**
 * 작업공간에 하나 있는 점검 감시자. 점검 탭을 보고 있지 않을 때 끝난 점검을 알리고, 새 회차를 만들면
 * 앞 회차 점검을 한 번 권한다. 사이드바나 탭이 닫혀도 돈다.
 */
export function SettingCheckWatcher() {
  const { projectId, layout, open } = useWorkspace();
  const toast = useToast();
  const queryClient = useQueryClient();
  const summary = useSettingCheckSummary(projectId);
  const start = useStartSettingCheck();
  const running = summary.data?.running ?? null;
  const previous = useRef<string | null>(null);
  const tabVisible = layout.panes.some(
    (pane) => pane.activeTabId === "setting-check",
  );
  const latest = useRef({ tabVisible, summary: summary.data, start });
  useEffect(() => {
    latest.current = { tabVisible, summary: summary.data, start };
  });

  useEffect(() => {
    if (!summary.data) return;
    const before = previous.current;
    previous.current = running?.id ?? null;
    if (!before || before === running?.id) return;
    void queryClient.invalidateQueries({
      queryKey: queryKeys.settingChecks(projectId),
    });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.settingCheckRun(before),
    });
    const finished = summary.data.chapters.find(
      (chapter) => chapter.latest.id === before,
    )?.latest;
    if (!finished || latest.current.tabVisible) return;
    if (finished.status !== "DONE" && finished.status !== "FAILED") return;
    const show = () => {
      focusChapter(projectId, finished.documentId);
      open({ kind: "setting-check" });
    };
    toast(
      finished.status === "DONE"
        ? {
            icon: "scan-text",
            title: t("{title} 점검을 마쳤어요.", {
              title: finished.documentTitle,
            }),
            description:
              finished.counts.open > 0
                ? t("어긋나 보이는 곳 {count}개를 찾았어요.", {
                    count: finished.counts.open,
                  })
                : t("어긋나 보이는 곳이 없어요."),
            action: { label: t("결과 보기"), onSelect: show },
          }
        : {
            icon: "cloud-off",
            title: t("{title} 점검을 마치지 못했어요.", {
              title: finished.documentTitle,
            }),
            description: t("원고는 바뀌지 않았어요."),
            action: { label: t("결과 보기"), onSelect: show },
          },
    );
  }, [summary.data, running?.id, projectId, queryClient, toast, open]);

  useEffect(
    () =>
      onFileCreated((node) => {
        if (node.kind !== "document" || node.docType !== "manuscript") return;
        const nodes =
          queryClient.getQueryData<FileNode[]>(queryKeys.tree(projectId)) ?? [];
        const chapter = previousChapter(nodes, node);
        const current: SettingCheckSummary | undefined = latest.current.summary;
        if (!chapter || !current || current.running) return;
        const status = chapterStatus(chapter.id, chapter.revisionNo, current);
        if (status.kind !== "unchecked" && status.kind !== "changed") return;
        toast({
          icon: "scan-text",
          title: t("새 회차를 만들었어요. 앞 회차를 점검할까요?"),
          description: chapter.title,
          durationMs: 9000,
          dismiss: t("나중에"),
          action: {
            label: t("점검"),
            primary: true,
            onSelect: () =>
              void latest.current.start.begin(chapter.id, { openTab: true }),
          },
        });
      }),
    [projectId, queryClient, toast],
  );

  return null;
}
