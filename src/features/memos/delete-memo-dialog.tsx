"use client";

import {
  Button,
  DialogCard,
  InlineNotice,
  useToast,
} from "@/design-system/primitives";
import type { Memo } from "@/domain/models";

import { memoHeadline, useRemoveMemo } from "./queries";

export function DeleteMemoDialog({
  projectId,
  memo,
  onClose,
}: {
  projectId: string;
  memo: Memo | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const remove = useRemoveMemo(projectId);
  const busy = remove.isPending;
  const close = () => {
    if (busy) return;
    remove.reset();
    onClose();
  };
  return (
    <DialogCard
      open={memo !== null}
      onClose={close}
      dismissible={!busy}
      icon="trash-2"
      title="메모를 삭제할까요?"
      description={
        memo?.scope === "file"
          ? "이 메모는 바로 삭제되며 되돌릴 수 없습니다. 파일 메모를 삭제해도 원본 파일은 유지됩니다."
          : "이 메모는 바로 삭제되며 되돌릴 수 없습니다."
      }
      target={
        memo
          ? {
              icon: "file",
              name: memoHeadline(memo.body, 40) || "빈 메모",
            }
          : undefined
      }
      actions={
        <>
          <Button size="md" icon="x" onClick={close} disabled={busy}>
            취소
          </Button>
          <Button
            size="md"
            variant="primary"
            icon="trash-2"
            busy={busy}
            onClick={() =>
              memo &&
              remove.mutate(memo.id, {
                onSuccess: () => {
                  remove.reset();
                  onClose();
                  toast({ icon: "circle-check", title: "메모를 삭제했어요." });
                },
              })
            }
          >
            {busy ? "삭제 중…" : "메모 삭제"}
          </Button>
        </>
      }
    >
      {remove.isError && (
        <InlineNotice icon="circle-alert">
          메모를 삭제하지 못했어요. 다시 시도해 주세요.
        </InlineNotice>
      )}
    </DialogCard>
  );
}
