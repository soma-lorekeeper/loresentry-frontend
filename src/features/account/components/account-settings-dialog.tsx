"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import {
  Button,
  Dialog,
  DialogActions,
  StatusNotice,
  TextField,
} from "@/components/ui";

import { type AccountProfile, validateAccountName } from "../account-model";
import styles from "./account-settings-dialog.module.css";

export type AccountSettingsState =
  "default" | "edited" | "error" | "saved" | "saving" | "validation-error";

export interface AccountSettingsDialogProps {
  initialState?: AccountSettingsState;
  onOpenChange: (open: boolean, restoreTo: "menu" | "summary") => void;
  onSaved: (profile: AccountProfile) => void;
  open: boolean;
  profile: AccountProfile;
  updateAccount?: (input: { name: string }) => Promise<void>;
}

function initialName(profile: AccountProfile, state?: AccountSettingsState) {
  if (state === "validation-error") return "";
  if (state === "edited" || state === "error" || state === "saving") {
    return `${profile.name} 작가`;
  }
  return profile.name;
}

export function AccountSettingsDialog({
  initialState,
  onOpenChange,
  onSaved,
  open,
  profile,
  updateAccount,
}: AccountSettingsDialogProps) {
  const [draft, setDraft] = useState(() => initialName(profile, initialState));
  const [status, setStatus] = useState<"error" | "idle" | "saved" | "saving">(
    initialState === "error"
      ? "error"
      : initialState === "saved"
        ? "saved"
        : initialState === "saving"
          ? "saving"
          : "idle",
  );
  const [nameError, setNameError] = useState(
    initialState === "validation-error" ? "이름을 입력해 주세요." : undefined,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const normalized = draft.trim();
  const unchanged = normalized === profile.name;

  useEffect(() => {
    if (status === "saved") {
      requestAnimationFrame(() => closeRef.current?.focus());
    }
  }, [status]);

  const close = () => {
    if (status === "saving") return;
    onOpenChange(false, status === "saved" ? "summary" : "menu");
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "saving" || status === "saved") return;
    const validationError = validateAccountName(draft);
    if (validationError) {
      setNameError(validationError);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (unchanged) return;

    setStatus("saving");
    try {
      if (!updateAccount) throw new Error("account adapter is required");
      await updateAccount({ name: normalized });
      const nextProfile = { ...profile, name: normalized };
      onSaved(nextProfile);
      setDraft(nextProfile.name);
      setStatus("saved");
    } catch {
      setStatus("error");
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <Dialog
      className={styles.dialog}
      description="프로젝트 목록과 사용자 메뉴에 표시되는 정보를 관리합니다."
      initialFocusRef={status === "saved" ? closeRef : inputRef}
      onOpenChange={close}
      open={open}
      title="계정 설정"
    >
      <form noValidate onSubmit={(event) => void submit(event)}>
        <div className={styles.fields}>
          <TextField
            autoComplete="name"
            disabled={status === "saving" || status === "saved"}
            error={nameError}
            id="account-name"
            label="이름"
            onChange={(event) => {
              setDraft(event.target.value);
              setNameError(undefined);
              if (status === "error") setStatus("idle");
            }}
            ref={inputRef}
            required
            value={draft}
          />
          <TextField
            id="account-email"
            label="Google 계정 이메일"
            readOnly
            value={profile.email}
          />
        </div>
        {status === "error" && (
          <StatusNotice className={styles.notice} variant="error">
            계정 정보를 저장하지 못했어요. 다시 시도해 주세요.
          </StatusNotice>
        )}
        {status === "saved" && (
          <StatusNotice className={styles.notice} variant="success">
            계정 정보를 저장했어요.
          </StatusNotice>
        )}
        <DialogActions>
          {status === "saved" ? (
            <Button onClick={close} ref={closeRef} variant="primary">
              닫기
            </Button>
          ) : (
            <>
              <Button disabled={status === "saving"} onClick={close}>
                취소
              </Button>
              <Button
                disabled={Boolean(nameError) || unchanged}
                isProcessing={status === "saving"}
                type="submit"
                variant="primary"
              >
                {status === "saving"
                  ? "저장 중…"
                  : status === "error"
                    ? "다시 시도"
                    : "저장"}
              </Button>
            </>
          )}
        </DialogActions>
      </form>
    </Dialog>
  );
}
