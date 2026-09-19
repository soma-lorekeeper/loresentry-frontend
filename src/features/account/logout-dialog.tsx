"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button, DialogCard } from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { AccountRow } from "@/features/projects/user-menu";
import { useLogout } from "@/features/projects/queries";

import styles from "./account.module.css";

export function LogoutDialog({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: User;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useLogout();

  const close = () => {
    if (logout.isPending) return;
    logout.reset();
    onClose();
  };

  const confirm = () =>
    logout.mutate(undefined, {
      onSuccess: () => {
        queryClient.clear();
        router.replace("/logout");
      },
    });

  const copy = logout.isPending
    ? {
        icon: "loader-circle" as const,
        title: "로그아웃하고 있습니다",
        description: "안전하게 로그아웃하는 중이에요. 잠시만 기다려 주세요.",
      }
    : logout.isError
      ? {
          icon: "cloud-off" as const,
          title: "로그아웃하지 못했어요",
          description:
            "지금 화면과 작업은 그대로예요. 연결을 확인한 뒤 다시 시도해 주세요.",
        }
      : {
          icon: "log-out" as const,
          title: "로그아웃할까요?",
          description: "이 계정의 세션을 종료하고 로그인 화면으로 이동합니다.",
        };

  return (
    <DialogCard
      open={open}
      onClose={close}
      dismissible={!logout.isPending}
      size="sm"
      icon={copy.icon}
      title={copy.title}
      description={copy.description}
      actions={
        logout.isPending ? (
          <Button size="md" busy className={styles.muted}>
            로그아웃 중…
          </Button>
        ) : (
          <>
            <Button size="md" icon="x" className={styles.ghost} onClick={close}>
              취소
            </Button>
            <Button
              size="md"
              variant="primary"
              icon={logout.isError ? "refresh-cw" : "log-out"}
              onClick={confirm}
            >
              {logout.isError ? "다시 시도" : "로그아웃"}
            </Button>
          </>
        )
      }
    >
      <AccountRow user={user} />
    </DialogCard>
  );
}
