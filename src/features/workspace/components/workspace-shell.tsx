"use client";

import { useRef, useState } from "react";

import { AiChatPanel } from "@/features/ai-chat/components/ai-chat-panel";
import { projects, type WorkspaceNavItem } from "../workspace-data";
import { WorkspaceSidebar } from "./workspace-sidebar";
import type { ManuscriptDocument } from "./workspace-manuscript-editor";
import type { RecentWorkspaceFile } from "./workspace-new-tab";
import {
  WorkspaceContent,
  WorkspaceTabBar,
  type WorkspaceTab,
} from "./workspace-tabs";
import styles from "./workspace.module.css";

const initialTabs: WorkspaceTab[] = [
  {
    id: "manuscript-12",
    icon: "file",
    isFile: true,
    label: "12화 · 균열의 밤",
  },
  {
    id: "manuscript-11",
    icon: "file",
    isFile: true,
    label: "11화 · 유리 정원",
  },
];

function toTab(item: WorkspaceNavItem): WorkspaceTab | null {
  if (item.kind === "folder") return null;
  return {
    id: item.contentId ?? item.id,
    icon: item.icon,
    isFile: item.kind === "file",
    label: item.label,
  };
}

export interface WorkspaceShellProps {
  initialProjectId: string;
  recentFiles?: RecentWorkspaceFile[];
  saveManuscript?: (
    documentId: string,
    document: Pick<ManuscriptDocument, "body" | "title">,
  ) => Promise<void>;
}

export function WorkspaceShell({
  initialProjectId,
  recentFiles,
  saveManuscript,
}: WorkspaceShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedId, setSelectedId] = useState("favorite-manuscript-12");
  const [tabs, setTabs] = useState(initialTabs);
  const [activeTabId, setActiveTabId] = useState(initialTabs[0].id);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentProject, setCurrentProject] = useState(
    projects.find((project) => project.id === initialProjectId) ?? projects[0],
  );
  const draftCounterRef = useRef(0);

  const selectTarget = (item: WorkspaceNavItem) => {
    setSelectedId(item.id);
    const nextTab = toTab(item);
    if (!nextTab) return;
    setTabs((current) => {
      if (current.some((tab) => tab.id === nextTab.id)) return current;
      if (current.some((tab) => tab.id === "new-tab")) {
        return current.map((tab) => (tab.id === "new-tab" ? nextTab : tab));
      }
      return [...current, nextTab];
    });
    setActiveTabId(nextTab.id);
  };

  const closeTab = (tabId: string) => {
    setTabs((current) => {
      const closingIndex = current.findIndex((tab) => tab.id === tabId);
      const remaining = current.filter((tab) => tab.id !== tabId);
      if (remaining.length === 0) {
        setActiveTabId("new-tab");
        return [
          {
            id: "new-tab",
            icon: "home",
            isFile: false,
            label: "새 탭",
            closable: false,
          },
        ];
      }
      if (tabId === activeTabId) {
        setActiveTabId(
          remaining[Math.min(closingIndex, remaining.length - 1)].id,
        );
      }
      return remaining;
    });
  };

  const openNewTab = () => {
    if (!tabs.some((tab) => tab.id === "new-tab")) {
      setTabs((current) => [
        ...current,
        {
          id: "new-tab",
          icon: "home",
          isFile: false,
          label: "새 탭",
          closable: false,
        },
      ]);
    }
    setActiveTabId("new-tab");
  };

  const reorderTabs = (sourceId: string, targetId: string) => {
    setTabs((current) => {
      const sourceIndex = current.findIndex((tab) => tab.id === sourceId);
      const targetIndex = current.findIndex((tab) => tab.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0) return current;
      const next = [...current];
      const [source] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, source);
      return next;
    });
  };

  const removeTrashedTabs = (contentIds: string[]) => {
    setTabs((current) => {
      const remaining = current.filter((tab) => !contentIds.includes(tab.id));
      if (remaining.length === 0) {
        setActiveTabId("new-tab");
        return [
          {
            id: "new-tab",
            icon: "home",
            isFile: false,
            label: "새 탭",
            closable: false,
          },
        ];
      }
      if (contentIds.includes(activeTabId)) setActiveTabId(remaining[0].id);
      return remaining;
    });
  };

  const renameOpenTab = (contentId: string, label: string) => {
    setTabs((current) =>
      current.map((tab) => (tab.id === contentId ? { ...tab, label } : tab)),
    );
  };

  const openSearchResult = (item: WorkspaceNavItem) => {
    selectTarget(item);
    requestAnimationFrame(() =>
      document.getElementById(`panel-${item.contentId ?? item.id}`)?.focus(),
    );
  };

  const createFileFromNewTab = (
    fileType: string,
    icon: WorkspaceTab["icon"],
  ) => {
    draftCounterRef.current += 1;
    selectTarget({
      icon,
      id: `draft-${fileType}-${draftCounterRef.current}`,
      kind: "file",
      label: `제목 없는 ${fileType}`,
    });
  };

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  return (
    <div
      className={styles.shell}
      data-ai-chat-open={aiChatOpen}
      data-project-id={currentProject.id}
      data-sidebar-open={sidebarOpen}
    >
      <div aria-hidden={!sidebarOpen} className={styles.sidebarSlot}>
        {sidebarOpen && (
          <WorkspaceSidebar
            currentProject={currentProject}
            onProjectSelect={setCurrentProject}
            onRename={renameOpenTab}
            onSelect={selectTarget}
            onTrash={removeTrashedTabs}
            projects={projects}
            selectedId={selectedId}
            userName="서윤주"
          />
        )}
      </div>

      <main className={styles.workspaceMain}>
        <WorkspaceTabBar
          activeTabId={activeTabId}
          aiChatOpen={aiChatOpen}
          onActiveChange={setActiveTabId}
          onAiChatToggle={() => setAiChatOpen((open) => !open)}
          onClose={closeTab}
          onNewTab={openNewTab}
          onReorder={reorderTabs}
          onSidebarToggle={() => setSidebarOpen((open) => !open)}
          sidebarOpen={sidebarOpen}
          tabs={tabs}
        />
        <WorkspaceContent
          activeTab={activeTab}
          aiChatOpen={aiChatOpen}
          onCreateFile={createFileFromNewTab}
          onOpenSearchResult={openSearchResult}
          onSearchQueryChange={setSearchQuery}
          projectName={currentProject.name}
          recentFiles={recentFiles}
          saveManuscript={saveManuscript}
          searchQuery={searchQuery}
        />
      </main>
      <AiChatPanel documentName={activeTab.label} hidden={!aiChatOpen} />
    </div>
  );
}
