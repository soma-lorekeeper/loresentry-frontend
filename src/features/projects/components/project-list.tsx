"use client";

import Link from "next/link";
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button, StatusNotice } from "@/components/ui";
import { WorkspaceIcon } from "@/features/workspace/icons";

import {
  projectFixtures,
  sortProjects,
  type ProjectSummary,
} from "../project-model";
import {
  CreateProjectDialog,
  type CreateProjectResult,
  type CreateProjectState,
} from "./create-project-dialog";
import {
  RenameProjectDialog,
  type RenameProjectState,
} from "./rename-project-dialog";
import styles from "./project-list.module.css";

export interface ProjectListProps {
  createProject?: (input: { title: string }) => Promise<CreateProjectResult>;
  initialCreateState?: CreateProjectState;
  initialListStatus?: ProjectListStatus;
  initialMenuProjectId?: string;
  initialProjects?: ProjectSummary[];
  initialSelectedProjectId?: string;
  initialRenameState?: RenameProjectState;
  loadProjects?: () => Promise<ProjectSummary[]>;
  onCreateRequest?: () => void;
  onProjectCreated?: (project: ProjectSummary) => void;
  onMoveToTrashRequest?: (project: ProjectSummary) => void;
  onOpenProject?: (projectId: string) => void;
  onRenameRequest?: (project: ProjectSummary) => void;
  renameProject?: (projectId: string, title: string) => Promise<void>;
}

export type ProjectListStatus = "empty" | "error" | "loading" | "ready";

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
  onRenameRequest?: (returnFocus: HTMLButtonElement) => void;
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
      aria-label={`프로젝트 ${project.title}`}
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
            onClick={() =>
              runMenuAction(() => {
                if (moreRef.current) onRenameRequest?.(moreRef.current);
              })
            }
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
  createProject,
  initialCreateState,
  initialListStatus,
  initialMenuProjectId,
  initialProjects = projectFixtures,
  initialSelectedProjectId,
  initialRenameState,
  loadProjects,
  onCreateRequest,
  onProjectCreated,
  onMoveToTrashRequest,
  onOpenProject,
  onRenameRequest,
  renameProject,
}: ProjectListProps) {
  const [selectedId, setSelectedId] = useState(initialSelectedProjectId);
  const [createOpen, setCreateOpen] = useState(Boolean(initialCreateState));
  const [renamingProject, setRenamingProject] = useState<
    ProjectSummary | undefined
  >(
    initialRenameState && initialRenameState !== "success"
      ? initialProjects[0]
      : undefined,
  );
  const [renameReturnFocus, setRenameReturnFocus] =
    useState<HTMLButtonElement | null>(null);
  const [renameSuccess, setRenameSuccess] = useState(
    initialRenameState === "success",
  );
  const [projects, setProjects] = useState(() => sortProjects(initialProjects));
  const [listStatus, setListStatus] = useState<ProjectListStatus>(
    initialListStatus ?? (initialProjects.length === 0 ? "empty" : "ready"),
  );
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    if (!loadProjects) {
      setListStatus("error");
      return;
    }
    const request = loadRequestRef.current + 1;
    loadRequestRef.current = request;
    setListStatus("loading");
    try {
      const result = sortProjects(await loadProjects());
      if (loadRequestRef.current !== request) return;
      setProjects(result);
      setListStatus(result.length === 0 ? "empty" : "ready");
    } catch {
      if (loadRequestRef.current === request) setListStatus("error");
    }
  }, [loadProjects]);

  useEffect(() => {
    if (!loadProjects) return;
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, [load, loadProjects]);

  const openProject = (projectId: string) => {
    setSelectedId(projectId);
    onOpenProject?.(projectId);
  };

  const openCreate = () => {
    onCreateRequest?.();
    setCreateOpen(true);
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
        <section
          aria-busy={listStatus === "loading" || undefined}
          aria-label="프로젝트 목록"
          className={styles.grid}
        >
          <button
            className={styles.newProjectCard}
            disabled={listStatus === "loading"}
            onClick={openCreate}
            type="button"
          >
            <span aria-hidden="true" className={styles.newProjectIcon}>
              <WorkspaceIcon name="plus" />
            </span>
            <strong>새 프로젝트</strong>
            <span>새 이야기를 시작하세요</span>
          </button>
          {listStatus === "loading" && <ProjectListSkeleton />}
          {listStatus === "empty" && (
            <div className={styles.listMessage} role="status">
              <WorkspaceIcon name="book" />
              <strong>아직 프로젝트가 없어요</strong>
              <span>새 프로젝트를 만들어 첫 이야기를 시작하세요.</span>
            </div>
          )}
          {listStatus === "error" && (
            <StatusNotice className={styles.listNotice} variant="error">
              <span className={styles.noticeContent}>
                <span>
                  <strong>프로젝트를 불러오지 못했어요.</strong>
                  <span>연결을 확인한 뒤 다시 시도해 주세요.</span>
                </span>
                <Button
                  icon={<WorkspaceIcon name="rotate-cw" />}
                  onClick={() => void load()}
                >
                  다시 시도
                </Button>
              </span>
            </StatusNotice>
          )}
          {listStatus === "ready" &&
            projects.map((project) => (
              <ProjectCard
                initialMenuOpen={initialMenuProjectId === project.id}
                key={project.id}
                onMoveToTrashRequest={() => onMoveToTrashRequest?.(project)}
                onOpen={() => openProject(project.id)}
                onRenameRequest={(returnFocus) => {
                  setRenameReturnFocus(returnFocus);
                  setRenamingProject(project);
                  setRenameSuccess(false);
                  onRenameRequest?.(project);
                }}
                project={project}
                selected={selectedId === project.id}
              />
            ))}
        </section>
        {renameSuccess && (
          <StatusNotice className={styles.successNotice} variant="success">
            프로젝트 이름을 변경했어요.
          </StatusNotice>
        )}
      </main>
      <CreateProjectDialog
        createProject={createProject}
        initialState={initialCreateState}
        onCreated={(project) => {
          setProjects((current) => sortProjects([project, ...current]));
          setListStatus("ready");
          setSelectedId(project.id);
          onProjectCreated?.(project);
        }}
        onOpenChange={setCreateOpen}
        open={createOpen}
      />
      <RenameProjectDialog
        initialState={initialRenameState}
        key={renamingProject?.id ?? "closed"}
        onOpenChange={(open) => {
          if (!open) setRenamingProject(undefined);
        }}
        onRenamed={(projectId, title) => {
          setProjects((current) =>
            sortProjects(
              current.map((project) =>
                project.id === projectId ? { ...project, title } : project,
              ),
            ),
          );
          setRenameSuccess(true);
        }}
        open={Boolean(renamingProject)}
        project={renamingProject}
        renameProject={renameProject}
        returnFocus={renameReturnFocus}
      />
    </div>
  );
}

function ProjectListSkeleton() {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <div aria-hidden="true" className={styles.skeletonCard} key={index}>
          <span className={styles.skeletonIcon} />
          <span className={styles.skeletonTitle} />
          <span className={styles.skeletonLine} />
          <span className={styles.skeletonLine} />
        </div>
      ))}
      <p className={styles.srOnly} role="status">
        프로젝트를 불러오는 중입니다.
      </p>
    </>
  );
}
