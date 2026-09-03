"use client";

import Link from "next/link";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import {
  AccountSettingsDialog,
  type AccountSettingsState,
} from "@/features/account/components/account-settings-dialog";
import {
  type AccountProfile,
  defaultAccountProfile,
} from "@/features/account/account-model";
import { WorkspaceIcon } from "@/features/workspace/icons";

import styles from "./project-list.module.css";

export interface ProjectSidebarProps {
  current?: "guide" | "list" | "trash";
  initialAccountState?: AccountSettingsState | "user-menu-open";
  initialProfile?: AccountProfile;
  onLogoutRequest?: (returnFocus: HTMLButtonElement) => void;
  onProfileUpdated?: (profile: AccountProfile) => void;
  updateAccount?: (input: { name: string }) => Promise<void>;
}

export function ProjectSidebar({
  current = "list",
  initialAccountState,
  initialProfile = defaultAccountProfile,
  onLogoutRequest,
  onProfileUpdated,
  updateAccount,
}: ProjectSidebarProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [menuOpen, setMenuOpen] = useState(
    initialAccountState === "user-menu-open",
  );
  const [accountOpen, setAccountOpen] = useState(
    Boolean(initialAccountState && initialAccountState !== "user-menu-open"),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const settingsRef = useRef<HTMLButtonElement>(null);
  const logoutRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        requestAnimationFrame(() => triggerRef.current?.focus());
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [menuOpen]);

  const openMenu = (last = false) => {
    setMenuOpen(true);
    requestAnimationFrame(() =>
      (last ? logoutRef.current : settingsRef.current)?.focus(),
    );
  };

  const closeMenu = (restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [settingsRef.current, logoutRef.current].filter(
      (item): item is HTMLButtonElement => Boolean(item),
    );
    const current = items.indexOf(document.activeElement as HTMLButtonElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const index =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (current + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
      items[index]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu();
    }
  };

  const openAccount = () => {
    setMenuOpen(false);
    setAccountOpen(true);
  };

  return (
    <aside className={styles.sidebar}>
      <div className={styles.userSection} ref={rootRef}>
        <button
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label={`${profile.name}, ${profile.email} 사용자 메뉴`}
          className={styles.userSummary}
          onClick={() => (menuOpen ? closeMenu(true) : openMenu())}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              openMenu(event.key === "ArrowUp");
            }
          }}
          ref={triggerRef}
          title={`${profile.name} · ${profile.email}`}
          type="button"
        >
          <span aria-hidden="true" className={styles.avatar}>
            {profile.name.slice(-2)}
          </span>
          <span className={styles.userCopy}>
            <strong title={profile.name}>{profile.name}</strong>
            <span title={profile.email}>{profile.email}</span>
          </span>
          <WorkspaceIcon name="chevron" />
        </button>
        {menuOpen && (
          <div
            aria-label="사용자 메뉴"
            className={styles.userMenu}
            onKeyDown={handleMenuKeyDown}
            role="menu"
          >
            <button
              onClick={openAccount}
              ref={settingsRef}
              role="menuitem"
              type="button"
            >
              <WorkspaceIcon name="settings" />
              계정 설정
            </button>
            <button
              className={styles.dangerMenuItem}
              onClick={() => {
                setMenuOpen(false);
                if (logoutRef.current) onLogoutRequest?.(logoutRef.current);
              }}
              ref={logoutRef}
              role="menuitem"
              type="button"
            >
              <WorkspaceIcon name="external-link" />
              로그아웃
            </button>
          </div>
        )}
      </div>
      <nav aria-label="프로젝트">
        <div className={styles.navigation}>
          <Link
            aria-current={current === "list" ? "page" : undefined}
            className={styles.navItem}
            href="/projects"
          >
            <WorkspaceIcon name="organization" />
            프로젝트 목록
          </Link>
          <Link
            aria-current={current === "trash" ? "page" : undefined}
            className={styles.navItem}
            href="/projects/trash"
          >
            <WorkspaceIcon name="trash" />
            프로젝트 휴지통
          </Link>
        </div>
      </nav>
      <nav aria-label="도움말" className={styles.sidebarFooter}>
        <Link
          aria-current={current === "guide" ? "page" : undefined}
          className={styles.navItem}
          href="/projects/guide"
        >
          <WorkspaceIcon name="book" />
          사용 가이드
        </Link>
        <button className={styles.navItem} type="button">
          <WorkspaceIcon name="message-square" />
          피드백 보내기
          <span className={styles.srOnly}>새 탭에서 열림</span>
        </button>
      </nav>
      <AccountSettingsDialog
        initialState={
          initialAccountState === "user-menu-open"
            ? undefined
            : initialAccountState
        }
        onOpenChange={(open, restoreTo) => {
          setAccountOpen(open);
          if (open) return;
          if (restoreTo === "summary") {
            requestAnimationFrame(() => triggerRef.current?.focus());
          } else {
            setMenuOpen(true);
            requestAnimationFrame(() =>
              requestAnimationFrame(() => settingsRef.current?.focus()),
            );
          }
        }}
        onSaved={(nextProfile) => {
          setProfile(nextProfile);
          onProfileUpdated?.(nextProfile);
        }}
        open={accountOpen}
        profile={profile}
        updateAccount={updateAccount}
      />
    </aside>
  );
}
