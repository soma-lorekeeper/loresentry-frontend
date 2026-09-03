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

export type CreateProjectState =
  "error" | "initial" | "ready" | "required-error" | "submitting";

export interface CreateProjectResult {
  id: string;
}

export interface CreateProjectDialogProps {
  createProject?: (input: { title: string }) => Promise<CreateProjectResult>;
  initialState?: CreateProjectState;
  onCreated: (project: ProjectSummary) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
}

function initialDraft(state?: CreateProjectState) {
  return state === "ready" || state === "submitting" || state === "error"
    ? "유리 정원의 기록"
    : "";
}

function errorCopy(error?: ProjectTitleError) {
  if (error === "required") return "프로젝트 제목을 입력해 주세요.";
  if (error === "too-long") return "프로젝트 제목은 255자 이하여야 해요.";
}

export function CreateProjectDialog({
  createProject,
  initialState,
  onCreated,
  onOpenChange,
  open,
}: CreateProjectDialogProps) {
  const [draft, setDraft] = useState(() => initialDraft(initialState));
  const [status, setStatus] = useState<"error" | "idle" | "submitting">(
    initialState === "submitting"
      ? "submitting"
      : initialState === "error"
        ? "error"
        : "idle",
  );
  const [titleError, setTitleError] = useState<ProjectTitleError | undefined>(
    initialState === "required-error" ? "required" : undefined,
  );
  const [duplicateError, setDuplicateError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalized = draft.trim();

  const close = () => {
    if (status === "submitting") return;
    onOpenChange(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "submitting") return;
    const validationError = validateProjectTitle(draft);
    if (validationError) {
      setTitleError(validationError);
      inputRef.current?.focus();
      return;
    }

    setStatus("submitting");
    setDuplicateError(false);
    try {
      if (!createProject) throw new Error("missing backend adapter");
      const result = await createProject({ title: normalized });
      if (!result.id.trim()) throw new Error("invalid project id");
      onCreated({
        id: result.id,
        lastActiveAt: new Date().toISOString(),
        lastActiveLabel: "방금 생성됨",
        title: normalized,
      });
      setStatus("idle");
      setDraft("");
      onOpenChange(false);
    } catch (error) {
      const code =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";
      setDuplicateError(code === "DUPLICATE_PROJECT_TITLE");
      setStatus("error");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  const visibleError = duplicateError
    ? "같은 제목의 프로젝트가 이미 있어요."
    : errorCopy(titleError);

  return (
    <Dialog
      className={styles.projectDialog}
      description="제목은 나중에도 바꿀 수 있어요."
      initialFocusRef={inputRef}
      onOpenChange={close}
      open={open}
      title="새 프로젝트 만들기"
    >
      <form noValidate onSubmit={(event) => void submit(event)}>
        <TextField
          autoComplete="off"
          description={`${normalized.length}/${PROJECT_TITLE_MAX_LENGTH}자`}
          disabled={status === "submitting"}
          error={visibleError}
          id="new-project-title"
          label="프로젝트 제목"
          onChange={(event) => {
            setDraft(event.target.value);
            setTitleError(undefined);
            setDuplicateError(false);
            if (status === "error") setStatus("idle");
          }}
          placeholder="예: 유리 정원의 기록"
          ref={inputRef}
          required
          value={draft}
        />
        {status === "error" && !duplicateError && (
          <StatusNotice className={styles.dialogNotice} variant="error">
            프로젝트를 만들지 못했어요. 입력한 제목을 확인하고 다시 시도해
            주세요.
          </StatusNotice>
        )}
        <DialogActions>
          <Button disabled={status === "submitting"} onClick={close}>
            취소
          </Button>
          <Button
            isProcessing={status === "submitting"}
            type="submit"
            variant="primary"
          >
            {status === "submitting" ? "만드는 중…" : "프로젝트 만들기"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
