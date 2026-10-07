"use client";

import { useId, useState } from "react";

import {
  Button,
  IconButton,
  Modal,
  SaveBar,
  Segmented,
  TextField,
  type SaveBarState,
} from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { useLocaleSwitch } from "@/features/locale/use-locale-switch";
import { useUpdateAccount } from "@/features/projects/queries";
import { LOCALE, LOCALE_NAMES, LOCALES, t, type Locale } from "@/i18n";
import { isServiceError } from "@/services/errors";

import styles from "./account.module.css";

const COPY = {
  changed: {
    message: t("저장되지 않은 이름 변경"),
    detail: "",
  },
  saving: {
    message: t("계정 정보를 저장하고 있습니다"),
    detail: "",
  },
  saved: {
    message: t("계정 정보가 저장되었습니다"),
    detail: "",
  },
  error: {
    message: t("계정 정보를 저장하지 못했어요"),
    detail: t("입력한 이름은 유지됩니다."),
  },
};

const LANGUAGE_OPTIONS = LOCALES.map((locale) => ({
  value: locale,
  label: LOCALE_NAMES[locale],
  lang: locale,
}));

interface AccountSettingsDialogProps {
  open: boolean;
  user: User;
  onClose: () => void;
  onDeleteAccount: () => void;
}

export function AccountSettingsDialog({
  open,
  user,
  onClose,
  onDeleteAccount,
}: AccountSettingsDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      label={t("계정 설정")}
      className={styles.dialog}
    >
      <AccountSettingsForm
        key={user.displayName}
        user={user}
        onClose={onClose}
        onDeleteAccount={onDeleteAccount}
      />
    </Modal>
  );
}

function AccountSettingsForm({
  user,
  onClose,
  onDeleteAccount,
}: {
  user: User;
  onClose: () => void;
  onDeleteAccount: () => void;
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
      : changed
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
        <h2 id={titleId} className={styles.title}>
          {t("계정 설정")}
        </h2>
        <IconButton
          icon="x"
          label={t("계정 설정 닫기")}
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
          label={t("이름")}
          required
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setJustSaved(false);
            update.reset();
          }}
          error={invalid ? t("이름을 입력해 주세요.") : validationMessage}
          readOnly={update.isPending}
          autoComplete="name"
        />
        <TextField
          density="settings"
          label={t("이메일")}
          labelHint={t("Google 계정")}
          value={user.email}
          readOnly
        />
        <LanguageField />
      </form>
      <SaveBar
        state={state}
        copy={COPY}
        saveDisabled={invalid}
        onSave={save}
        onCancel={() => {
          setName(savedName);
          update.reset();
        }}
      />
      <section className={styles.danger} aria-labelledby={`${titleId}-delete`}>
        <div className={styles.dangerCopy}>
          <h3 id={`${titleId}-delete`} className={styles.dangerTitle}>
            {t("계정 삭제")}
          </h3>
          <p className={styles.description}>
            {t(
              "모든 프로젝트와 휴지통 항목이 함께 영구 삭제되며 되돌릴 수 없어요.",
            )}
          </p>
        </div>
        <Button
          size="md"
          icon="trash-2"
          onClick={onDeleteAccount}
          disabled={update.isPending}
        >
          {t("계정 삭제")}
        </Button>
      </section>
    </div>
  );
}

function LanguageField() {
  const { switchTo, pending } = useLocaleSwitch();
  const [choice, setChoice] = useState<Locale>(LOCALE);
  const choose = (locale: Locale) => {
    if (pending || locale === choice) return;
    setChoice(locale);
    void switchTo(locale);
  };
  return (
    <div className={styles.field} aria-busy={pending || undefined}>
      <span className={styles.fieldLabel} aria-hidden="true">
        {t("언어")}
      </span>
      <Segmented
        label={t("언어")}
        options={LANGUAGE_OPTIONS}
        value={choice}
        onChange={choose}
        className={styles.language}
      />
    </div>
  );
}
