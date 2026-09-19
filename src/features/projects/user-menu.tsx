"use client";

import { useRef, useState } from "react";

import { Icon, Menu } from "@/design-system/primitives";
import { themeMenuEntries } from "@/design-system/theme/theme-menu";
import { useTheme } from "@/design-system/theme/theme-store";
import type { User } from "@/domain/models";
import { AccountSettingsDialog } from "@/features/account/account-settings-dialog";
import { LogoutDialog } from "@/features/account/logout-dialog";
import { cx } from "@/shared/cx";
import { initialsOf } from "@/shared/format";

import styles from "./user-menu.module.css";

export function UserAvatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "sm" | "md";
}) {
  return (
    <span
      className={cx(styles.avatar, size === "sm" && styles.avatarSm)}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

export function AccountRow({ user }: { user: User }) {
  return (
    <div className={styles.account}>
      <UserAvatar name={user.displayName} size="sm" />
      <span className={styles.copy}>
        <span className={styles.name}>{user.displayName}</span>
        <span className={styles.email}>{user.email}</span>
      </span>
    </div>
  );
}

export function UserMenu({ user }: { user: User }) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [dialog, setDialog] = useState<"account" | "logout" | null>(null);
  const theme = useTheme();

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.summary}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <UserAvatar name={user.displayName} />
        <span className={styles.copy}>
          <span className={styles.name}>{user.displayName}</span>
          <span className={styles.email}>{user.email}</span>
        </span>
        <Icon
          name={open ? "chevron-up" : "chevron-down"}
          size={16}
          className={styles.chevron}
        />
      </button>
      <Menu
        anchorRef={triggerRef}
        open={open}
        onOpenChange={setOpen}
        label="계정 메뉴"
        placement="bottom-start"
        itemHeight={38}
        entries={[
          {
            id: "account",
            label: "계정 설정",
            icon: "user-cog",
            onSelect: () => setDialog("account"),
          },
          { type: "separator", id: "separator" },
          ...themeMenuEntries(theme.preference, theme.setPreference),
          { type: "separator", id: "separator-theme" },
          {
            id: "logout",
            label: "로그아웃",
            icon: "log-out",
            onSelect: () => setDialog("logout"),
          },
        ]}
      />
      <AccountSettingsDialog
        open={dialog === "account"}
        user={user}
        onClose={() => setDialog(null)}
      />
      <LogoutDialog
        open={dialog === "logout"}
        user={user}
        onClose={() => setDialog(null)}
      />
    </>
  );
}
