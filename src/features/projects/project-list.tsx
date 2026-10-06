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
import { relativeTime } from "@/shared/format";

import {
  CreateProjectDialog,
  RenameProjectDialog,
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
  onRename,
  onTrash,
}: {
  project: Project;
  onRename: (project: Project) => void;
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
          label={`${project.title} 더보기`}
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
        label={`${project.title} 메뉴`}
        placement="bottom-end"
        width={220}
        itemHeight={36}
        entries={[
          {
            id: "rename",
            label: "이름 변경",
            icon: "pencil",
            onSelect: () => onRename(project),
          },
          {
            id: "trash",
            label: "휴지통으로 이동",
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
  const [renaming, setRenaming] = useState<Project | null>(null);
  const [trashing, setTrashing] = useState<Project | null>(null);

  const meta = projects.isSuccess ? `${projects.data.length}개` : null;

  return (
    <ProjectShell
      user={user}
      section="list"
      title="프로젝트"
      meta={meta}
      headerAction={
        <Button
          size="md"
          variant="primary"
          icon="plus"
          disabled={projects.isPending}
          onClick={() => setCreating(true)}
        >
          새 프로젝트
        </Button>
      }
    >
      {projects.isError ? (
        <EmptyState
          size="lg"
          role="alert"
          icon="cloud-off"
          title="프로젝트를 불러오지 못했어요"
          description="네트워크 연결을 확인한 뒤 다시 시도해 주세요."
          action={
            <Button
              size="md"
              icon="rotate-cw"
              onClick={() => projects.refetch()}
            >
              다시 시도
            </Button>
          }
        />
      ) : projects.isSuccess && projects.data.length === 0 ? (
        <EmptyState
          size="lg"
          icon="folder-plus"
          title="아직 프로젝트가 없어요"
          description="첫 프로젝트를 만들고 세계와 이야기를 한곳에서 정리해 보세요."
          action={
            <Button
              size="md"
              variant="primary"
              icon="plus"
              onClick={() => setCreating(true)}
            >
              첫 프로젝트 만들기
            </Button>
          }
        />
      ) : (
        <section
          className={styles.section}
          aria-busy={projects.isPending || undefined}
        >
          <h2 className={styles.srOnly}>최근 작업순 프로젝트</h2>
          <div className={styles.grid}>
            {projects.isPending
              ? Array.from({ length: 6 }, (_, index) => (
                  <SkeletonCard key={index} />
                ))
              : projects.data.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onRename={setRenaming}
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
      <RenameProjectDialog
        project={renaming}
        onClose={() => setRenaming(null)}
        onRenamed={() => {
          setRenaming(null);
          toast({
            icon: "check",
            title: "프로젝트 이름을 변경했어요.",
          });
        }}
      />
      <TrashProjectDialog
        project={trashing}
        onClose={() => setTrashing(null)}
        onTrashed={() => {
          setTrashing(null);
          toast({
            icon: "trash-2",
            title: "프로젝트를 휴지통으로 이동했어요.",
            action: {
              label: "휴지통 보기",
              icon: "arrow-right",
              onSelect: () => router.push("/projects/trash"),
            },
          });
        }}
      />
    </ProjectShell>
  );
}
