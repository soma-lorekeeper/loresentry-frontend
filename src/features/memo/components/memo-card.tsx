import { type FocusEvent, forwardRef } from "react";

import { WorkspaceIcon } from "@/features/workspace/icons";

import styles from "./memo-card.module.css";

export type MemoCardVariant = "editor" | "file" | "project";

interface MemoCardProps {
  body: string;
  fileName?: string;
  label: string;
  onBlur?: (event: FocusEvent<HTMLTextAreaElement>) => void;
  onChange: (body: string) => void;
  variant: MemoCardVariant;
}

export const MemoCard = forwardRef<HTMLTextAreaElement, MemoCardProps>(
  function MemoCard({ body, fileName, label, onBlur, onChange, variant }, ref) {
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
          <span className={styles.status}>백엔드 연결 전</span>
        </div>
      </article>
    );
  },
);
