"use client";

import { useState } from "react";

import {
  Button,
  DialogBullets,
  DialogCard,
  DialogDetail,
  InlineNotice,
  TextAreaField,
  TextField,
} from "@/design-system/primitives";
import type { Project } from "@/domain/models";
import { isServiceError } from "@/services/errors";
import { PROJECT_TITLE_MAX } from "@/services/mock/projects";

import styles from "./project-dialogs.module.css";
import { useCreateProject, useRenameProject, useTrashProject } from "./queries";

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
      ? "프로젝트 제목을 입력해 주세요."
      : fieldErrorOf(create.error);

  return (
    <DialogCard
      open={open}
      onClose={() => !busy && onClose()}
      dismissible={!busy}
      size="md"
      icon="folder-plus"
      title="새 프로젝트 만들기"
      description="프로젝트 제목만 입력하면 바로 시작할 수 있어요."
      closeLabel="새 프로젝트 만들기 닫기"
      closeDisabled={busy}
      footerHint="완료하면 새 프로젝트의 작업공간 시작 안내로 이동합니다."
      actions={
        <>
          <Button
            size="md"
            className={styles.cancel}
            onClick={onClose}
            disabled={busy}
          >
            취소
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
              ? "프로젝트 만드는 중…"
              : serverErrorOf(create.error)
                ? "다시 시도"
                : "프로젝트 만들기"}
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
          label="프로젝트 제목"
          required
          autoFocus
          placeholder="프로젝트 제목을 입력하세요"
          value={title}
          maxLength={PROJECT_TITLE_MAX}
          onChange={(event) => {
            setTitle(event.target.value.slice(0, PROJECT_TITLE_MAX));
            if (create.error) create.reset();
          }}
          onBlur={() => setTouched(true)}
          readOnly={busy}
          error={fieldError}
          hint={
            busy
              ? "제목을 확인하고 프로젝트를 만들고 있어요."
              : "앞뒤 공백은 자동으로 정리됩니다."
          }
        />
        <TextAreaField
          label="설명"
          labelHint="선택"
          placeholder="어떤 이야기인지 짧게 적어 두세요"
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
            프로젝트를 만들지 못했어요. 입력을 유지했으니 다시 시도해 주세요.
          </InlineNotice>
        )}
      </form>
    </DialogCard>
  );
}

export function RenameProjectDialog({
  project,
  onClose,
  onRenamed,
}: {
  project: Project | null;
  onClose: () => void;
  onRenamed: (project: Project) => void;
}) {
  return (
    <RenameProjectForm
      key={project?.id ?? "none"}
      project={project}
      onClose={onClose}
      onRenamed={onRenamed}
    />
  );
}

function RenameProjectForm({
  project,
  onClose,
  onRenamed,
}: {
  project: Project | null;
  onClose: () => void;
  onRenamed: (project: Project) => void;
}) {
  const rename = useRenameProject();
  const [title, setTitle] = useState(project?.title ?? "");
  const busy = rename.isPending;
  const trimmed = title.trim();
  const unchanged = trimmed === project?.title;
  const empty = trimmed.length === 0;

  const submit = () => {
    if (!project || empty || unchanged || busy) return;
    rename.mutate({ projectId: project.id, title }, { onSuccess: onRenamed });
  };

  const hint = busy
    ? "새 이름을 저장하고 있어요."
    : unchanged
      ? "현재 이름과 다를 때 저장할 수 있습니다."
      : "앞뒤 공백은 자동으로 정리됩니다.";

  return (
    <DialogCard
      open={project !== null}
      onClose={() => !busy && onClose()}
      dismissible={!busy}
      size="md"
      icon="pencil"
      title="프로젝트 이름 변경"
      description="목록과 작업공간에 표시할 프로젝트 이름을 바꿉니다."
      closeLabel="프로젝트 이름 변경 닫기"
      closeDisabled={busy}
      footerHint="완료 후 카드 제목을 갱신하고 더보기 버튼으로 돌아갑니다."
      actions={
        <>
          <Button
            size="md"
            className={styles.cancel}
            onClick={onClose}
            disabled={busy}
          >
            취소
          </Button>
          <Button
            size="md"
            variant="primary"
            icon={serverErrorOf(rename.error) ? "rotate-cw" : "check"}
            busy={busy}
            disabled={empty || unchanged}
            onClick={submit}
          >
            {busy
              ? "저장 중…"
              : serverErrorOf(rename.error)
                ? "다시 시도"
                : "저장"}
          </Button>
        </>
      }
    >
      <DialogDetail label="현재 이름" value={project?.title} />
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <TextField
          label="새 프로젝트 이름"
          required
          autoFocus
          placeholder="새 프로젝트 이름을 입력하세요"
          value={title}
          maxLength={PROJECT_TITLE_MAX}
          onChange={(event) => {
            setTitle(event.target.value.slice(0, PROJECT_TITLE_MAX));
            if (rename.error) rename.reset();
          }}
          readOnly={busy}
          error={
            empty
              ? "프로젝트 이름을 입력해 주세요."
              : fieldErrorOf(rename.error)
          }
          hint={hint}
        />
      </form>
      {serverErrorOf(rename.error) && (
        <InlineNotice>
          이름을 저장하지 못했어요. 변경한 입력을 유지했어요.
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
      icon="trash-2"
      title="프로젝트를 휴지통으로 이동할까요?"
      description="선택한 프로젝트는 목록과 작업공간에서 제거됩니다."
      footerHint={
        busy
          ? "이동이 끝날 때까지 잠시 기다려 주세요."
          : "Esc를 누르면 이동하지 않고 카드 메뉴로 돌아갑니다."
      }
      actions={
        <>
          <Button
            size="md"
            className={busy || trash.isError ? styles.cancel : styles.ghost}
            onClick={close}
            disabled={busy}
          >
            취소
          </Button>
          <Button
            size="md"
            variant="primary"
            icon={trash.isError ? "rotate-cw" : "trash-2"}
            busy={busy}
            onClick={confirm}
          >
            {busy
              ? "이동 중…"
              : trash.isError
                ? "다시 시도"
                : "휴지통으로 이동"}
          </Button>
        </>
      }
    >
      <DialogDetail label="이동할 프로젝트" value={project?.title} />
      <DialogBullets
        items={[
          {
            icon: "layout-grid",
            text: "프로젝트 목록과 작업공간에서 제거됩니다.",
          },
          {
            icon: "rotate-ccw",
            text: "파일과 설정은 그대로 남고, 휴지통에서 다시 복원할 수 있어요.",
            accent: true,
          },
        ]}
      />
      {trash.isError && (
        <InlineNotice>
          프로젝트를 이동하지 못했어요. 목록은 그대로 유지했어요.
        </InlineNotice>
      )}
    </DialogCard>
  );
}
