"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Button,
  DialogCard,
  Icon,
  InlineNotice,
  TextField,
} from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { AccountRow } from "@/features/projects/user-menu";
import {
  useDeleteAccount,
  useProjects,
  useProjectTrash,
} from "@/features/projects/queries";
import { isServiceError } from "@/services/errors";

import styles from "./account.module.css";

const sameEmail = (typed: string, email: string) =>
  typed.trim().toLowerCase() === email.trim().toLowerCase();

export function AccountDeleteDialog({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: User;
  onClose: () => void;
}) {
  return open ? <AccountDeleteCard user={user} onClose={onClose} /> : null;
}

function AccountDeleteCard({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const remove = useDeleteAccount();
  const projects = useProjects();
  const trash = useProjectTrash();
  const [typed, setTyped] = useState("");
  const matches = sameEmail(typed, user.email);
  const pending = remove.isPending;
  const mismatch =
    remove.error &&
    isServiceError(remove.error) &&
    remove.error.code === "confirmation-mismatch";
  const failed = remove.isError && !mismatch;

  const close = () => {
    if (pending) return;
    remove.reset();
    onClose();
  };

  const confirm = () => {
    if (!matches || pending) return;
    remove.mutate(typed.trim(), {
      onSuccess: () => {
        queryClient.clear();
        router.replace("/goodbye/");
      },
    });
  };

  const active = projects.data?.length;
  const trashed = trash.data?.length;
  const impact = [
    {
      icon: "book-open" as const,
      text:
        active === undefined
          ? "모든 프로젝트와 그 안의 원고, 설정 문서, 메모, 버전"
          : `프로젝트 ${active}개와 그 안의 원고, 설정 문서, 메모, 버전`,
    },
    {
      icon: "trash-2" as const,
      text:
        trashed === undefined
          ? "휴지통에 있는 프로젝트"
          : `휴지통에 있는 프로젝트 ${trashed}개`,
    },
    { icon: "image" as const, text: "올린 이미지와 AI 분석 결과" },
  ];

  return (
    <DialogCard
      open
      onClose={close}
      dismissible={!pending}
      size="md"
      icon={pending ? "loader-circle" : "user-x"}
      title={pending ? "계정을 삭제하고 있어요" : "계정을 삭제할까요?"}
      description={
        pending
          ? "모든 자료를 지우는 중이에요. 창을 닫지 말고 잠시만 기다려 주세요."
          : "이 계정과 모든 작업이 바로 삭제되며 되돌릴 수 없어요."
      }
      actions={
        <>
          <Button
            size="md"
            icon="x"
            className={styles.ghost}
            onClick={close}
            disabled={pending}
          >
            취소
          </Button>
          <Button
            size="md"
            variant={matches ? "primary" : "outline"}
            icon={failed ? "refresh-cw" : "trash-2"}
            busy={pending}
            disabled={!matches}
            className={matches ? undefined : styles.muted}
            onClick={confirm}
          >
            {pending ? "삭제 중…" : failed ? "다시 시도" : "계정 삭제"}
          </Button>
        </>
      }
    >
      <div className={styles.deleteBody}>
        {failed && (
          <InlineNotice icon="circle-alert">
            {remove.error?.message ??
              "계정을 삭제하지 못했어요. 계정과 작업은 그대로 있어요."}
          </InlineNotice>
        )}
        <div className={styles.deleteScope}>
          <AccountRow user={user} />
          <div className={styles.deleteImpact}>
            <p className={styles.deleteImpactTitle}>함께 영구 삭제돼요</p>
            <ul>
              {impact.map((item) => (
                <li key={item.icon}>
                  <Icon name={item.icon} size={14} />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <TextField
          label="확인을 위해 이메일을 입력하세요"
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
            if (mismatch) remove.reset();
          }}
          placeholder={user.email}
          hint="위 계정 이메일과 똑같이 입력하면 삭제할 수 있어요."
          error={mismatch ? "입력한 이메일이 계정 이메일과 달라요." : undefined}
          readOnly={pending}
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              confirm();
            }
          }}
        />
      </div>
    </DialogCard>
  );
}
