"use client";

import { useState } from "react";

import { useToast } from "@/design-system/primitives";
import { saveOpenDocuments } from "@/features/documents/open-sessions";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { isServiceError } from "@/services/errors";

import { focusChapter } from "./focus";
import { useSettingCheckActions } from "./queries";

/**
 * 점검을 시작한다. 쓰던 글을 먼저 저장한다 — 서버는 저장된 판을 읽고, 그 판을 점검한 판으로 남긴다.
 */
export function useStartSettingCheck() {
  const { projectId, open } = useWorkspace();
  const toast = useToast();
  const { start } = useSettingCheckActions(projectId);
  const [saving, setSaving] = useState(false);

  const begin = async (
    documentId: string,
    options: { openTab?: boolean } = {},
  ) => {
    focusChapter(projectId, documentId);
    if (options.openTab) open({ kind: "setting-check" });
    setSaving(true);
    try {
      if (!(await saveOpenDocuments())) {
        toast({
          icon: "triangle-alert",
          title: t("문서를 저장하지 못해 점검을 시작하지 않았어요."),
          description: t("저장하지 못한 문서를 확인하고 다시 시도해 주세요."),
        });
        return;
      }
    } finally {
      setSaving(false);
    }
    start.mutate(documentId, {
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
