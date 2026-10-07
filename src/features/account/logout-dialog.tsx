"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { Button, DialogCard } from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { t } from "@/i18n";
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
        title: t("로그아웃하고 있습니다"),
        description: undefined,
      }
    : logout.isError
      ? {
          icon: "cloud-off" as const,
          title: t("로그아웃하지 못했어요"),
          description: t(
            "지금 화면과 작업은 그대로예요. 연결을 확인한 뒤 다시 시도해 주세요.",
          ),
        }
      : {
          icon: "log-out" as const,
          title: t("로그아웃할까요?"),
          description: undefined,
        };

  return (
    <DialogCard
      open={open}
      onClose={close}
      dismissible={!logout.isPending}
      size="sm"
      title={copy.title}
      description={copy.description}
      actions={
        logout.isPending ? (
          <Button size="md" busy className={styles.muted}>
            {t("로그아웃 중…")}
          </Button>
        ) : (
          <>
            <Button size="md" icon="x" className={styles.ghost} onClick={close}>
              {t("취소")}
            </Button>
            <Button
              size="md"
              variant="primary"
              icon={logout.isError ? "refresh-cw" : "log-out"}
              onClick={confirm}
            >
              {logout.isError ? t("다시 시도") : t("로그아웃")}
            </Button>
          </>
        )
      }
    >
      <div className={styles.target}>
        <AccountRow user={user} />
      </div>
    </DialogCard>
  );
}
