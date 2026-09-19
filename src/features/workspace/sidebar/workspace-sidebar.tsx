"use client";

import { useMemo, useState } from "react";

import { IconButton, SidebarButton } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";

import { activeTabOf, type WorkspaceViewKind } from "../model/layout";
import { ancestorsOf, buildTree, indexNodes, isDocument } from "../model/tree";
import { useFavorites, useFileTree } from "../queries";
import { useWorkspace } from "../workspace-context";
import { FileTree } from "./file-tree";
import { ProjectSwitcher } from "./project-switcher";
import styles from "./sidebar.module.css";

const PRIMARY_NAV: Array<{
  kind: WorkspaceViewKind;
  label: string;
  icon: "search" | "waypoints" | "chart-no-axes-gantt" | "notebook-pen";
}> = [
  { kind: "search", label: "검색", icon: "search" },
  { kind: "graph", label: "그래프", icon: "waypoints" },
  { kind: "timeline", label: "타임라인", icon: "chart-no-axes-gantt" },
  { kind: "memo", label: "메모", icon: "notebook-pen" },
];

const UTILITY_NAV: Array<{
  kind: WorkspaceViewKind;
  label: string;
  icon: "trash-2" | "settings" | "circle-help";
}> = [
  { kind: "trash", label: "휴지통", icon: "trash-2" },
  { kind: "settings", label: "설정", icon: "settings" },
  { kind: "help", label: "도움말", icon: "circle-help" },
];

export function WorkspaceSidebar() {
  const { projectId, user, open, activePane, activeFileId } = useWorkspace();
  const tree = useFileTree(projectId);
  const favorites = useFavorites(projectId);
  const nodes = useMemo(() => tree.data ?? [], [tree.data]);
  const index = useMemo(() => indexNodes(nodes), [nodes]);
  const items = useMemo(() => buildTree(nodes), [nodes]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [revealed, setRevealed] = useState<string | null>(null);
  const activeKind = activeTabOf(activePane).target.kind;

  if (activeFileId && activeFileId !== revealed && index.has(activeFileId)) {
    setRevealed(activeFileId);
    const path = ancestorsOf(index, activeFileId).map((node) => node.id);
    if (!path.every((id) => expanded.has(id))) {
      setExpanded(new Set([...expanded, ...path]));
    }
  }

  const toggle = (id: string, expand?: boolean) =>
    setExpanded((current) => {
      const next = new Set(current);
      const shouldExpand = expand ?? !next.has(id);
      if (shouldExpand) next.add(id);
      else next.delete(id);
      return next;
    });

  const favoriteNodes = (favorites.data ?? [])
    .map((id) => index.get(id))
    .filter(isDocument);

  return (
    <nav className={styles.sidebar} aria-label="작업공간">
      <div className={styles.user}>
        <span className={styles.avatar} aria-hidden="true" />
        {user.displayName}
      </div>
      <ProjectSwitcher />
      <div className={styles.nav}>
        {PRIMARY_NAV.map((item) => (
          <SidebarButton
            key={item.kind}
            icon={item.icon}
            label={item.label}
            selected={activeKind === item.kind}
            onClick={() => open({ kind: item.kind })}
          />
        ))}
      </div>
      <div className={styles.nav}>
        <div className={styles.divider} />
        <SidebarButton icon="refresh-cw" label="그래프 최신화" />
      </div>
      <div className={styles.scroll}>
        <section className={styles.section} aria-label="즐겨찾기">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>즐겨찾기</span>
            <IconButton
              icon="ellipsis"
              iconSize={15}
              label="즐겨찾기 더보기"
              className={styles.sectionMore}
            />
          </div>
          {favoriteNodes.length === 0 ? (
            <p className={styles.empty}>
              문서의 별을 눌러 즐겨찾기에 추가하세요.
            </p>
          ) : (
            favoriteNodes.map((node) => (
              <SidebarButton
                key={node.id}
                icon={DOCUMENT_TYPE_META[node.docType].entityIcon}
                label={node.title}
                selected={node.id === activeFileId}
                onClick={() => open({ kind: "file", fileId: node.id })}
              />
            ))
          )}
        </section>
        <section className={styles.section} aria-label="파일">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>파일</span>
            <IconButton
              icon="ellipsis"
              iconSize={15}
              label="파일 더보기"
              className={styles.sectionMore}
            />
          </div>
          <FileTree
            items={items}
            expanded={expanded}
            selectedId={activeFileId}
            label="파일"
            onToggle={toggle}
            onOpen={(node) => open({ kind: "file", fileId: node.id })}
          />
        </section>
      </div>
      <div className={styles.utility}>
        {UTILITY_NAV.map((item) => (
          <SidebarButton
            key={item.kind}
            icon={item.icon}
            label={item.label}
            selected={activeKind === item.kind}
            onClick={() => open({ kind: item.kind })}
          />
        ))}
      </div>
    </nav>
  );
}
