"use client";

import type { ReactNode } from "react";

import { SidebarButton, SidebarLink } from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { useFeedback } from "@/features/feedback/feedback-provider";

import { SiteFooter } from "./site-footer";
import styles from "./project-shell.module.css";
import { UserMenu } from "./user-menu";

export type ProjectSection = "list" | "trash" | "guide";

interface ProjectShellProps {
  user: User;
  section: ProjectSection;
  title: string;
  description: string;
  meta?: ReactNode;
  headerAction?: ReactNode;
  children: ReactNode;
}

export function ProjectShell({
  user,
  section,
  title,
  description,
  meta,
  headerAction,
  children,
}: ProjectShellProps) {
  const feedback = useFeedback();
  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="프로젝트 메뉴">
        <UserMenu user={user} />
        <SidebarLink
          href="/projects"
          icon="layout-grid"
          label="프로젝트 목록"
          selected={section === "list"}
          strong
        />
        <SidebarLink
          href="/projects/trash"
          icon="trash-2"
          label="프로젝트 휴지통"
          selected={section === "trash"}
          strong
        />
        <div className={styles.spacer} />
        <SidebarLink
          href="/projects/guide"
          icon="book-open"
          label="사용 가이드"
          selected={section === "guide"}
          strong
        />
        <SidebarButton
          icon="message-square"
          label="피드백 보내기"
          onClick={feedback.open}
          aria-haspopup="dialog"
        />
      </nav>
      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.description}>{description}</p>
          </div>
          {meta && <span className={styles.meta}>{meta}</span>}
          {headerAction}
        </header>
        {children}
        <SiteFooter />
      </main>
    </div>
  );
}
