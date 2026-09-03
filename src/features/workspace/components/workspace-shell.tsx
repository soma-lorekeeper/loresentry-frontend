"use client";

import { useRef, useState } from "react";

import { AiChatPanel } from "@/features/ai-chat/components/ai-chat-panel";
import {
  createHelpScenario,
  type HelpStateId,
} from "@/features/help/help-states";
import type { MemoSaveInput } from "@/features/memo/memo-model";
import type { MemoDeleteInput } from "@/features/memo/memo-model";
import type { PropertyDocument } from "@/features/property/components/property-document";
import {
  createPropertyDocumentScenario,
  type PropertyDocumentStateId,
} from "@/features/property/property-document-states";
import type { TimelineItem } from "@/features/timeline/timeline-model";
import {
  createSettingsScenario,
  type SettingsStateId,
} from "@/features/settings/settings-states";
import type {
  ProjectSettingsHandle,
  WorkspaceSettingsInput,
} from "@/features/settings/components/project-settings";
import {
  createTimelineScenario,
  type TimelineStateId,
} from "@/features/timeline/timeline-states";
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

const defaultInitialTabs: WorkspaceTab[] = [
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
  copyFeedbackLink?: (url: string) => Promise<void>;
  deleteTimelineItem?: (documentId: string, itemId: string) => Promise<void>;
  deleteMemo?: (memo: MemoDeleteInput) => Promise<void>;
  initialPropertyState?: PropertyDocumentStateId;
  initialHelpState?: HelpStateId;
  initialProjectId: string;
  initialSettingsState?: SettingsStateId;
  initialTimelineState?: TimelineStateId;
  moveProjectToTrash?: (projectId: string) => Promise<void>;
  onProjectChange?: (projectId: string) => void;
  onProjectListSelect?: () => void;
  onProjectMovedToTrash?: (projectId: string) => void;
  feedbackUrl?: string;
  loadGuideArticle?: (topicId: string) => Promise<void>;
  openExternalFeedback?: (url: string) => Window | null;
  recentFiles?: RecentWorkspaceFile[];
  saveManuscript?: (
    documentId: string,
    document: Pick<ManuscriptDocument, "body" | "title">,
  ) => Promise<void>;
  saveMemo?: (memo: MemoSaveInput) => Promise<void>;
  savePropertyDocument?: (
    documentId: string,
    document: Pick<PropertyDocument, "body" | "properties" | "title">,
  ) => Promise<void>;
  saveWorkspaceSettings?: (settings: WorkspaceSettingsInput) => Promise<void>;
  saveTimelineItem?: (documentId: string, item: TimelineItem) => Promise<void>;
}

export function WorkspaceShell({
  copyFeedbackLink,
  deleteMemo,
  deleteTimelineItem,
  initialPropertyState,
  initialHelpState,
  initialProjectId,
  initialSettingsState,
  initialTimelineState,
  moveProjectToTrash,
  onProjectChange,
  onProjectListSelect,
  onProjectMovedToTrash,
  feedbackUrl,
  loadGuideArticle,
  openExternalFeedback,
  recentFiles,
  saveManuscript,
  saveMemo,
  savePropertyDocument,
  saveWorkspaceSettings,
  saveTimelineItem,
}: WorkspaceShellProps) {
  const initialPropertyScenario = initialPropertyState
    ? createPropertyDocumentScenario(initialPropertyState)
    : undefined;
  const initialTimelineScenario = initialTimelineState
    ? createTimelineScenario(initialTimelineState)
    : undefined;
  const initialSettingsScenario = initialSettingsState
    ? createSettingsScenario(initialSettingsState)
    : undefined;
  const initialHelpScenario = initialHelpState
    ? createHelpScenario(initialHelpState)
    : undefined;
  const initialTabs: WorkspaceTab[] = initialSettingsScenario
    ? [
        {
          id: "settings",
          icon: "settings",
          isFile: false,
          label: "설정",
        },
      ]
    : initialHelpScenario
      ? [
          {
            id: "help",
            icon: "help",
            isFile: false,
            label: "도움말",
          },
        ]
      : initialTimelineScenario
        ? [
            {
              id: "event",
              icon: "event",
              isFile: true,
              label: "균열의 밤",
            },
          ]
        : initialPropertyScenario
          ? [
              {
                id: initialPropertyScenario.documentId,
                icon: initialPropertyScenario.icon,
                isFile: true,
                label: initialPropertyScenario.label,
              },
            ]
          : defaultInitialTabs;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedId, setSelectedId] = useState(
    initialSettingsScenario
      ? "settings"
      : initialHelpScenario
        ? "help"
        : initialTimelineScenario
          ? "event"
          : (initialPropertyScenario?.documentId ?? "favorite-manuscript-12"),
  );
  const [tabs, setTabs] = useState(initialTabs);
  const [activeTabId, setActiveTabId] = useState(initialTabs[0].id);
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentProject, setCurrentProject] = useState(
    projects.find((project) => project.id === initialProjectId) ?? projects[0],
  );
  const draftCounterRef = useRef(0);
  const settingsRef = useRef<ProjectSettingsHandle>(null);

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

  const performCloseTab = (tabId: string) => {
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

  const closeTab = (tabId: string) => {
    if (tabId === "settings" && settingsRef.current?.hasUnsavedChanges()) {
      settingsRef.current.requestDiscard(() => performCloseTab(tabId));
      return;
    }
    performCloseTab(tabId);
  };

  const commitProjectSelection = (project: (typeof projects)[number]) => {
    setCurrentProject(project);
    onProjectChange?.(project.id);
  };

  const selectProject = (project: (typeof projects)[number]) => {
    if (
      project.id !== currentProject.id &&
      settingsRef.current?.hasUnsavedChanges()
    ) {
      settingsRef.current.requestDiscard(() => commitProjectSelection(project));
      return;
    }
    commitProjectSelection(project);
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
            onProjectListSelect={onProjectListSelect}
            onProjectSelect={selectProject}
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
          copyFeedbackLink={copyFeedbackLink}
          deleteMemo={deleteMemo}
          deleteTimelineItem={deleteTimelineItem}
          onCreateFile={createFileFromNewTab}
          onOpenSearchResult={openSearchResult}
          onSearchQueryChange={setSearchQuery}
          initialPropertyScenario={initialPropertyScenario}
          initialHelpScenario={initialHelpScenario}
          initialSettingsScenario={initialSettingsScenario}
          initialTimelineScenario={initialTimelineScenario}
          moveProjectToTrash={moveProjectToTrash}
          feedbackUrl={feedbackUrl}
          helpOpen={tabs.some((tab) => tab.id === "help")}
          loadGuideArticle={loadGuideArticle}
          openExternalFeedback={openExternalFeedback}
          projectId={currentProject.id}
          projectName={currentProject.name}
          recentFiles={recentFiles}
          saveManuscript={saveManuscript}
          saveMemo={saveMemo}
          savePropertyDocument={savePropertyDocument}
          saveWorkspaceSettings={saveWorkspaceSettings}
          saveTimelineItem={saveTimelineItem}
          searchQuery={searchQuery}
          onProjectNameSaved={(name) =>
            setCurrentProject((project) => ({ ...project, name }))
          }
          onProjectMovedToTrash={onProjectMovedToTrash}
          settingsOpen={tabs.some((tab) => tab.id === "settings")}
          settingsRef={settingsRef}
        />
      </main>
      <AiChatPanel documentName={activeTab.label} hidden={!aiChatOpen} />
    </div>
  );
}
