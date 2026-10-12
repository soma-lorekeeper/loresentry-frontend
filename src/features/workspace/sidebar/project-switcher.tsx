"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Icon, Menu, type MenuEntry } from "@/design-system/primitives";
import { useProjects } from "@/features/projects/queries";
import { workspaceHref } from "@/features/projects/project-list";
import { t } from "@/i18n";

import { useWorkspace } from "../workspace-context";
import styles from "./sidebar.module.css";

export function ProjectSwitcher() {
  const router = useRouter();
  const { project } = useWorkspace();
  const projects = useProjects();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const entries: MenuEntry[] = [
    {
      id: "list",
      label: t("작업공간::프로젝트 목록"),
      icon: "list",
      onSelect: () => router.push("/projects"),
    },
    {
      id: project.id,
      label: project.title,
      // 열어 둔 프로젝트는 펼친 책, 나머지는 덮은 책이다. 프로젝트 목록의 카드와 같은 규칙이다.
      icon: "book-open",
      checked: true,
      onSelect: () => {},
    },
    ...(projects.data ?? [])
      .filter((candidate) => candidate.id !== project.id)
      .map((candidate) => ({
        id: candidate.id,
        label: candidate.title,
        icon: "book" as const,
        onSelect: () => router.push(workspaceHref(candidate.id)),
      })),
  ];

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.switcher}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("프로젝트 전환, 현재 {title}", { title: project.title })}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="book-open" size={15} />
        <span className={styles.switcherName}>{project.title}</span>
        <Icon name="chevron-down" size={14} />
      </button>
      <Menu
        anchorRef={triggerRef}
        open={open}
        onOpenChange={setOpen}
        label={t("프로젝트 전환")}
        entries={entries}
        itemHeight={36}
      />
    </>
  );
}
