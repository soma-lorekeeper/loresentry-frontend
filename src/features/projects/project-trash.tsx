"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Button,
  DialogCard,
  EmptyState,
  Icon,
  InlineNotice,
  useToast,
} from "@/design-system/primitives";
import type { Project, User } from "@/domain/models";
import { dottedDate } from "@/shared/format";

import { ProjectShell } from "./project-shell";
import styles from "./project-trash.module.css";
import {
  useDeleteProject,
  useProjectTrash,
  useRestoreProject,
} from "./queries";

function SkeletonRows() {
  return (
    <div className={styles.list} aria-hidden="true">
      {[0, 1, 2].map((index) => (
        <div key={index} className={styles.skeletonRow}>
          <span className={styles.bone} style={{ width: 34, height: 34 }} />
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: 1,
            }}
          >
            <span
              className={styles.bone}
              style={{ width: "28%", height: 12 }}
            />
            <span
              className={styles.bone}
              style={{ width: "40%", height: 10 }}
            />
          </span>
        </div>
      ))}
    </div>
  );
}

function DeleteProjectDialog({
  project,
  onClose,
  onDeleted,
}: {
  project: Project | null;
  onClose: () => void;
  onDeleted: (project: Project) => void;
}) {
  const remove = useDeleteProject();
  const busy = remove.isPending;
  const close = () => {
    if (busy) return;
    remove.reset();
    onClose();
  };
  return (
    <DialogCard
      open={project !== null}
      onClose={close}
      dismissible={!busy}
      icon="trash-2"
      title="프로젝트를 영구 삭제할까요?"
      description="프로젝트의 모든 파일과 설정이 완전히 삭제되며 복원할 수 없습니다."
      target={project ? { icon: "book-open", name: project.title } : undefined}
      actions={
        <>
          <Button
            size="md"
            icon="x"
            className={styles.cancel}
            onClick={close}
            disabled={busy}
          >
            취소
          </Button>
          <Button
            size="md"
            variant="primary"
            icon="trash-2"
            busy={busy}
            onClick={() =>
              project &&
              remove.mutate(project.id, {
                onSuccess: () => {
                  remove.reset();
                  onDeleted(project);
                },
              })
            }
          >
            {busy ? "삭제 중…" : "영구 삭제"}
          </Button>
        </>
      }
    >
      {remove.isError && (
        <InlineNotice icon="circle-alert">
          프로젝트를 영구 삭제하지 못했어요. 다시 시도해 주세요.
        </InlineNotice>
      )}
    </DialogCard>
  );
}

export function ProjectTrashPage({ user }: { user: User }) {
  const router = useRouter();
  const toast = useToast();
  const trash = useProjectTrash();
  const restore = useRestoreProject();
  const [failedId, setFailedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const meta = trash.isPending
    ? "불러오는 중"
    : trash.isError
      ? "불러오지 못했어요"
      : `${trash.data.length}개 프로젝트`;

  const restoreProject = (project: Project) => {
    setFailedId(null);
    restore.mutate(project.id, {
      onSuccess: () =>
        toast({
          icon: "circle-check",
          title: "프로젝트를 복원했어요.",
          description: "프로젝트 목록에서 다시 이어서 작업할 수 있어요.",
          action: {
            label: "목록에서 보기",
            icon: "arrow-right",
            onSelect: () => router.push("/projects"),
          },
        }),
      onError: () => setFailedId(project.id),
    });
  };

  return (
    <ProjectShell
      user={user}
      section="trash"
      title="프로젝트 휴지통"
      description="보관된 프로젝트를 복원하거나 영구 삭제할 수 있어요."
      meta={meta}
    >
      {trash.isPending ? (
        <SkeletonRows />
      ) : trash.isError ? (
        <EmptyState
          role="alert"
          icon="cloud-off"
          title="휴지통을 불러오지 못했어요"
          description="잠시 후 다시 시도해 주세요."
          action={
            <Button
              size="md"
              variant="primary"
              icon="refresh-cw"
              onClick={() => trash.refetch()}
            >
              다시 시도
            </Button>
          }
        />
      ) : trash.data.length === 0 ? (
        <EmptyState
          icon="archive-restore"
          title="휴지통이 비어 있어요"
          description="휴지통으로 이동한 프로젝트가 여기에 보관돼요."
          action={
            <Button
              size="md"
              variant="primary"
              icon="arrow-left"
              onClick={() => router.push("/projects")}
            >
              프로젝트 목록으로 돌아가기
            </Button>
          }
        />
      ) : (
        <ul className={styles.list}>
          {trash.data.map((project) => {
            const restoring =
              restore.isPending && restore.variables === project.id;
            return (
              <li key={project.id} style={{ display: "contents" }}>
                <div className={styles.row}>
                  <span className={styles.icon}>
                    <Icon name={project.icon} size={16} />
                  </span>
                  <span className={styles.copy}>
                    <span className={styles.title}>{project.title}</span>
                    <span className={styles.meta}>
                      휴지통으로 이동:{" "}
                      {dottedDate(project.trashedAt ?? project.lastWorkedAt)} ·{" "}
                      {restoring ? "복원 요청 처리 중" : "보관 중"}
                    </span>
                  </span>
                  <span className={styles.actions}>
                    <Button
                      size="md"
                      icon="rotate-ccw"
                      busy={restoring}
                      disabled={restore.isPending}
                      onClick={() => restoreProject(project)}
                    >
                      복원
                    </Button>
                    <Button
                      size="md"
                      icon="trash-2"
                      disabled={restore.isPending}
                      onClick={() => setDeleting(project)}
                    >
                      영구 삭제
                    </Button>
                  </span>
                </div>
                {failedId === project.id && (
                  <p className={styles.rowError} role="alert">
                    <Icon name="circle-alert" size={16} />
                    프로젝트를 복원하지 못했어요. 다시 시도해 주세요.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <DeleteProjectDialog
        project={deleting}
        onClose={() => setDeleting(null)}
        onDeleted={(project) => {
          setDeleting(null);
          toast({
            icon: "circle-check",
            title: "프로젝트를 영구 삭제했어요.",
            description: `‘${project.title}’은 이제 복원할 수 없어요.`,
          });
        }}
      />
    </ProjectShell>
  );
}
