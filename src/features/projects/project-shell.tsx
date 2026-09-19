"use client";

import type { ReactNode } from "react";

import {
  SidebarButton,
  SidebarLink,
  useToast,
} from "@/design-system/primitives";
import { useRuntimeConfig } from "@/app/providers";
import type { User } from "@/domain/models";

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

export function useOpenFeedback() {
  const config = useRuntimeConfig();
  const toast = useToast();
  return () => {
    const opened = config.feedbackUrl
      ? window.open(config.feedbackUrl, "_blank", "noopener")
      : null;
    if (opened) {
      toast({
        icon: "external-link",
        title: "피드백 페이지를 새 탭에서 열었습니다",
        description: "이 프로젝트 목록은 그대로 유지됩니다.",
      });
      return;
    }
    toast({
      icon: "triangle-alert",
      title: "피드백 페이지를 열지 못했어요",
      description: config.feedbackUrl
        ? "팝업 차단을 확인한 뒤 다시 시도해 주세요."
        : "피드백 주소가 아직 설정되지 않았어요.",
    });
  };
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
  const openFeedback = useOpenFeedback();
  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="프로젝트 메뉴">
        <UserMenu user={user} />
        <SidebarLink
          href="/projects"
          icon="layout-grid"
          label="프로젝트 목록"
          selected={section === "list"}
        />
        <SidebarLink
          href="/projects/trash"
          icon="trash-2"
          label="프로젝트 휴지통"
          selected={section === "trash"}
        />
        <div className={styles.spacer} />
        <SidebarLink
          href="/projects/guide"
          icon="book-open"
          label="사용 가이드"
          selected={section === "guide"}
        />
        <SidebarButton
          icon="message-square"
          label="피드백 보내기"
          onClick={openFeedback}
          aria-label="피드백 보내기 (새 탭에서 열림)"
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
      </main>
    </div>
  );
}
