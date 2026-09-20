"use client";

import { useId, type ReactNode } from "react";

import { Button, Icon, IconButton } from "@/design-system/primitives";
import type { Memo, MemoScope } from "@/domain/models";
import { cx } from "@/shared/cx";

import styles from "./memo-editor.module.css";
import { useMemoDraft, type MemoDraftStatus } from "./use-memo-draft";

const STATUS_LABEL: Record<MemoDraftStatus, string> = {
  empty: "아직 저장 전이에요",
  saved: "저장됨",
  dirty: "저장하지 않은 변경",
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
  children?: ReactNode;
}) {
  const statusId = useId();
  const { body, status, change, save, dirty } = useMemoDraft({
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
        onKeyDown={(event) => {
          // 손을 떼지 않고 저장할 수 있게. 줄바꿈은 그냥 Enter 다.
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            void save();
          }
        }}
      />
      <div id={statusId} className={styles.status} aria-live="polite">
        {status === "error" ? (
          <span className={styles.error} role="alert">
            <Icon name="circle-alert" size={14} />
            {STATUS_LABEL.error}
          </span>
        ) : (
          <span>{STATUS_LABEL[status]}</span>
        )}
        {status === "error" ? (
          <Button
            size="sm"
            variant="primary"
            icon="rotate-ccw"
            onClick={() => void save()}
          >
            다시 시도
          </Button>
        ) : (
          <IconButton
            icon="check"
            iconSize={15}
            label={`${label} 저장`}
            title={`${label} 저장`}
            className={cx(styles.save, dirty && styles.saveReady)}
            disabled={!dirty || status === "saving"}
            onClick={() => void save()}
          />
        )}
      </div>
    </div>
  );
}
