"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Menu,
  useToast,
} from "@/design-system/primitives";
import type { Project, User } from "@/domain/models";
import { t } from "@/i18n";
import { relativeTime } from "@/shared/format";

import {
  CreateProjectDialog,
  EditProjectDialog,
  TrashProjectDialog,
} from "./project-dialogs";
import styles from "./project-list.module.css";
import { ProjectShell } from "./project-shell";
import { useProjects } from "./queries";

export function workspaceHref(projectId: string) {
  return `/workspace?projectId=${encodeURIComponent(projectId)}`;
}

function ProjectCard({
  project,
  onEdit,
  onTrash,
}: {
  project: Project;
  onEdit: (project: Project) => void;
  onTrash: (project: Project) => void;
}) {
  const moreRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <article className={styles.card} data-selected={menuOpen || undefined}>
      <div className={styles.cardHeader}>
        <Icon name={project.icon} size={18} className={styles.projectIcon} />
        <span className={styles.spacer} />
        <IconButton
          ref={moreRef}
          icon="ellipsis"
          label={t("{title} 더보기", { title: project.title })}
          className={styles.more}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        />
      </div>
      <h3 className={styles.cardTitle} title={project.title}>
        <Link href={workspaceHref(project.id)} className={styles.cardLink}>
          {project.title}
        </Link>
      </h3>
      {project.description && (
        <p className={styles.description} title={project.description}>
          {project.description}
        </p>
      )}
      <div className={styles.metadata}>
        {project.lastFile && (
          <p className={styles.lastFile}>{project.lastFile.title}</p>
        )}
        <p className={styles.time}>{relativeTime(project.lastWorkedAt)}</p>
      </div>
      <Menu
        anchorRef={moreRef}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        label={t("{title} 메뉴", { title: project.title })}
        placement="bottom-end"
        width={220}
        itemHeight={36}
        entries={[
          {
            id: "edit",
            label: t("수정"),
            icon: "pencil",
            onSelect: () => onEdit(project),
          },
          {
            id: "trash",
            label: t("휴지통으로 이동"),
            icon: "trash-2",
            destructive: true,
            onSelect: () => onTrash(project),
          },
        ]}
      />
    </article>
  );
}

function SkeletonCard() {
  return (
    <div className={styles.skeleton} aria-hidden="true">
      <div className={styles.skeletonRow}>
        <span className={`${styles.bone} ${styles.boneIcon}`} />
        <span className={`${styles.bone} ${styles.bonePill}`} />
      </div>
      <span className={`${styles.bone} ${styles.boneTitle}`} />
      <span className={`${styles.bone} ${styles.boneLine}`} />
      <span className={`${styles.bone} ${styles.boneLineLong}`} />
    </div>
  );
}

export function ProjectListPage({ user }: { user: User }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();
  const projects = useProjects();
  // 온보딩의 "새 프로젝트 만들기"가 `?create=1` 로 들어온다.
  const [creating, setCreating] = useState(
    () => searchParams.get("create") === "1",
  );
  const [editing, setEditing] = useState<Project | null>(null);
  const [trashing, setTrashing] = useState<Project | null>(null);

  const meta = projects.isSuccess
    ? t("프로젝트 수::{count}개", { count: projects.data.length })
    : null;

  return (
    <ProjectShell
      user={user}
      section="list"
      title={t("프로젝트")}
      meta={meta}
      headerAction={
        <Button
          size="md"
          variant="primary"
          icon="plus"
          disabled={projects.isPending}
          onClick={() => setCreating(true)}
        >
          {t("새 프로젝트")}
        </Button>
      }
    >
      {projects.isError ? (
        <EmptyState
          size="lg"
          role="alert"
          icon="cloud-off"
          title={t("프로젝트를 불러오지 못했어요")}
          description={t("네트워크 연결을 확인한 뒤 다시 시도해 주세요.")}
          action={
            <Button
              size="md"
              icon="rotate-cw"
              onClick={() => projects.refetch()}
            >
              {t("다시 시도")}
            </Button>
          }
        />
      ) : projects.isSuccess && projects.data.length === 0 ? (
        <EmptyState
          size="lg"
          icon="folder-plus"
          title={t("아직 프로젝트가 없어요")}
          description={t(
            "첫 프로젝트를 만들고 세계와 이야기를 한곳에서 정리해 보세요.",
          )}
          action={
            <Button
              size="md"
              variant="primary"
              icon="plus"
              onClick={() => setCreating(true)}
            >
              {t("첫 프로젝트 만들기")}
            </Button>
          }
        />
      ) : (
        <section
          className={styles.section}
          aria-busy={projects.isPending || undefined}
        >
          <h2 className={styles.srOnly}>{t("최근 작업순 프로젝트")}</h2>
          <div className={styles.grid}>
            {projects.isPending
              ? Array.from({ length: 6 }, (_, index) => (
                  <SkeletonCard key={index} />
                ))
              : projects.data.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onEdit={setEditing}
                    onTrash={setTrashing}
                  />
                ))}
          </div>
        </section>
      )}

      <CreateProjectDialog
        open={creating}
        onClose={() => {
          setCreating(false);
          if (searchParams.get("create")) router.replace("/projects/");
        }}
        onCreated={(project) => {
          setCreating(false);
          router.push(workspaceHref(project.id));
        }}
      />
      <EditProjectDialog
        project={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          toast({ icon: "check", title: t("프로젝트를 수정했어요.") });
        }}
      />
      <TrashProjectDialog
        project={trashing}
        onClose={() => setTrashing(null)}
        onTrashed={() => {
          setTrashing(null);
          toast({
            icon: "trash-2",
            title: t("프로젝트를 휴지통으로 이동했어요."),
            action: {
              label: t("휴지통 보기"),
              icon: "arrow-right",
              onSelect: () => router.push("/projects/trash"),
            },
          });
        }}
      />
    </ProjectShell>
  );
}
