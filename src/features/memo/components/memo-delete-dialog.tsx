"use client";

import { useRef, useState } from "react";

import { Button, Dialog, DialogActions } from "@/components/ui";
import type {
  MemoDeleteInput,
  MemoDeleteTarget,
} from "@/features/memo/memo-model";

import styles from "./memo-delete-dialog.module.css";

interface MemoDeleteDialogProps {
  deleteMemo?: (memo: MemoDeleteInput) => Promise<void>;
  onClose: () => void;
  onDeleted: (target: MemoDeleteTarget) => void;
  target?: MemoDeleteTarget;
}

export function MemoDeleteDialog({
  deleteMemo,
  onClose,
  onDeleted,
  target,
}: MemoDeleteDialogProps) {
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  const closeAndRestoreFocus = () => {
    const returnFocus = target?.returnFocus;
    onClose();
    requestAnimationFrame(() => returnFocus?.focus());
  };

  const confirmDelete = async () => {
    if (!target || deleting) return;
    if (!deleteMemo) {
      setError("백엔드 삭제 기능이 연결되지 않았습니다. 메모는 유지됩니다.");
      return;
    }
    setDeleting(true);
    setError("");
    try {
      await deleteMemo(target.input);
      onDeleted(target);
    } catch {
      setError(
        "메모를 삭제하지 못했습니다. 내용을 유지한 채 다시 시도할 수 있습니다.",
      );
      setDeleting(false);
    }
  };

  const preview = target?.body.trim() || "내용이 없는 메모";

  return (
    <Dialog
      className={styles.dialog}
      description="이 메모는 바로 삭제되며 되돌릴 수 없습니다. 파일 메모를 삭제해도 원본 파일은 유지됩니다."
      initialFocusRef={cancelRef}
      onOpenChange={(open) => {
        if (!open && !deleting) closeAndRestoreFocus();
      }}
      open={Boolean(target)}
      title="메모를 삭제할까요?"
    >
      <p
        aria-label={`삭제할 메모: ${target?.label ?? ""}`}
        className={styles.preview}
      >
        {preview}
      </p>
      {error && (
        <p aria-live="assertive" className={styles.error} role="alert">
          {error}
        </p>
      )}
      <DialogActions>
        <Button
          disabled={deleting}
          onClick={closeAndRestoreFocus}
          ref={cancelRef}
        >
          취소
        </Button>
        <Button
          isProcessing={deleting}
          onClick={() => void confirmDelete()}
          variant="primary"
        >
          {error ? "다시 시도" : "메모 삭제"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
