"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button, Dialog, DialogActions, StatusNotice } from "@/components/ui";
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
export type ProjectRestoreState = "error" | "restoring" | "success";
export type ProjectPermanentDeleteState =
  "confirmation" | "deleting" | "error" | "success";

export interface ProjectTrashProps {
  initialItems?: TrashedProjectSummary[];
  initialListStatus?: ProjectTrashListStatus;
  initialPermanentDeleteState?: ProjectPermanentDeleteState;
  initialRestoreState?: ProjectRestoreState;
  loadTrashedProjects?: () => Promise<TrashedProjectSummary[]>;
  onPermanentlyDeleted?: (project: TrashedProjectSummary) => void;
  onRestored?: (project: TrashedProjectSummary) => void;
  permanentlyDeleteProject?: (projectId: string) => Promise<void>;
  restoreProject?: (projectId: string) => Promise<void>;
  theme?: "dark" | "light";
}

export function ProjectTrash({
  initialItems = trashedProjectFixtures,
  initialListStatus,
  initialPermanentDeleteState,
  initialRestoreState,
  loadTrashedProjects,
  onPermanentlyDeleted,
  onRestored,
  permanentlyDeleteProject,
  restoreProject,
  theme,
}: ProjectTrashProps) {
  const [items, setItems] = useState(() =>
    sortTrashedProjects(
      initialRestoreState === "success" ||
        initialPermanentDeleteState === "success"
        ? initialItems.slice(1)
        : initialItems,
    ),
  );
  const [listStatus, setListStatus] = useState<ProjectTrashListStatus>(
    initialListStatus ?? (initialItems.length === 0 ? "empty" : "ready"),
  );
  const [restoreStates, setRestoreStates] = useState<
    Record<string, Exclude<ProjectRestoreState, "success">>
  >(
    initialRestoreState && initialRestoreState !== "success"
      ? {
          [initialItems[0]?.id ?? ""]: initialRestoreState,
        }
      : {},
  );
  const [restoreSuccess, setRestoreSuccess] = useState(
    initialRestoreState === "success",
  );
  const [deleteTarget, setDeleteTarget] = useState<
    TrashedProjectSummary | undefined
  >(
    initialPermanentDeleteState && initialPermanentDeleteState !== "success"
      ? initialItems[0]
      : undefined,
  );
  const [deleteStatus, setDeleteStatus] = useState<
    Exclude<ProjectPermanentDeleteState, "success">
  >(
    initialPermanentDeleteState && initialPermanentDeleteState !== "success"
      ? initialPermanentDeleteState
      : "confirmation",
  );
  const [deleteSuccess, setDeleteSuccess] = useState(
    initialPermanentDeleteState === "success",
  );
  const loadRequestRef = useRef(0);
  const restoreButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const cancelDeleteRef = useRef<HTMLButtonElement>(null);
  const emptyActionRef = useRef<HTMLAnchorElement>(null);

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

  const focusAfterRemoval = (
    projectId: string,
    currentItems: TrashedProjectSummary[],
  ) => {
    const index = currentItems.findIndex((item) => item.id === projectId);
    const nextProject = currentItems[index + 1] ?? currentItems[index - 1];
    requestAnimationFrame(() => {
      if (nextProject) restoreButtonRefs.current.get(nextProject.id)?.focus();
      else emptyActionRef.current?.focus();
    });
  };

  const runRestore = async (project: TrashedProjectSummary) => {
    if (restoreStates[project.id] === "restoring") return;
    setRestoreSuccess(false);
    setRestoreStates((current) => ({
      ...current,
      [project.id]: "restoring",
    }));
    try {
      if (!restoreProject) throw new Error("restore adapter is required");
      await restoreProject(project.id);
      setItems((current) => {
        focusAfterRemoval(project.id, current);
        const remaining = current.filter((item) => item.id !== project.id);
        if (remaining.length === 0) setListStatus("empty");
        return remaining;
      });
      setRestoreStates((current) => {
        const next = { ...current };
        delete next[project.id];
        return next;
      });
      setRestoreSuccess(true);
      onRestored?.(project);
    } catch {
      setRestoreStates((current) => ({
        ...current,
        [project.id]: "error",
      }));
      requestAnimationFrame(() =>
        restoreButtonRefs.current.get(project.id)?.focus(),
      );
    }
  };

  const openPermanentDelete = (project: TrashedProjectSummary) => {
    setRestoreSuccess(false);
    setDeleteSuccess(false);
    setDeleteStatus("confirmation");
    setDeleteTarget(project);
  };

  const closePermanentDelete = () => {
    if (deleteStatus === "deleting") return;
    setDeleteTarget(undefined);
    setDeleteStatus("confirmation");
  };

  const runPermanentDelete = async () => {
    if (!deleteTarget || deleteStatus === "deleting") return;
    const project = deleteTarget;
    setDeleteStatus("deleting");
    try {
      if (!permanentlyDeleteProject) {
        throw new Error("permanent delete adapter is required");
      }
      await permanentlyDeleteProject(project.id);
      setItems((current) => {
        const remaining = current.filter((item) => item.id !== project.id);
        if (remaining.length === 0) setListStatus("empty");
        requestAnimationFrame(() =>
          requestAnimationFrame(() => focusAfterRemoval(project.id, current)),
        );
        return remaining;
      });
      setDeleteTarget(undefined);
      setDeleteStatus("confirmation");
      setDeleteSuccess(true);
      onPermanentlyDeleted?.(project);
    } catch {
      setDeleteStatus("error");
      requestAnimationFrame(() => cancelDeleteRef.current?.focus());
    }
  };

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
              <Link
                className={styles.returnLink}
                href="/projects"
                ref={emptyActionRef}
              >
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
            items.map((project) => {
              const projectRestoreStatus = restoreStates[project.id];
              const isRestoring = projectRestoreStatus === "restoring";
              return (
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
                    <Button
                      isProcessing={isRestoring}
                      onClick={() => void runRestore(project)}
                      ref={(element) => {
                        if (element)
                          restoreButtonRefs.current.set(project.id, element);
                        else restoreButtonRefs.current.delete(project.id);
                      }}
                    >
                      {isRestoring
                        ? "복원 중…"
                        : projectRestoreStatus === "error"
                          ? "다시 시도"
                          : "복원"}
                    </Button>
                    <Button
                      disabled={isRestoring}
                      onClick={() => openPermanentDelete(project)}
                      variant="ghost"
                    >
                      영구 삭제
                    </Button>
                  </div>
                  {projectRestoreStatus === "error" && (
                    <StatusNotice className={styles.rowNotice} variant="error">
                      프로젝트를 복원하지 못했어요. 다시 시도해 주세요.
                    </StatusNotice>
                  )}
                </article>
              );
            })}
        </section>
        {restoreSuccess && (
          <StatusNotice className={styles.successNotice} variant="success">
            프로젝트를 복원했어요.{" "}
            <Link href="/projects">프로젝트 목록에서 보기</Link>
          </StatusNotice>
        )}
        {deleteSuccess && (
          <StatusNotice className={styles.successNotice} variant="success">
            프로젝트를 영구 삭제했어요.
          </StatusNotice>
        )}
      </main>
      <Dialog
        className={styles.deleteDialog}
        description="프로젝트의 파일과 설정도 함께 삭제되며 복원할 수 없습니다."
        initialFocusRef={cancelDeleteRef}
        onOpenChange={(open) => {
          if (!open) closePermanentDelete();
        }}
        open={Boolean(deleteTarget)}
        title="영구 삭제할까요?"
      >
        {deleteTarget && (
          <div className={styles.deleteTarget}>
            <span aria-hidden="true">
              <WorkspaceIcon name="trash" />
            </span>
            <strong>{deleteTarget.title}</strong>
          </div>
        )}
        {deleteStatus === "error" && (
          <StatusNotice className={styles.deleteNotice} variant="error">
            프로젝트를 영구 삭제하지 못했어요. 다시 시도해 주세요.
          </StatusNotice>
        )}
        <DialogActions>
          <Button
            disabled={deleteStatus === "deleting"}
            onClick={closePermanentDelete}
            ref={cancelDeleteRef}
          >
            취소
          </Button>
          <Button
            className={styles.dangerButton}
            isProcessing={deleteStatus === "deleting"}
            onClick={() => void runPermanentDelete()}
            variant="primary"
          >
            {deleteStatus === "deleting"
              ? "삭제 중…"
              : deleteStatus === "error"
                ? "다시 시도"
                : "영구 삭제"}
          </Button>
        </DialogActions>
      </Dialog>
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
