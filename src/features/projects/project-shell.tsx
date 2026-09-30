"use client";

import type { ReactNode } from "react";

import {
  SidebarButton,
  SidebarLink,
  useToast,
} from "@/design-system/primitives";
import { useRuntimeConfig } from "@/app/providers";
import type { User } from "@/domain/models";

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

/**
 * 피드백을 보낼 곳.
 *
 * <p>폼 주소가 있으면 그것을 열고, 없으면 연락처로 메일을 쓴다. 둘 다 없으면 **보낼 곳이 없는
 * 것**이므로 `null` 이다 — 호출하는 화면은 그때 버튼을 아예 두지 않는다. 눌러 봐야 "설정되지
 * 않았어요" 만 나오는 버튼을 두는 것이 지금까지 고장으로 보였다.
 */
export function useFeedbackTarget() {
  const { feedbackUrl, contactEmail } = useRuntimeConfig();
  if (feedbackUrl) return { kind: "form" as const, href: feedbackUrl };
  if (contactEmail) {
    const subject = encodeURIComponent("Lore Sentry 피드백");
    return {
      kind: "mail" as const,
      href: `mailto:${contactEmail}?subject=${subject}`,
    };
  }
  return null;
}

export function useOpenFeedback() {
  const target = useFeedbackTarget();
  const toast = useToast();
  return () => {
    if (!target) return;
    if (target.kind === "mail") {
      // 메일은 새 탭이 아니라 메일 프로그램이 받는다. window.open 으로 열면 빈 탭이 남는다.
      window.location.href = target.href;
      return;
    }
    if (window.open(target.href, "_blank", "noopener")) {
      toast({
        icon: "external-link",
        title: "피드백 페이지를 새 탭에서 열었습니다",
        description: "보던 화면은 그대로 있어요.",
      });
      return;
    }
    toast({
      icon: "triangle-alert",
      title: "피드백 페이지를 열지 못했어요",
      description: "팝업 차단을 확인한 뒤 다시 시도해 주세요.",
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
  const feedback = useFeedbackTarget();
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
        {feedback && (
          <SidebarButton
            icon="message-square"
            label="피드백 보내기"
            onClick={openFeedback}
            aria-label={
              feedback.kind === "mail"
                ? "피드백 보내기 (메일 쓰기)"
                : "피드백 보내기 (새 탭에서 열림)"
            }
          />
        )}
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
