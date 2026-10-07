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
import { t } from "@/i18n";
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
      title={t("프로젝트를 영구 삭제할까요?")}
      description={t(
        "프로젝트의 모든 파일과 설정이 완전히 삭제되며 복원할 수 없습니다.",
      )}
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
            {t("취소")}
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
            {busy ? t("삭제 중…") : t("영구 삭제")}
          </Button>
        </>
      }
    >
      {remove.isError && (
        <InlineNotice icon="circle-alert">
          {t("프로젝트를 영구 삭제하지 못했어요. 다시 시도해 주세요.")}
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

  const meta = trash.isSuccess
    ? t("프로젝트 수::{count}개", { count: trash.data.length })
    : null;

  const restoreProject = (project: Project) => {
    setFailedId(null);
    restore.mutate(project.id, {
      onSuccess: () =>
        toast({
          icon: "circle-check",
          title: t("프로젝트를 복원했어요."),
          action: {
            label: t("목록에서 보기"),
            icon: "arrow-right",
            onSelect: () => router.push("/projects"),
          },
        }),
      onError: () => setFailedId(project.id),
    });
  };

  return (
    <ProjectShell user={user} section="trash" title={t("휴지통")} meta={meta}>
      {trash.isPending ? (
        <SkeletonRows />
      ) : trash.isError ? (
        <EmptyState
          role="alert"
          icon="cloud-off"
          title={t("휴지통을 불러오지 못했어요")}
          description={t("잠시 후 다시 시도해 주세요.")}
          action={
            <Button
              size="md"
              variant="primary"
              icon="refresh-cw"
              onClick={() => trash.refetch()}
            >
              {t("다시 시도")}
            </Button>
          }
        />
      ) : trash.data.length === 0 ? (
        <EmptyState
          icon="archive-restore"
          title={t("휴지통이 비어 있어요")}
          description={t("휴지통으로 이동한 프로젝트가 여기에 보관돼요.")}
        />
      ) : (
        <ul className={styles.list}>
          {trash.data.map((project) => {
            const restoring =
              restore.isPending && restore.variables === project.id;
            return (
              <li key={project.id} style={{ display: "contents" }}>
                <div className={styles.row}>
                  <Icon name={project.icon} size={16} className={styles.icon} />
                  <span className={styles.copy}>
                    <span className={styles.title}>{project.title}</span>
                    <span className={styles.meta}>
                      {t("{date}에 삭제", {
                        date: dottedDate(
                          project.trashedAt ?? project.lastWorkedAt,
                        ),
                      })}
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
                      {t("복원")}
                    </Button>
                    <Button
                      size="md"
                      icon="trash-2"
                      disabled={restore.isPending}
                      onClick={() => setDeleting(project)}
                    >
                      {t("영구 삭제")}
                    </Button>
                  </span>
                </div>
                {failedId === project.id && (
                  <p className={styles.rowError} role="alert">
                    <Icon name="circle-alert" size={16} />
                    {t("프로젝트를 복원하지 못했어요. 다시 시도해 주세요.")}
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
            title: t("프로젝트를 영구 삭제했어요."),
            description: t("‘{title}’은 이제 복원할 수 없어요.", {
              title: project.title,
            }),
          });
        }}
      />
    </ProjectShell>
  );
}
