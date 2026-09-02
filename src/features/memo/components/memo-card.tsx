import { type FocusEvent, forwardRef } from "react";

import { Menu, MenuItem } from "@/components/ui";
import type { MemoSaveStatus } from "@/features/memo/memo-model";
import { WorkspaceIcon } from "@/features/workspace/icons";

import styles from "./memo-card.module.css";

export type MemoCardVariant = "editor" | "file" | "project";

interface MemoCardProps {
  body: string;
  fileName?: string;
  label: string;
  memoId: string;
  onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  onChange: (body: string) => void;
  onDeleteRequest: (returnFocus: HTMLElement) => void;
  onOpenFile?: () => void;
  onRetry?: () => void;
  saveStatus: MemoSaveStatus;
  variant: MemoCardVariant;
}

export const MemoCard = forwardRef<HTMLTextAreaElement, MemoCardProps>(
  function MemoCard(
    {
      body,
      fileName,
      label,
      memoId,
      onBlur,
      onChange,
      onDeleteRequest,
      onOpenFile,
      onRetry,
      saveStatus,
      variant,
    },
    ref,
  ) {
    const filenameId = fileName
      ? `memo-file-${label.toLowerCase().replaceAll(/[^a-z0-9가-힣]+/g, "-")}`
      : undefined;

    return (
      <article
        aria-label={label}
        className={styles.wrapper}
        data-memo-id={memoId}
        data-variant={variant}
      >
        {fileName && (
          <header className={styles.fileHeader} id={filenameId}>
            <WorkspaceIcon name="file" />
            <strong>{fileName}</strong>
          </header>
        )}
        <div className={styles.editor}>
          <textarea
            aria-describedby={filenameId}
            aria-label={`${label} 본문`}
            onBlur={onBlur}
            onChange={(event) => onChange(event.target.value)}
            ref={ref}
            value={body}
          />
          <Menu
            buttonContent={<WorkspaceIcon name="ellipsis" />}
            buttonLabel={`${label} 더보기`}
            className={styles.menuControl}
          >
            {variant === "file" && onOpenFile && (
              <MenuItem onClick={onOpenFile}>
                <span className={styles.menuItemContent}>
                  <WorkspaceIcon name="external-link" />
                  파일로 이동
                </span>
              </MenuItem>
            )}
            {variant === "file" && onOpenFile && (
              <span className={styles.menuSeparator} role="separator" />
            )}
            <MenuItem
              onClick={(event) => {
                const trigger = event.currentTarget
                  .closest("article")
                  ?.querySelector<HTMLElement>("[aria-haspopup=menu]");
                if (trigger) onDeleteRequest(trigger);
              }}
            >
              <span className={styles.menuItemContent}>
                <WorkspaceIcon name="trash" />
                삭제
              </span>
            </MenuItem>
          </Menu>
          <span
            aria-live="polite"
            className={styles.status}
            data-status={saveStatus}
            role="status"
          >
            {saveStatus === "error" ? (
              <>
                <WorkspaceIcon name="circle-alert" />
                <span>저장하지 못했습니다</span>
                <button onClick={onRetry} type="button">
                  다시 시도
                </button>
              </>
            ) : saveStatus === "saving" ? (
              "저장 중…"
            ) : saveStatus === "saved" ? (
              "저장됨"
            ) : (
              "백엔드 연결 필요"
            )}
          </span>
        </div>
      </article>
    );
  },
);
