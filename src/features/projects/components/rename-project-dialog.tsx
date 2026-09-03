"use client";

import { type FormEvent, useRef, useState } from "react";

import {
  Button,
  Dialog,
  DialogActions,
  StatusNotice,
  TextField,
} from "@/components/ui";

import {
  PROJECT_TITLE_MAX_LENGTH,
  validateProjectTitle,
  type ProjectSummary,
  type ProjectTitleError,
} from "../project-model";
import styles from "./project-list.module.css";

export type RenameProjectState =
  "current" | "error" | "invalid" | "ready" | "saving" | "success";

export interface RenameProjectDialogProps {
  initialState?: RenameProjectState;
  onOpenChange: (open: boolean) => void;
  onRenamed: (projectId: string, title: string) => void;
  open: boolean;
  project?: ProjectSummary;
  renameProject?: (projectId: string, title: string) => Promise<void>;
  returnFocus?: HTMLButtonElement | null;
}

function initialDraft(
  project: ProjectSummary | undefined,
  state?: RenameProjectState,
) {
  if (!project) return "";
  if (state === "invalid") return "가".repeat(PROJECT_TITLE_MAX_LENGTH + 1);
  if (state === "ready" || state === "saving" || state === "error") {
    return `${project.title} 개정판`;
  }
  return project.title;
}

function errorCopy(error?: ProjectTitleError) {
  if (error === "required") return "프로젝트 제목을 입력해 주세요.";
  if (error === "too-long") return "프로젝트 제목은 255자 이하여야 해요.";
}

export function RenameProjectDialog({
  initialState,
  onOpenChange,
  onRenamed,
  open,
  project,
  renameProject,
  returnFocus,
}: RenameProjectDialogProps) {
  const [draft, setDraft] = useState(() => initialDraft(project, initialState));
  const [status, setStatus] = useState<"error" | "idle" | "saving">(
    initialState === "saving"
      ? "saving"
      : initialState === "error"
        ? "error"
        : "idle",
  );
  const [titleError, setTitleError] = useState<ProjectTitleError | undefined>(
    initialState === "invalid" ? "too-long" : undefined,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const normalized = draft.trim();
  const unchanged = normalized === project?.title;
  const close = () => {
    if (status === "saving") return;
    onOpenChange(false);
    requestAnimationFrame(() => returnFocus?.focus());
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!project || status === "saving" || unchanged) return;
    const validationError = validateProjectTitle(draft);
    if (validationError) {
      setTitleError(validationError);
      inputRef.current?.focus();
      return;
    }

    setStatus("saving");
    try {
      if (!renameProject) throw new Error("missing backend adapter");
      await renameProject(project.id, normalized);
      onRenamed(project.id, normalized);
      setStatus("idle");
      onOpenChange(false);
      requestAnimationFrame(() => returnFocus?.focus());
    } catch {
      setStatus("error");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <Dialog
      className={styles.projectDialog}
      description="프로젝트 안의 파일과 내용은 그대로 유지됩니다."
      initialFocusRef={inputRef}
      onOpenChange={close}
      open={open}
      title="프로젝트 이름 변경"
    >
      <form noValidate onSubmit={(event) => void submit(event)}>
        <TextField
          autoComplete="off"
          description={`${normalized.length}/${PROJECT_TITLE_MAX_LENGTH}자`}
          disabled={status === "saving"}
          error={errorCopy(titleError)}
          id="rename-project-title"
          label="프로젝트 제목"
          onChange={(event) => {
            setDraft(event.target.value);
            setTitleError(undefined);
            if (status === "error") setStatus("idle");
          }}
          ref={inputRef}
          required
          value={draft}
        />
        {status === "error" && (
          <StatusNotice className={styles.dialogNotice} variant="error">
            프로젝트 이름을 변경하지 못했어요. 입력한 제목은 유지됩니다.
          </StatusNotice>
        )}
        <DialogActions>
          <Button disabled={status === "saving"} onClick={close}>
            취소
          </Button>
          <Button
            disabled={unchanged || Boolean(validateProjectTitle(draft))}
            isProcessing={status === "saving"}
            type="submit"
            variant="primary"
          >
            {status === "saving" ? "저장 중…" : "변경사항 저장"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
