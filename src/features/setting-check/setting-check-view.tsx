"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/design-system/primitives";
import type { DocumentContent, DocumentNode } from "@/domain/models";
import {
  isUnavailable,
  PreparingState,
} from "@/features/common/preparing-state";
import { QueryFailure } from "@/features/common/query-failure";
import { useFileTree } from "@/features/workspace/queries";
import type { WorkspaceViewProps } from "@/features/workspace/views/view-types";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { queryKeys } from "@/services/query-keys";

import { useFocusedChapter } from "./focus";
import { Home } from "./home";
import { historyOf, ledgerGroups } from "./ledger";
import { useSettingCheckSummary, useSettingCheckVerdicts } from "./queries";
import { Report } from "./report";
import styles from "./setting-check.module.css";
import { useStartSettingCheck } from "./use-start-check";
import { VerdictLedger } from "./verdict-ledger";

/**
 * 설정 오류 점검 탭. 처음 화면에서 원고를 골라 점검하면 그 회차의 화면이 분석 중을 거쳐 결과로 바뀐다.
 * 보는 회차는 탭 밖(원고 도구 막대, 알림)에서도 고르므로 프로젝트마다 하나씩 둔다(focus.ts).
 * 판정 기록은 처음 화면에서 들어가는 한 장이다.
 */
export function SettingCheckView({ paneId, active }: WorkspaceViewProps) {
  const { projectId } = useWorkspace();
  const queryClient = useQueryClient();
  const tree = useFileTree(projectId);
  const summary = useSettingCheckSummary(projectId);
  const [focused, setFocused] = useFocusedChapter(projectId);
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const verdicts = useSettingCheckVerdicts(projectId);
  const start = useStartSettingCheck();

  // 본문만 고친 저장은 파일 트리를 다시 읽게 하지 않는다. 탭에 올 때 회차의 판을 새로 맞춘다.
  useEffect(() => {
    if (active)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.tree(projectId),
      });
  }, [active, projectId, queryClient]);

  const groups = useMemo(() => ledgerGroups(tree.data ?? []), [tree.data]);
  const chapters = useMemo(
    () => groups.flatMap((group) => group.chapters),
    [groups],
  );

  if (isUnavailable(summary.error))
    return (
      <div className={styles.state}>
        <PreparingState what={t("설정 오류 점검")} />
      </div>
    );
  if (tree.isError || summary.isError)
    return (
      <div className={styles.state}>
        <QueryFailure
          title={t("점검 기록을 불러오지 못했어요")}
          retrying={tree.isFetching || summary.isFetching}
          onRetry={() => {
            void tree.refetch();
            void summary.refetch();
          }}
        />
      </div>
    );
  if (tree.isPending || summary.isPending)
    return <div className={styles.state} aria-busy="true" />;
  if (chapters.length === 0)
    return (
      <div className={styles.state}>
        <EmptyState
          icon="scan-text"
          title={t("점검할 원고가 없어요")}
          description={t("원고 회차를 쓰면 여기에서 점검할 수 있어요.")}
        />
      </div>
    );

  const data = summary.data;
  const revisionOf = (chapter: DocumentNode) =>
    Math.max(
      chapter.revisionNo,
      queryClient.getQueryData<DocumentContent>(queryKeys.document(chapter.id))
        ?.revisionNo ?? 0,
    );
  const chapter = chapters.find((item) => item.id === focused);

  if (!chapter && ledgerOpen)
    return (
      <VerdictLedger
        chapterIds={new Set(chapters.map((item) => item.id))}
        paneId={paneId}
        onBack={() => setLedgerOpen(false)}
      />
    );

  if (!chapter)
    return (
      <Home
        groups={groups}
        history={historyOf(data, chapters)}
        running={data.running}
        pending={start.pending}
        decided={verdicts.data?.length}
        onStart={(documentId) => void start.begin(documentId)}
        onOpen={setFocused}
        onLedger={() => setLedgerOpen(true)}
      />
    );

  return (
    <Report
      key={chapter.id}
      chapter={chapter}
      revisionNo={revisionOf(chapter)}
      summary={data}
      paneId={paneId}
      starting={start.pending}
      onStart={() => void start.begin(chapter.id)}
      onBack={() => setFocused(null)}
    />
  );
}
