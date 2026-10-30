"use client";

import { useRef, useState } from "react";

import {
  Icon,
  Menu,
  Tooltip,
  type IconName,
  type MenuEntry,
} from "@/design-system/primitives";
import type { ExportFormat } from "@/domain/models";
import { t } from "@/i18n";

import { shortcutKeys } from "../workspace/shell/shortcuts";
import styles from "./file-header.module.css";

/**
 * `docx`·`hwp` 는 서버가 파일을 만들어야 하고 아직 없다. 누를 수 있게 두면 "받을 수 있다" 고
 * 안내한 뒤 아무 일도 일어나지 않는다 — 실제로 그렇게 보였다. 고를 수 없게 하고 이유를 적는다.
 */
const EXPORT_OPTIONS: Array<{
  format: ExportFormat;
  label: string;
  icon: IconName;
  pending?: boolean;
}> = [
  { format: "pdf", label: t("PDF로 내보내기"), icon: "printer" },
  {
    format: "docx",
    label: t("MS Word (.docx) — 준비 중"),
    icon: "file-text",
    pending: true,
  },
  { format: "md", label: t("마크다운 (.md)"), icon: "hash" },
  { format: "txt", label: t("텍스트 (.txt)"), icon: "type" },
  {
    format: "hwp",
    label: t("한글 오피스 (.hwp) — 준비 중"),
    icon: "file-type",
    pending: true,
  },
];

interface FileHeaderProps {
  memoOpen: boolean;
  locked: boolean;
  /** 그래프 최신화가 잠갔다. 눌러도 풀리지 않고, 왜 그런지 알린다 */
  refreshLocked: boolean;
  lockPending: boolean;
  exportPending?: boolean;
  onToggleMemo: () => void;
  onOpenVersions: () => void;
  onExport: (format: ExportFormat) => void;
  onToggleLock: () => void;
  /** 원고에만 있다. 이 회차를 설정 오류 점검에 맡긴다 */
  settingCheck?: { running: boolean; pending: boolean; onClick: () => void };
}

/** 파일 도구의 아이콘 단추. 이름은 호버 설명으로 보인다. */
function Action({
  icon,
  label,
  pressed,
  ref,
  ...rest
}: {
  icon: IconName;
  label: string;
  pressed?: boolean;
  /** 이 단추에 메뉴를 붙일 때 넘긴다. 없으면 호버 설명만 이 단추를 가리킨다 */
  ref?: React.RefObject<HTMLButtonElement | null>;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const own = useRef<HTMLButtonElement>(null);
  const anchor = ref ?? own;
  return (
    <>
      <button
        ref={anchor}
        type="button"
        className={styles.action}
        aria-pressed={pressed}
        aria-label={label}
        {...rest}
      >
        <Icon name={icon} size={16} />
      </button>
      <Tooltip anchorRef={anchor} label={label} />
    </>
  );
}

export function FileHeader({
  memoOpen,
  locked,
  refreshLocked,
  lockPending,
  exportPending = false,
  onToggleMemo,
  onOpenVersions,
  onExport,
  onToggleLock,
  settingCheck,
}: FileHeaderProps) {
  const checkRef = useRef<HTMLButtonElement>(null);
  const exportRef = useRef<HTMLButtonElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const entries: MenuEntry[] = EXPORT_OPTIONS.map((option) => ({
    id: option.format,
    label: option.label,
    icon: option.icon,
    // PDF 는 단축키로도 내보낸다(workspace/shell/shortcuts.ts).
    hint: option.format === "pdf" ? shortcutKeys("exportPdf") : undefined,
    disabled: option.pending || exportPending,
    onSelect: () => onExport(option.format),
  }));

  return (
    <div className={styles.header} role="group" aria-label={t("파일 도구")}>
      {settingCheck && (
        <>
          <button
            ref={checkRef}
            type="button"
            className={styles.check}
            aria-label={t("설정 오류 점검")}
            aria-busy={
              settingCheck.running || settingCheck.pending || undefined
            }
            disabled={settingCheck.pending}
            onClick={settingCheck.onClick}
          >
            <Icon
              name={settingCheck.running ? "loader-circle" : "scan-text"}
              size={15}
              className={settingCheck.running ? styles.spin : undefined}
            />
            <span className={styles.checkLabel}>{t("설정 오류 점검")}</span>
          </button>
          <Tooltip
            anchorRef={checkRef}
            label={
              settingCheck.running
                ? t("점검 중 · 결과 보기")
                : t("설정 오류 점검")
            }
          />
        </>
      )}
      <Action
        icon="notebook-pen"
        label={t("메모")}
        data-memo-toggle
        pressed={memoOpen}
        onClick={onToggleMemo}
      />
      <Action icon="history" label={t("버전")} onClick={onOpenVersions} />
      <Action
        ref={exportRef}
        icon="download"
        label={exportPending ? t("내보내기 중…") : t("내보내기")}
        disabled={exportPending}
        aria-busy={exportPending || undefined}
        aria-haspopup="menu"
        aria-expanded={exportOpen}
        onClick={() => setExportOpen((open) => !open)}
      />
      <Menu
        anchorRef={exportRef}
        open={exportOpen}
        onOpenChange={setExportOpen}
        label={t("내보내기 형식")}
        placement="bottom-end"
        width={240}
        itemHeight={38}
        entries={entries}
      />
      <Action
        icon={locked ? "lock" : "lock-open"}
        label={
          refreshLocked
            ? t("설정 문서 최신화로 잠김")
            : locked
              ? t("잠금 해제")
              : t("잠금")
        }
        pressed={locked}
        disabled={lockPending}
        onClick={onToggleLock}
      />
    </div>
  );
}
