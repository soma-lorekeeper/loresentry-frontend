"use client";

import { useRef, useState } from "react";

import {
  Icon,
  Menu,
  type IconName,
  type MenuEntry,
} from "@/design-system/primitives";
import type { ExportFormat } from "@/domain/models";

import styles from "./file-header.module.css";

const EXPORT_OPTIONS: Array<{
  format: ExportFormat;
  label: string;
  icon: IconName;
}> = [
  { format: "pdf", label: "PDF로 내보내기", icon: "printer" },
  { format: "docx", label: "MS Word (.docx)", icon: "file-text" },
  { format: "md", label: "마크다운 (.md)", icon: "hash" },
  { format: "txt", label: "텍스트 (.txt)", icon: "type" },
  { format: "hwp", label: "한글 오피스 (.hwp)", icon: "file-type" },
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
      {...rest}
    >
      <Icon name={icon} size={14} />
      {label}
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
    onSelect: () => onExport(option.format),
  }));

  return (
    <div className={styles.header} role="toolbar" aria-label="파일 도구">
      <Action
        icon="notebook-pen"
        label="메모"
        pressed={memoOpen}
        onClick={onToggleMemo}
      />
      <Action icon="history" label="버전" onClick={onOpenVersions} />
      <Action
        ref={exportRef}
        icon="download"
        label="내보내기"
        aria-haspopup="menu"
        aria-expanded={exportOpen}
        onClick={() => setExportOpen((open) => !open)}
      />
      <Menu
        anchorRef={exportRef}
        open={exportOpen}
        onOpenChange={setExportOpen}
        label="내보내기 형식"
        placement="bottom-end"
        width={240}
        itemHeight={38}
        entries={entries}
      />
      <Action
        icon={locked ? "lock" : "lock-open"}
        label="잠금"
        pressed={locked}
        aria-label={locked ? "잠금 해제" : "잠금"}
        disabled={lockPending}
        onClick={onToggleLock}
      />
    </div>
  );
}
