"use client";

import { useEffect, useRef, useState } from "react";

import { Button, StatusNotice } from "@/components/ui";
import { WorkspaceIcon } from "@/features/workspace/icons";

import styles from "./global-feedback.module.css";

export type GlobalFeedbackState = "error" | "opened";

export interface GlobalFeedbackProps {
  buttonClassName?: string;
  copyFeedbackLink?: (url: string) => Promise<void>;
  feedbackUrl?: string;
  initialState?: GlobalFeedbackState;
  openExternal?: (url: string) => Window | null;
}

export function GlobalFeedback({
  buttonClassName,
  copyFeedbackLink,
  feedbackUrl,
  initialState,
  openExternal,
}: GlobalFeedbackProps) {
  const [status, setStatus] = useState<
    "copy-error" | "copied" | "error" | "idle" | "opened"
  >(initialState ?? "idle");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (status === "error") {
      requestAnimationFrame(() => retryRef.current?.focus());
    } else if (status === "opened") {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, [status]);

  const openFeedback = () => {
    let opened: Window | null = null;
    try {
      opened = feedbackUrl
        ? openExternal
          ? openExternal(feedbackUrl)
          : window.open(feedbackUrl, "_blank", "noopener,noreferrer")
        : null;
    } catch {
      opened = null;
    }
    setStatus(opened ? "opened" : "error");
  };

  const copyLink = async () => {
    if (!feedbackUrl) return;
    try {
      if (copyFeedbackLink) await copyFeedbackLink(feedbackUrl);
      else await navigator.clipboard.writeText(feedbackUrl);
      setStatus("copied");
      requestAnimationFrame(() => triggerRef.current?.focus());
    } catch {
      setStatus("copy-error");
    }
  };

  return (
    <div className={styles.root}>
      <button
        aria-label="피드백 보내기, 새 탭에서 열림"
        className={buttonClassName}
        onClick={openFeedback}
        ref={triggerRef}
        type="button"
      >
        <WorkspaceIcon name="message-square" />
        피드백 보내기
        <WorkspaceIcon name="external-link" />
      </button>
      {status === "opened" && (
        <StatusNotice className={styles.notice} variant="success">
          피드백 페이지를 새 탭에서 열었습니다.
        </StatusNotice>
      )}
      {(status === "error" || status === "copy-error") && (
        <StatusNotice className={styles.notice} variant="error">
          <span className={styles.noticeContent}>
            <span>
              {status === "copy-error"
                ? "피드백 링크를 복사하지 못했어요."
                : "피드백 페이지를 열지 못했어요."}
            </span>
            <span className={styles.actions}>
              <Button onClick={openFeedback} ref={retryRef}>
                다시 열기
              </Button>
              <Button disabled={!feedbackUrl} onClick={() => void copyLink()}>
                링크 복사
              </Button>
            </span>
          </span>
        </StatusNotice>
      )}
      {status === "copied" && (
        <StatusNotice className={styles.notice} variant="success">
          피드백 링크를 복사했어요.
        </StatusNotice>
      )}
    </div>
  );
}
