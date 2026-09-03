"use client";

import { useEffect, useRef, useState } from "react";

import { Button, Dialog, DialogActions, StatusNotice } from "@/components/ui";
import type { AccountProfile } from "@/features/account/account-model";

import styles from "./logout-dialog.module.css";

export type LogoutState = "complete" | "confirmation" | "error" | "processing";

export interface LogoutDialogProps {
  initialState?: LogoutState;
  logout?: () => Promise<void>;
  onNavigateToLogin?: () => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  profile: AccountProfile;
}

export function LogoutDialog({
  initialState = "confirmation",
  logout,
  onNavigateToLogin,
  onOpenChange,
  open,
  profile,
}: LogoutDialogProps) {
  const [status, setStatus] = useState<LogoutState>(initialState);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const loginLinkRef = useRef<HTMLAnchorElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (status === "error") {
      requestAnimationFrame(() => retryRef.current?.focus());
    }
  }, [status]);

  const close = () => {
    if (status === "processing" || status === "complete") return;
    onOpenChange(false);
  };

  const runLogout = async () => {
    if (status === "processing" || status === "complete") return;
    setStatus("processing");
    try {
      if (!logout) throw new Error("logout adapter is required");
      await logout();
      setStatus("complete");
      requestAnimationFrame(() => {
        if (onNavigateToLogin) onNavigateToLogin();
        else loginLinkRef.current?.click();
      });
    } catch {
      setStatus("error");
    }
  };

  return (
    <Dialog
      className={styles.dialog}
      description="현재 세션을 종료하고 로그인 화면으로 이동합니다."
      initialFocusRef={cancelRef}
      onOpenChange={close}
      open={open}
      title="로그아웃할까요?"
    >
      <div className={styles.account}>
        <span aria-hidden="true" className={styles.avatar}>
          {profile.name.slice(-2)}
        </span>
        <span className={styles.accountCopy}>
          <strong title={profile.name}>{profile.name}</strong>
          <span title={profile.email}>{profile.email}</span>
        </span>
      </div>
      {status === "error" && (
        <StatusNotice variant="error">
          로그아웃하지 못했어요. 현재 세션은 유지됩니다. 다시 시도해 주세요.
        </StatusNotice>
      )}
      {status === "complete" && (
        <StatusNotice variant="success">
          로그아웃했어요. 로그인 화면으로 이동합니다.
        </StatusNotice>
      )}
      <DialogActions>
        <Button
          disabled={status === "processing" || status === "complete"}
          onClick={close}
          ref={cancelRef}
        >
          취소
        </Button>
        <Button
          disabled={status === "complete"}
          isProcessing={status === "processing"}
          onClick={() => void runLogout()}
          ref={status === "error" ? retryRef : undefined}
          variant="primary"
        >
          {status === "processing"
            ? "로그아웃 중…"
            : status === "error"
              ? "다시 시도"
              : status === "complete"
                ? "이동 중…"
                : "로그아웃"}
        </Button>
      </DialogActions>
      <a
        aria-hidden="true"
        className={styles.loginHandoff}
        href="/login"
        ref={loginLinkRef}
        tabIndex={-1}
      >
        로그인 화면으로 이동
      </a>
    </Dialog>
  );
}
