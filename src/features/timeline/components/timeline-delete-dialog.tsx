"use client";

import { useRef } from "react";

import { Button, Dialog, DialogActions } from "@/components/ui";
import { WorkspaceIcon } from "@/features/workspace/icons";

import {
  formatTimelineItemTime,
  type TimelineItem,
  timelineTypeLabels,
} from "../timeline-model";
import styles from "./timeline-delete-dialog.module.css";

interface TimelineDeleteDialogProps {
  deleting?: boolean;
  error?: string;
  eventTitle: string;
  onCancel: () => void;
  onConfirm: () => void;
  target?: TimelineItem;
}

export function TimelineDeleteDialog({
  deleting = false,
  error,
  eventTitle,
  onCancel,
  onConfirm,
  target,
}: TimelineDeleteDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const time = target ? formatTimelineItemTime(target).replace(" · ", " ") : "";

  return (
    <Dialog
      className={styles.dialog}
      description="항목과 이 항목이 만든 파일 관계가 함께 삭제됩니다."
      initialFocusRef={cancelRef}
      onOpenChange={(open) => {
        if (!open && !deleting) onCancel();
      }}
      open={Boolean(target)}
      title={
        <span className={styles.title}>
          <span aria-hidden="true" className={styles.marker}>
            <WorkspaceIcon name="trash" />
          </span>
          <span>시간 항목을 삭제할까요?</span>
        </span>
      }
    >
      {target && (
        <div
          aria-label={`삭제할 시간 항목: ${target.title}`}
          className={styles.target}
        >
          <strong>
            {eventTitle} · {timelineTypeLabels[target.type]}
          </strong>
          <span>
            {target.title} · {time}
          </span>
        </div>
      )}
      {error && (
        <p aria-live="assertive" className={styles.error} role="alert">
          {error}
        </p>
      )}
      <DialogActions>
        <Button disabled={deleting} onClick={onCancel} ref={cancelRef}>
          취소
        </Button>
        <Button isProcessing={deleting} onClick={onConfirm} variant="primary">
          {error ? "다시 시도" : "삭제"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
