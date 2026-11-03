"use client";

import { useRef, useState } from "react";

import { useToast } from "@/design-system/primitives";
import { saveOpenDocuments } from "@/features/documents/open-sessions";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { isServiceError } from "@/services/errors";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/services/query-keys";
import type { SettingCheckSummary } from "@/domain/setting-check";
import { beginUsage } from "@/features/analytics/usage-analytics";
import type { EntryPoint } from "@/features/analytics/usage-schema";

import { focusChapter } from "./focus";
import { useSettingCheckActions } from "./queries";

/**
 * 점검을 시작한다. 쓰던 글을 먼저 저장한다 — 서버는 저장된 판을 읽고, 그 판을 점검한 판으로 남긴다.
 */
export function useStartSettingCheck() {
  const { projectId, open } = useWorkspace();
  const toast = useToast();
  const client = useQueryClient();
  const active = useRef<ReturnType<typeof beginUsage> | null>(null);
  const { start } = useSettingCheckActions(projectId, {
    accepted: () => active.current?.finish({ outcome: "accepted" }),
    failed: (error) => active.current?.fail(error),
  });
  const [saving, setSaving] = useState(false);

  const begin = async (
    documentId: string,
    options: { openTab?: boolean; entryPoint?: EntryPoint } = {},
  ) => {
    if (active.current) return;
    const previous = client
      .getQueryData<SettingCheckSummary>(
        queryKeys.settingCheckSummary(projectId),
      )
      ?.chapters.find((chapter) => chapter.documentId === documentId)?.latest;
    const attempt = beginUsage(
      "setting_check_start_requested",
      "setting_check_start_result",
      {
        entry_point: options.entryPoint ?? "check_home",
        start_mode:
          previous?.status === "FAILED" || previous?.status === "CANCELLED"
            ? "retry"
            : previous
              ? "recheck"
              : "first",
      },
    );
    active.current = attempt;
    focusChapter(projectId, documentId);
    if (options.openTab) open({ kind: "setting-check" });
    setSaving(true);
    try {
      if (!(await saveOpenDocuments())) {
        attempt.finish({
          outcome: "blocked",
          stage: "save_documents",
          error_category: "other",
        });
        active.current = null;
        toast({
          icon: "triangle-alert",
          title: t("문서를 저장하지 못해 점검을 시작하지 않았어요."),
          description: t("저장하지 못한 문서를 확인하고 다시 시도해 주세요."),
        });
        return;
      }
    } catch (error) {
      attempt.fail(error, { outcome: "blocked", stage: "save_documents" });
      active.current = null;
      throw error;
    } finally {
      setSaving(false);
    }
    start.mutate(documentId, {
      onSettled: () => {
        active.current = null;
      },
      onError: (error) =>
        toast({
          icon: "triangle-alert",
          title: t("점검을 시작하지 못했어요."),
          description: isServiceError(error)
            ? error.message
            : t("작업공간::잠시 후 다시 시도해 주세요."),
        }),
    });
  };

  return { begin, pending: saving || start.isPending };
}
