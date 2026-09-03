"use client";

import Link from "next/link";
import { type KeyboardEvent, useEffect, useRef, useState } from "react";

import { WorkspaceIcon } from "@/features/workspace/icons";

import {
  projectFixtures,
  sortProjects,
  type ProjectSummary,
} from "../project-model";
import styles from "./project-list.module.css";

export interface ProjectListProps {
  initialMenuProjectId?: string;
  initialProjects?: ProjectSummary[];
  initialSelectedProjectId?: string;
  onCreateRequest?: () => void;
  onMoveToTrashRequest?: (project: ProjectSummary) => void;
  onOpenProject?: (projectId: string) => void;
  onRenameRequest?: (project: ProjectSummary) => void;
}

function ProjectSidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.userSummary}>
        <span aria-hidden="true" className={styles.avatar}>
          승주
        </span>
        <div className={styles.userCopy}>
          <strong>이승주</strong>
          <span>seungju@lore.kr</span>
        </div>
      </div>
      <nav aria-label="프로젝트">
        <div className={styles.navigation}>
          <Link aria-current="page" className={styles.navItem} href="/projects">
            <WorkspaceIcon name="organization" />
            프로젝트 목록
          </Link>
          <Link className={styles.navItem} href="/projects?view=trash">
            <WorkspaceIcon name="trash" />
            프로젝트 휴지통
          </Link>
        </div>
      </nav>
      <nav aria-label="도움말" className={styles.sidebarFooter}>
        <Link
          className={styles.navItem}
          href="/workspace?helpState=help-default"
        >
          <WorkspaceIcon name="book" />
          사용 가이드
        </Link>
        <a className={styles.navItem} href="mailto:feedback@lore.kr">
          <WorkspaceIcon name="message-square" />
          피드백 보내기
        </a>
      </nav>
    </aside>
  );
}

function ProjectCard({
  initialMenuOpen,
  onMoveToTrashRequest,
  onOpen,
  onRenameRequest,
  project,
  selected,
}: {
  initialMenuOpen?: boolean;
  onMoveToTrashRequest?: () => void;
  onOpen: () => void;
  onRenameRequest?: () => void;
  project: ProjectSummary;
  selected: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(Boolean(initialMenuOpen));
  const cardRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const menuFocusRef = useRef<"first" | "last" | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!cardRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen || !menuFocusRef.current) return;
    const target = menuFocusRef.current;
    menuFocusRef.current = null;
    requestAnimationFrame(() => {
      const items =
        menuRef.current?.querySelectorAll<HTMLButtonElement>(
          '[role="menuitem"]',
        );
      (target === "last" ? items?.[items.length - 1] : items?.[0])?.focus();
    });
  }, [menuOpen]);

  const openMenu = (focusLast = false) => {
    menuFocusRef.current = focusLast ? "last" : "first";
    setMenuOpen(true);
  };

  const closeMenu = (restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => moreRef.current?.focus());
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]',
      ),
    );
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? items.length - 1
            : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) %
              items.length;
      items[next]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu(true);
    } else if (event.key === "Tab") {
      closeMenu();
    }
  };

  const runMenuAction = (action?: () => void) => {
    closeMenu();
    action?.();
  };

  return (
    <article
      className={styles.projectCard}
      data-selected={selected}
      ref={cardRef}
    >
      <div className={styles.cardTop}>
        <span aria-hidden="true" className={styles.projectIcon}>
          <WorkspaceIcon name="book" />
        </span>
        {selected ? (
          <span className={styles.selectedBadge}>
            <WorkspaceIcon name="check" />
            선택됨
          </span>
        ) : (
          <button
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={`${project.title} 더 보기`}
            className={styles.moreButton}
            onClick={() => (menuOpen ? closeMenu() : openMenu())}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                openMenu(event.key === "ArrowUp");
              }
            }}
            ref={moreRef}
            type="button"
          >
            <WorkspaceIcon name="ellipsis" />
          </button>
        )}
      </div>
      <button className={styles.projectOpen} onClick={onOpen} type="button">
        <strong className={styles.projectTitle} title={project.title}>
          {project.title}
        </strong>
        <span className={styles.metadata}>
          <WorkspaceIcon name="history" />
          <span>{project.lastActiveLabel}</span>
        </span>
        <span className={styles.metadata}>
          <WorkspaceIcon name="file" />
          <span>{project.lastFileName ?? "아직 작성한 파일이 없습니다"}</span>
        </span>
      </button>
      {menuOpen && !selected && (
        <div
          aria-label={`${project.title} 메뉴`}
          className={styles.cardMenu}
          onKeyDown={handleMenuKeyDown}
          ref={menuRef}
          role="menu"
        >
          <button
            onClick={() => runMenuAction(onRenameRequest)}
            role="menuitem"
            type="button"
          >
            <WorkspaceIcon name="pencil" />
            이름 변경
          </button>
          <button
            onClick={() => runMenuAction(onMoveToTrashRequest)}
            role="menuitem"
            type="button"
          >
            <WorkspaceIcon name="trash" />
            휴지통으로 이동
          </button>
        </div>
      )}
    </article>
  );
}

export function ProjectList({
  initialMenuProjectId,
  initialProjects = projectFixtures,
  initialSelectedProjectId,
  onCreateRequest,
  onMoveToTrashRequest,
  onOpenProject,
  onRenameRequest,
}: ProjectListProps) {
  const [selectedId, setSelectedId] = useState(initialSelectedProjectId);
  const projects = sortProjects(initialProjects);

  const openProject = (projectId: string) => {
    setSelectedId(projectId);
    onOpenProject?.(projectId);
  };

  return (
    <div className={styles.shell}>
      <ProjectSidebar />
      <main className={styles.main}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Projects</span>
          <h1>프로젝트</h1>
          <p>이야기를 선택하거나 새 프로젝트를 시작하세요.</p>
        </header>
        <section aria-label="프로젝트 목록" className={styles.grid}>
          <button
            className={styles.newProjectCard}
            onClick={onCreateRequest}
            type="button"
          >
            <span aria-hidden="true" className={styles.newProjectIcon}>
              <WorkspaceIcon name="plus" />
            </span>
            <strong>새 프로젝트</strong>
            <span>새 이야기를 시작하세요</span>
          </button>
          {projects.map((project) => (
            <ProjectCard
              initialMenuOpen={initialMenuProjectId === project.id}
              key={project.id}
              onMoveToTrashRequest={() => onMoveToTrashRequest?.(project)}
              onOpen={() => openProject(project.id)}
              onRenameRequest={() => onRenameRequest?.(project)}
              project={project}
              selected={selectedId === project.id}
            />
          ))}
        </section>
      </main>
    </div>
  );
}
