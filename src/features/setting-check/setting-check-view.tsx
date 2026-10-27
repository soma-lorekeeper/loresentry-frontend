"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  Button,
  EmptyState,
  Icon,
  Menu,
  type MenuEntry,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { DocumentContent, DocumentNode } from "@/domain/models";
import type { SettingCheckSummary } from "@/domain/setting-check";
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

import { ChapterStatusLine, statusView } from "./chapter-status";
import { useFocusedChapter } from "./focus";
import {
  chapterStatus,
  defaultChapter,
  ledgerGroups,
  type ChapterStatus,
  type LedgerGroup,
} from "./ledger";
import { useSettingCheckSummary } from "./queries";
import { Report } from "./report";
import styles from "./setting-check.module.css";
import { useStartSettingCheck } from "./use-start-check";

function groupTitle(group: LedgerGroup) {
  return group.episode?.title ?? DOCUMENT_TYPE_META.manuscript.label;
}

function Ledger({
  groups,
  selectedId,
  statusOf,
  starting,
  onSelect,
  onStart,
}: {
  groups: LedgerGroup[];
  selectedId: string | null;
  statusOf: (chapter: DocumentNode) => ChapterStatus;
  starting: string | null;
  onSelect: (documentId: string) => void;
  onStart: (documentId: string) => void;
}) {
  return (
    <nav className={styles.ledger} aria-label={t("회차")}>
      <h1 className={styles.title}>{t("설정 오류 점검")}</h1>
      {groups.map((group) => (
        <section key={group.id} aria-label={groupTitle(group)}>
          <h2 className={styles.episode}>{groupTitle(group)}</h2>
          <ul className={styles.chapters}>
            {group.chapters.map((chapter) => {
              const status = statusOf(chapter);
              const startable = status.kind === "unchecked";
              return (
                <li
                  key={chapter.id}
                  className={styles.chapter}
                  data-startable={startable || undefined}
                >
                  <button
                    type="button"
                    className={styles.chapterButton}
                    data-kind="manuscript"
                    aria-current={chapter.id === selectedId || undefined}
                    onClick={() => onSelect(chapter.id)}
                  >
                    <Icon name="file-text" size={15} />
                    <span className={styles.chapterTitle}>{chapter.title}</span>
                    <ChapterStatusLine status={status} />
                  </button>
                  {startable && (
                    <Button
                      icon="scan-text"
                      className={styles.start}
                      busy={starting === chapter.id}
                      aria-label={t("{title} 점검", { title: chapter.title })}
                      onClick={() => onStart(chapter.id)}
                    >
                      {t("점검")}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </nav>
  );
}

function ChapterPicker({
  groups,
  selected,
  statusOf,
  onSelect,
}: {
  groups: LedgerGroup[];
  selected: DocumentNode;
  statusOf: (chapter: DocumentNode) => ChapterStatus;
  onSelect: (documentId: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const entries: MenuEntry[] = groups.flatMap((group) => [
    {
      type: "group" as const,
      id: `group-${group.id}`,
      label: groupTitle(group),
    },
    ...group.chapters.map((chapter) => ({
      id: chapter.id,
      label: chapter.title,
      icon: "file-text" as const,
      kind: "manuscript",
      hint: statusView(statusOf(chapter)).text,
      checked: chapter.id === selected.id,
      onSelect: () => onSelect(chapter.id),
    })),
  ]);
  return (
    <div className={styles.narrowHead}>
      <h1 className={styles.title}>{t("설정 오류 점검")}</h1>
      <button
        ref={ref}
        type="button"
        className={styles.picker}
        data-kind="manuscript"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("회차 고르기: {title}", { title: selected.title })}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="file-text" size={15} />
        <span className={styles.pickerText}>
          <span className={styles.chapterTitle}>{selected.title}</span>
          <ChapterStatusLine status={statusOf(selected)} />
        </span>
        <Icon name="chevron-down" size={15} />
      </button>
      <Menu
        anchorRef={ref}
        open={open}
        onOpenChange={setOpen}
        label={t("회차")}
        placement="bottom-start"
        width={340}
        entries={entries}
      />
    </div>
  );
}

/**
 * 설정 오류 점검 탭. 왼쪽은 원고 회차와 그 회차의 마지막 점검, 오른쪽은 고른 회차의 결과다.
 * 창이 좁으면 회차 목록이 결과 위의 고르기 단추로 접힌다.
 */
export function SettingCheckView({ paneId, active }: WorkspaceViewProps) {
  const { projectId } = useWorkspace();
  const queryClient = useQueryClient();
  const tree = useFileTree(projectId);
  const summary = useSettingCheckSummary(projectId);
  const [focused, setFocused] = useFocusedChapter(projectId);
  const start = useStartSettingCheck();
  const [starting, setStarting] = useState<string | null>(null);

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

  const data: SettingCheckSummary = summary.data;
  const revisionOf = (chapter: DocumentNode) =>
    Math.max(
      chapter.revisionNo,
      queryClient.getQueryData<DocumentContent>(queryKeys.document(chapter.id))
        ?.revisionNo ?? 0,
    );
  const statusOf = (chapter: DocumentNode) =>
    chapterStatus(chapter.id, revisionOf(chapter), data);
  const selectedId =
    focused && chapters.some((chapter) => chapter.id === focused)
      ? focused
      : defaultChapter(chapters, data);
  const selected = chapters.find((chapter) => chapter.id === selectedId)!;

  const begin = (documentId: string) => {
    setStarting(documentId);
    void start.begin(documentId).finally(() => setStarting(null));
  };

  return (
    <div className={styles.view}>
      <Ledger
        groups={groups}
        selectedId={selected.id}
        statusOf={statusOf}
        starting={starting}
        onSelect={setFocused}
        onStart={begin}
      />
      <div className={styles.report}>
        <div className={styles.reportInner}>
          <ChapterPicker
            groups={groups}
            selected={selected}
            statusOf={statusOf}
            onSelect={setFocused}
          />
          <Report
            key={selected.id}
            chapter={selected}
            revisionNo={revisionOf(selected)}
            summary={data}
            paneId={paneId}
            starting={start.pending}
            onStart={() => begin(selected.id)}
          />
        </div>
      </div>
    </div>
  );
}
