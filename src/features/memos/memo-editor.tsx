"use client";

import { useId } from "react";

import { Button, Icon } from "@/design-system/primitives";
import type { Memo, MemoScope } from "@/domain/models";
import { cx } from "@/shared/cx";

import styles from "./memo-editor.module.css";
import { useMemoAutosave, type MemoSaveStatus } from "./use-memo-autosave";

const STATUS_LABEL: Record<MemoSaveStatus, string> = {
  empty: "아직 저장 전이에요",
  saved: "저장됨",
  pending: "저장 대기 중",
  saving: "저장 중…",
  error: "저장하지 못했어요",
};

export function MemoEditor({
  projectId,
  scope,
  fileId,
  memo,
  placeholder,
  label,
  autoFocus,
  variant = "card",
  className,
  children,
}: {
  projectId: string;
  scope: MemoScope;
  fileId: string | null;
  memo: Memo | null;
  placeholder: string;
  label: string;
  autoFocus?: boolean;
  variant?: "card" | "plain";
  className?: string;
  children?: React.ReactNode;
}) {
  const statusId = useId();
  const { body, status, change, retry, flush } = useMemoAutosave({
    projectId,
    scope,
    fileId,
    memo,
  });
  return (
    <div
      className={cx(
        styles.editor,
        variant === "plain" && styles.plain,
        status === "empty" && styles.fresh,
        className,
      )}
    >
      {children}
      <textarea
        className={styles.textarea}
        value={body}
        placeholder={placeholder}
        aria-label={label}
        aria-describedby={statusId}
        autoFocus={autoFocus}
        onChange={(event) => change(event.target.value)}
        onBlur={() => void flush()}
      />
      <div id={statusId} className={styles.status} aria-live="polite">
        {status === "error" ? (
          <>
            <span className={styles.error} role="alert">
              <Icon name="circle-alert" size={14} />
              {STATUS_LABEL.error}
            </span>
            <Button
              size="sm"
              variant="primary"
              icon="rotate-ccw"
              onClick={() => void retry()}
            >
              다시 시도
            </Button>
          </>
        ) : (
          STATUS_LABEL[status]
        )}
      </div>
    </div>
  );
}
