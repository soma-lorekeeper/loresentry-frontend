"use client";

import { useRef, useState } from "react";

import {
  Icon,
  Menu,
  type IconName,
  type MenuEntry,
} from "@/design-system/primitives";
import type { ExportFormat } from "@/domain/models";
import { t } from "@/i18n";

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
  lockPending: boolean;
  onToggleMemo: () => void;
  onOpenVersions: () => void;
  onExport: (format: ExportFormat) => void;
  onToggleLock: () => void;
}

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
  ref?: React.Ref<HTMLButtonElement>;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      ref={ref}
      type="button"
      className={styles.action}
      aria-pressed={pressed}
      aria-label={label}
      title={label}
      {...rest}
    >
      <Icon name={icon} size={16} />
    </button>
  );
}

export function FileHeader({
  memoOpen,
  locked,
  lockPending,
  onToggleMemo,
  onOpenVersions,
  onExport,
  onToggleLock,
}: FileHeaderProps) {
  const exportRef = useRef<HTMLButtonElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const entries: MenuEntry[] = EXPORT_OPTIONS.map((option) => ({
    id: option.format,
    label: option.label,
    icon: option.icon,
    disabled: option.pending,
    onSelect: () => onExport(option.format),
  }));

  return (
    <div className={styles.header} role="group" aria-label={t("파일 도구")}>
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
        label={t("내보내기")}
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
        label={t("잠금")}
        pressed={locked}
        aria-label={locked ? t("잠금 해제") : t("잠금")}
        disabled={lockPending}
        onClick={onToggleLock}
      />
    </div>
  );
}
