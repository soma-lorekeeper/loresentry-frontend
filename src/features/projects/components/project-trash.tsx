"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, StatusNotice } from "@/components/ui";
import { WorkspaceIcon } from "@/features/workspace/icons";

import {
  sortTrashedProjects,
  trashedProjectFixtures,
  type TrashedProjectSummary,
} from "../project-trash-model";
import { ProjectSidebar } from "./project-list";
import shellStyles from "./project-list.module.css";
import styles from "./project-trash.module.css";

export type ProjectTrashListStatus = "empty" | "error" | "loading" | "ready";

export interface ProjectTrashProps {
  initialItems?: TrashedProjectSummary[];
  initialListStatus?: ProjectTrashListStatus;
  loadTrashedProjects?: () => Promise<TrashedProjectSummary[]>;
  theme?: "dark" | "light";
}

export function ProjectTrash({
  initialItems = trashedProjectFixtures,
  initialListStatus,
  loadTrashedProjects,
  theme,
}: ProjectTrashProps) {
  const [items, setItems] = useState(() => sortTrashedProjects(initialItems));
  const [listStatus, setListStatus] = useState<ProjectTrashListStatus>(
    initialListStatus ?? (initialItems.length === 0 ? "empty" : "ready"),
  );
  const loadRequestRef = useRef(0);

  const load = useCallback(async () => {
    if (!loadTrashedProjects) {
      setListStatus("error");
      return;
    }
    const request = loadRequestRef.current + 1;
    loadRequestRef.current = request;
    setListStatus("loading");
    try {
      const result = sortTrashedProjects(await loadTrashedProjects());
      if (loadRequestRef.current !== request) return;
      setItems(result);
      setListStatus(result.length === 0 ? "empty" : "ready");
    } catch {
      if (loadRequestRef.current === request) setListStatus("error");
    }
  }, [loadTrashedProjects]);

  useEffect(() => {
    if (!loadTrashedProjects) return;
    const frame = requestAnimationFrame(() => void load());
    return () => cancelAnimationFrame(frame);
  }, [load, loadTrashedProjects]);

  useEffect(() => {
    if (!theme) return;
    const previousTheme = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = theme;
    return () => {
      if (previousTheme) document.documentElement.dataset.theme = previousTheme;
      else delete document.documentElement.dataset.theme;
    };
  }, [theme]);

  return (
    <div className={shellStyles.shell}>
      <ProjectSidebar current="trash" />
      <main className={shellStyles.main}>
        <header className={shellStyles.header}>
          <span className={shellStyles.eyebrow}>Projects</span>
          <h1>프로젝트 휴지통</h1>
          <p>휴지통의 프로젝트를 복원하거나 영구 삭제할 수 있습니다.</p>
        </header>
        <section
          aria-busy={listStatus === "loading" || undefined}
          aria-label="휴지통 프로젝트 목록"
          className={styles.list}
        >
          {listStatus === "loading" && <ProjectTrashSkeleton />}
          {listStatus === "empty" && (
            <div className={styles.emptyState} role="status">
              <span aria-hidden="true" className={styles.emptyIcon}>
                <WorkspaceIcon name="trash" />
              </span>
              <strong>휴지통이 비어 있어요</strong>
              <span>휴지통으로 이동한 프로젝트가 여기에 표시됩니다.</span>
              <Link className={styles.returnLink} href="/projects">
                프로젝트 목록으로 돌아가기
              </Link>
            </div>
          )}
          {listStatus === "error" && (
            <StatusNotice className={styles.listNotice} variant="error">
              <span className={styles.noticeContent}>
                <span>
                  <strong>휴지통을 불러오지 못했어요.</strong>
                  <span>다시 시도해 주세요.</span>
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
            items.map((project) => (
              <article
                aria-label={`휴지통 프로젝트 ${project.title}`}
                className={styles.row}
                key={project.id}
              >
                <span aria-hidden="true" className={styles.projectIcon}>
                  <WorkspaceIcon name="book" />
                </span>
                <div className={styles.projectInfo}>
                  <strong title={project.title}>{project.title}</strong>
                  <span>
                    휴지통으로 이동:{" "}
                    <time dateTime={project.trashedAt}>
                      {project.trashedAtLabel}
                    </time>
                  </span>
                </div>
                <span className={styles.archivedStatus}>
                  <WorkspaceIcon name="circle-check" />
                  보관 중
                </span>
                <div className={styles.actions}>
                  <Button>복원</Button>
                  <Button variant="ghost">영구 삭제</Button>
                </div>
              </article>
            ))}
        </section>
      </main>
    </div>
  );
}

function ProjectTrashSkeleton() {
  return (
    <>
      {[0, 1, 2].map((index) => (
        <div aria-hidden="true" className={styles.skeletonRow} key={index}>
          <span className={styles.skeletonIcon} />
          <span className={styles.skeletonCopy}>
            <span className={styles.skeletonTitle} />
            <span className={styles.skeletonLine} />
          </span>
          <span className={styles.skeletonStatus} />
          <span className={styles.skeletonActions} />
        </div>
      ))}
      <p className={styles.srOnly} role="status">
        휴지통을 불러오는 중입니다.
      </p>
    </>
  );
}
