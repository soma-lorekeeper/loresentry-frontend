"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { Icon, Menu, type MenuEntry } from "@/design-system/primitives";
import { useProjects } from "@/features/projects/queries";
import { workspaceHref } from "@/features/projects/project-list";

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
      label: "프로젝트 목록",
      icon: "list",
      onSelect: () => router.push("/projects"),
    },
    {
      id: project.id,
      label: project.title,
      icon: project.icon,
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
        aria-label={`프로젝트 전환, 현재 ${project.title}`}
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name={project.icon} size={15} />
        <span className={styles.switcherName}>{project.title}</span>
        <Icon name="chevron-down" size={14} />
      </button>
      <Menu
        anchorRef={triggerRef}
        open={open}
        onOpenChange={setOpen}
        label="프로젝트 전환"
        entries={entries}
        itemHeight={36}
      />
    </>
  );
}
