"use client";

import { useRef, useState } from "react";

import { Button, Dialog, DialogActions, StatusNotice } from "@/components/ui";
import { WorkspaceIcon } from "@/features/workspace/icons";

import type { ProjectSummary } from "../project-model";
import styles from "./project-list.module.css";

export type TrashProjectState = "confirmation" | "error" | "moving" | "success";

export interface TrashProjectDialogProps {
  initialState?: TrashProjectState;
  moveProjectToTrash?: (projectId: string) => Promise<void>;
  onMoved: (project: ProjectSummary) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  project?: ProjectSummary;
  returnFocus?: HTMLButtonElement | null;
}

export function TrashProjectDialog({
  initialState,
  moveProjectToTrash,
  onMoved,
  onOpenChange,
  open,
  project,
  returnFocus,
}: TrashProjectDialogProps) {
  const [status, setStatus] = useState<"error" | "idle" | "moving">(
    initialState === "moving"
      ? "moving"
      : initialState === "error"
        ? "error"
        : "idle",
  );
  const cancelRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    if (status === "moving") return;
    onOpenChange(false);
    requestAnimationFrame(() => returnFocus?.focus());
  };

  const move = async () => {
    if (!project || status === "moving") return;
    setStatus("moving");
    try {
      if (!moveProjectToTrash) throw new Error("missing backend adapter");
      await moveProjectToTrash(project.id);
      onMoved(project);
      setStatus("idle");
      onOpenChange(false);
    } catch {
      setStatus("error");
      requestAnimationFrame(() => cancelRef.current?.focus());
    }
  };

  return (
    <Dialog
      className={styles.projectDialog}
      description="프로젝트 안의 파일도 함께 이동합니다."
      initialFocusRef={cancelRef}
      onOpenChange={close}
      open={open}
      title="프로젝트를 휴지통으로 이동할까요?"
    >
      <div className={styles.trashTarget}>
        <WorkspaceIcon name="book" />
        <strong>{project?.title}</strong>
      </div>
      {status === "error" && (
        <StatusNotice className={styles.dialogNotice} variant="error">
          프로젝트를 이동하지 못했어요. 다시 시도해 주세요.
        </StatusNotice>
      )}
      <DialogActions>
        <Button disabled={status === "moving"} onClick={close} ref={cancelRef}>
          취소
        </Button>
        <Button
          icon={
            <WorkspaceIcon name={status === "error" ? "rotate-cw" : "trash"} />
          }
          isProcessing={status === "moving"}
          onClick={() => void move()}
          variant="primary"
        >
          {status === "moving"
            ? "이동 중…"
            : status === "error"
              ? "다시 시도"
              : "휴지통으로 이동"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
