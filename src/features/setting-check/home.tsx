"use client";

import { useRef, useState } from "react";

import { Button, Icon, Menu, type MenuEntry } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { DocumentNode } from "@/domain/models";
import type { SettingCheckRun } from "@/domain/setting-check";
import { t } from "@/i18n";
import { checkTimeLabel } from "@/shared/format";

import type { LedgerGroup } from "./ledger";
import styles from "./setting-check.module.css";

function groupTitle(group: LedgerGroup) {
  return group.episode?.title ?? DOCUMENT_TYPE_META.manuscript.label;
}

function resultOf(run: SettingCheckRun) {
  switch (run.status) {
    case "RUNNING":
      return { text: t("분석 중"), tone: "running" as const };
    case "FAILED":
      return { text: t("점검하지 못함"), tone: null };
    case "CANCELLED":
      return { text: t("취소함"), tone: null };
    case "DONE":
      return run.counts.open > 0
        ? {
            text: t("설정 충돌 {count}", { count: run.counts.open }),
            tone: "open" as const,
          }
        : { text: t("설정 충돌 없음"), tone: null };
  }
}

function ChapterPicker({
  groups,
  selected,
  onSelect,
}: {
  groups: LedgerGroup[];
  selected: DocumentNode;
  onSelect: (documentId: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(420);
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
      checked: chapter.id === selected.id,
      onSelect: () => onSelect(chapter.id),
    })),
  ]);
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={styles.picker}
        data-kind="manuscript"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("점검할 원고: {title}", { title: selected.title })}
        onClick={() => {
          if (ref.current) setWidth(ref.current.offsetWidth);
          setOpen((value) => !value);
        }}
      >
        <Icon name="file-text" size={16} />
        <span>{selected.title}</span>
        <Icon name="chevrons-up-down" size={14} />
      </button>
      <Menu
        anchorRef={ref}
        open={open}
        onOpenChange={setOpen}
        label={t("점검할 원고")}
        placement="bottom-start"
        width={width}
        className={styles.pickerMenu}
        entries={entries}
      />
    </>
  );
}

/** 설정 오류 점검의 처음 화면. 원고 한 편을 골라 점검하거나, 지난 점검의 결과를 연다 */
export function Home({
  groups,
  history,
  running,
  pending,
  decided,
  onStart,
  onOpen,
  onLedger,
}: {
  groups: LedgerGroup[];
  history: Array<{ chapter: DocumentNode; run: SettingCheckRun }>;
  running: SettingCheckRun | null;
  pending: boolean;
  /** 판정 기록에 남은 곳의 수. 아직 읽지 못했으면 undefined */
  decided: number | undefined;
  onStart: (documentId: string) => void;
  onOpen: (documentId: string) => void;
  onLedger: () => void;
}) {
  const chapters = groups.flatMap((group) => group.chapters);
  const [picked, setPicked] = useState(chapters[0].id);
  const selected =
    chapters.find((chapter) => chapter.id === picked) ?? chapters[0];

  return (
    <div className={styles.page}>
      <div className={styles.home}>
        <div className={styles.homeHead}>
          <h1 className={styles.title}>{t("설정 오류 점검")}</h1>
          <Button variant="ghost" icon="notebook-pen" onClick={onLedger}>
            {decided
              ? t("판정 기록 {count}", { count: decided })
              : t("판정 기록")}
          </Button>
        </div>
        <p className={styles.lede}>
          {t("원고 한 편을 앞 회차와 설정 문서에 대조해 설정 충돌을 찾아요.")}
        </p>
        <div className={styles.pickRow}>
          <ChapterPicker
            groups={groups}
            selected={selected}
            onSelect={setPicked}
          />
          <Button
            size="lg"
            variant="primary"
            icon="scan-text"
            className={styles.go}
            busy={pending}
            disabled={running !== null}
            onClick={() => onStart(selected.id)}
          >
            {t("점검")}
          </Button>
        </div>
        {running && (
          <p className={styles.wait}>
            {t("{title} 점검이 끝나면 시작할 수 있어요.", {
              title: running.documentTitle,
            })}
          </p>
        )}
        {history.length > 0 && (
          <>
            <h2 className={`${styles.label} ${styles.historyLabel}`}>
              {t("지난 점검")}
            </h2>
            <ul className={styles.history}>
              {history.map(({ chapter, run }) => {
                const result = resultOf(run);
                return (
                  <li key={chapter.id}>
                    <button
                      type="button"
                      className={styles.historyRow}
                      onClick={() => onOpen(chapter.id)}
                    >
                      <span className={styles.historyTitle}>
                        {chapter.title}
                      </span>
                      <span
                        className={styles.historyResult}
                        data-open={result.tone === "open" || undefined}
                        data-running={result.tone === "running" || undefined}
                      >
                        {result.tone === "running" && (
                          <Icon
                            name="loader-circle"
                            size={13}
                            className={styles.spin}
                          />
                        )}
                        {result.text}
                      </span>
                      <span className={styles.historyTime}>
                        {checkTimeLabel(run.finishedAt ?? run.createdAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
