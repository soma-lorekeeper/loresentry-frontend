"use client";

import { useId, useState } from "react";

import {
  IconButton,
  Modal,
  SaveBar,
  TextField,
  type SaveBarState,
} from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { useUpdateAccount } from "@/features/projects/queries";
import { isServiceError } from "@/services/errors";

import styles from "./account.module.css";

const COPY = {
  unchanged: {
    message: "변경한 내용이 없어요",
    detail: "이름을 바꾸면 저장할 수 있어요.",
  },
  changed: {
    message: "저장되지 않은 이름 변경",
    detail: "저장하거나 마지막 이름으로 되돌리세요.",
  },
  saving: {
    message: "계정 정보를 저장하고 있습니다",
    detail: "잠시만 기다려 주세요.",
  },
  saved: {
    message: "계정 정보가 저장되었습니다",
    detail: "이제 창을 닫아도 안전합니다.",
  },
  error: {
    message: "계정 정보를 저장하지 못했어요",
    detail: "입력한 이름은 유지됩니다.",
  },
};

interface AccountSettingsDialogProps {
  open: boolean;
  user: User;
  onClose: () => void;
}

export function AccountSettingsDialog({
  open,
  user,
  onClose,
}: AccountSettingsDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      label="계정 설정"
      className={styles.dialog}
    >
      <AccountSettingsForm
        key={user.displayName}
        user={user}
        onClose={onClose}
      />
    </Modal>
  );
}

function AccountSettingsForm({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const titleId = useId();
  const update = useUpdateAccount();
  const [savedName, setSavedName] = useState(user.displayName);
  const [name, setName] = useState(user.displayName);
  const [justSaved, setJustSaved] = useState(false);
  const trimmed = name.trim();
  const invalid = trimmed.length === 0;
  const changed = trimmed !== savedName;

  const state: SaveBarState = update.isPending
    ? "saving"
    : update.isError
      ? "error"
      : changed && !invalid
        ? "changed"
        : justSaved
          ? "saved"
          : "unchanged";

  const save = () => {
    if (invalid || !changed) return;
    update.mutate(trimmed, {
      onSuccess: (next) => {
        setSavedName(next.displayName);
        setName(next.displayName);
        setJustSaved(true);
      },
    });
  };

  const validationMessage =
    update.error &&
    isServiceError(update.error) &&
    update.error.code === "validation"
      ? update.error.message
      : undefined;

  return (
    <div className={styles.body} aria-labelledby={titleId}>
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <h2 id={titleId} className={styles.title}>
            계정 설정
          </h2>
          <p className={styles.description}>
            표시 이름을 관리해요. 로그인에 쓰는 Google 계정 이메일은 바꿀 수
            없어요.
          </p>
        </div>
        <IconButton
          icon="x"
          label="계정 설정 닫기"
          className={styles.close}
          onClick={onClose}
        />
      </div>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <TextField
          density="settings"
          label="이름"
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setJustSaved(false);
            update.reset();
          }}
          hint="프로젝트 목록과 협업 화면에 표시됩니다."
          error={invalid ? "이름을 입력해 주세요." : validationMessage}
          readOnly={update.isPending}
          autoComplete="name"
        />
        <TextField
          density="settings"
          label="이메일"
          labelHint="Google 계정"
          value={user.email}
          readOnly
          hint="로그인 계정 이메일 · 변경할 수 없습니다."
        />
      </form>
      <SaveBar
        state={state}
        copy={COPY}
        onSave={save}
        onCancel={() => {
          setName(savedName);
          update.reset();
        }}
      />
    </div>
  );
}
