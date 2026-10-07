"use client";

import { useState } from "react";

import {
  Button,
  DialogCard,
  InlineNotice,
  TextAreaField,
  TextField,
} from "@/design-system/primitives";
import type { Project } from "@/domain/models";
import { t } from "@/i18n";
import { isServiceError } from "@/services/errors";
import { PROJECT_TITLE_MAX } from "@/services/mock/projects";

import styles from "./project-dialogs.module.css";
import { useCreateProject, useTrashProject, useUpdateProject } from "./queries";

const DESCRIPTION_MAX = 500;

function fieldErrorOf(error: unknown) {
  return isServiceError(error) &&
    (error.code === "duplicate" || error.code === "validation")
    ? error.message
    : undefined;
}

function serverErrorOf(error: unknown): boolean {
  return Boolean(error) && !fieldErrorOf(error);
}

export function CreateProjectDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  return (
    <CreateProjectForm
      key={open ? "open" : "closed"}
      open={open}
      onClose={onClose}
      onCreated={onCreated}
    />
  );
}

function CreateProjectForm({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (project: Project) => void;
}) {
  const create = useCreateProject();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [touched, setTouched] = useState(false);
  const empty = title.trim().length === 0;
  const busy = create.isPending;

  const submit = () => {
    setTouched(true);
    if (empty || busy) return;
    create.mutate(
      { title, description },
      { onSuccess: (project) => onCreated(project) },
    );
  };

  const fieldError =
    touched && empty
      ? t("프로젝트 제목을 입력해 주세요.")
      : fieldErrorOf(create.error);

  return (
    <DialogCard
      open={open}
      onClose={() => !busy && onClose()}
      dismissible={!busy}
      size="md"
      title={t("새 프로젝트 만들기")}
      closeLabel={t("새 프로젝트 만들기 닫기")}
      closeDisabled={busy}
      actions={
        <>
          <Button
            size="md"
            className={styles.cancel}
            onClick={onClose}
            disabled={busy}
          >
            {t("취소")}
          </Button>
          <Button
            size="md"
            variant="primary"
            icon={serverErrorOf(create.error) ? "rotate-cw" : "plus"}
            busy={busy}
            disabled={empty}
            onClick={submit}
          >
            {busy
              ? t("프로젝트 만드는 중…")
              : serverErrorOf(create.error)
                ? t("다시 시도")
                : t("프로젝트 만들기")}
          </Button>
        </>
      }
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <TextField
          label={t("프로젝트 제목")}
          required
          autoFocus
          placeholder={t("프로젝트 제목을 입력하세요")}
          value={title}
          maxLength={PROJECT_TITLE_MAX}
          onChange={(event) => {
            setTitle(event.target.value.slice(0, PROJECT_TITLE_MAX));
            if (create.error) create.reset();
          }}
          onBlur={() => setTouched(true)}
          readOnly={busy}
          error={fieldError}
        />
        <TextAreaField
          label={t("설명")}
          labelHint={t("선택")}
          placeholder={t("어떤 이야기인지 짧게 적어 두세요")}
          value={description}
          rows={3}
          maxLength={DESCRIPTION_MAX}
          onChange={(event) =>
            setDescription(event.target.value.slice(0, DESCRIPTION_MAX))
          }
          readOnly={busy}
        />
        {serverErrorOf(create.error) && (
          <InlineNotice>
            {t(
              "프로젝트를 만들지 못했어요. 입력을 유지했으니 다시 시도해 주세요.",
            )}
          </InlineNotice>
        )}
      </form>
    </DialogCard>
  );
}

export function EditProjectDialog({
  project,
  onClose,
  onSaved,
}: {
  project: Project | null;
  onClose: () => void;
  onSaved: (project: Project) => void;
}) {
  return (
    <EditProjectForm
      key={project?.id ?? "none"}
      project={project}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}

function EditProjectForm({
  project,
  onClose,
  onSaved,
}: {
  project: Project | null;
  onClose: () => void;
  onSaved: (project: Project) => void;
}) {
  const update = useUpdateProject();
  const [title, setTitle] = useState(project?.title ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const busy = update.isPending;
  const trimmed = title.trim();
  const unchanged =
    trimmed === project?.title &&
    description.trim() === (project?.description ?? "");
  const empty = trimmed.length === 0;

  const submit = () => {
    if (!project || empty || unchanged || busy) return;
    update.mutate(
      {
        projectId: project.id,
        title: trimmed,
        description: description.trim(),
      },
      { onSuccess: onSaved },
    );
  };

  return (
    <DialogCard
      open={project !== null}
      onClose={() => !busy && onClose()}
      dismissible={!busy}
      size="md"
      title={t("프로젝트 수정")}
      closeLabel={t("프로젝트 수정 닫기")}
      closeDisabled={busy}
      actions={
        <>
          <Button
            size="md"
            className={styles.cancel}
            onClick={onClose}
            disabled={busy}
          >
            {t("취소")}
          </Button>
          <Button
            size="md"
            variant="primary"
            icon={serverErrorOf(update.error) ? "rotate-cw" : "check"}
            busy={busy}
            disabled={empty || unchanged}
            onClick={submit}
          >
            {busy
              ? t("저장 중…")
              : serverErrorOf(update.error)
                ? t("다시 시도")
                : t("저장")}
          </Button>
        </>
      }
    >
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <TextField
          label={t("프로젝트 이름")}
          required
          autoFocus
          placeholder={t("프로젝트 이름을 입력하세요")}
          value={title}
          maxLength={PROJECT_TITLE_MAX}
          onChange={(event) => {
            setTitle(event.target.value.slice(0, PROJECT_TITLE_MAX));
            if (update.error) update.reset();
          }}
          readOnly={busy}
          error={
            empty
              ? t("프로젝트 이름을 입력해 주세요.")
              : fieldErrorOf(update.error)
          }
        />
        <TextAreaField
          label={t("설명")}
          labelHint={t("선택")}
          placeholder={t("어떤 이야기인지 짧게 적어 두세요")}
          value={description}
          rows={3}
          maxLength={DESCRIPTION_MAX}
          onChange={(event) => {
            setDescription(event.target.value.slice(0, DESCRIPTION_MAX));
            if (update.error) update.reset();
          }}
          readOnly={busy}
        />
      </form>
      {serverErrorOf(update.error) && (
        <InlineNotice>
          {t("변경한 내용을 저장하지 못했어요. 입력은 그대로 두었어요.")}
        </InlineNotice>
      )}
    </DialogCard>
  );
}

export function TrashProjectDialog({
  project,
  onClose,
  onTrashed,
}: {
  project: Project | null;
  onClose: () => void;
  onTrashed: (project: Project) => void;
}) {
  const trash = useTrashProject();
  const busy = trash.isPending;

  const close = () => {
    if (busy) return;
    trash.reset();
    onClose();
  };

  const confirm = () => {
    if (!project) return;
    trash.mutate(project.id, {
      onSuccess: () => {
        trash.reset();
        onTrashed(project);
      },
    });
  };

  return (
    <DialogCard
      open={project !== null}
      onClose={close}
      dismissible={!busy}
      size="md"
      compact
      title={t("프로젝트를 휴지통으로 이동할까요?")}
      description={t(
        "파일과 설정은 그대로 남고, 휴지통에서 다시 복원할 수 있어요.",
      )}
      target={project ? { icon: project.icon, name: project.title } : undefined}
      actions={
        <>
          <Button
            size="md"
            className={busy || trash.isError ? styles.cancel : styles.ghost}
            onClick={close}
            disabled={busy}
          >
            {t("취소")}
          </Button>
          <Button
            size="md"
            variant="primary"
            icon={trash.isError ? "rotate-cw" : "trash-2"}
            busy={busy}
            onClick={confirm}
          >
            {busy
              ? t("이동 중…")
              : trash.isError
                ? t("다시 시도")
                : t("휴지통으로 이동")}
          </Button>
        </>
      }
    >
      {trash.isError && (
        <InlineNotice>
          {t("프로젝트를 이동하지 못했어요. 목록은 그대로 유지했어요.")}
        </InlineNotice>
      )}
    </DialogCard>
  );
}
