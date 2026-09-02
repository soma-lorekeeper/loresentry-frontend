import { type FocusEvent, forwardRef } from "react";

import { WorkspaceIcon } from "@/features/workspace/icons";
import type { MemoSaveStatus } from "@/features/memo/memo-model";

import styles from "./memo-card.module.css";

export type MemoCardVariant = "editor" | "file" | "project";

interface MemoCardProps {
  body: string;
  fileName?: string;
  label: string;
  onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  onChange: (body: string) => void;
  onRetry?: () => void;
  saveStatus: MemoSaveStatus;
  variant: MemoCardVariant;
}

export const MemoCard = forwardRef<HTMLTextAreaElement, MemoCardProps>(
  function MemoCard(
    { body, fileName, label, onBlur, onChange, onRetry, saveStatus, variant },
    ref,
  ) {
    const filenameId = fileName
      ? `memo-file-${label.toLowerCase().replaceAll(/[^a-z0-9가-힣]+/g, "-")}`
      : undefined;

    return (
      <article
        aria-label={label}
        className={styles.wrapper}
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
