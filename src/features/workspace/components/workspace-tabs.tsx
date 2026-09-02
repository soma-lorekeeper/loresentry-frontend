"use client";

import {
  type DragEvent,
  type KeyboardEvent,
  type RefObject,
  useEffect,
  useRef,
  useState,
} from "react";

import { Button, IconButton, StatusNotice } from "@/components/ui";
import { FileMemoWorkspace } from "@/features/memo/components/file-memo-workspace";
import { MemoDeleteDialog } from "@/features/memo/components/memo-delete-dialog";
import {
  ProjectMemos,
  type ProjectMemoScope,
} from "@/features/memo/components/project-memos";
import {
  emptyMemoCollection,
  initialMemoCollections,
  type FileMemo,
  type MemoDeleteInput,
  type MemoDeleteTarget,
  type MemoCollection,
  type MemoSaveInput,
  type MemoSaveStatus,
  type ProjectMemo,
} from "@/features/memo/memo-model";
import {
  createInitialPropertyDocument,
  type PropertyDocument,
  PropertyDocumentEditor,
  type PropertyReference,
  propertyFileIcons,
} from "@/features/property/components/property-document";
import type { PropertyDocumentScenario } from "@/features/property/property-document-states";

import { WorkspaceIcon, type WorkspaceIconName } from "../icons";
import type { WorkspaceNavItem } from "../workspace-data";
import { type RecentWorkspaceFile, WorkspaceNewTab } from "./workspace-new-tab";
import {
  createInitialManuscriptDocument,
  type ManuscriptDocument,
  type ManuscriptFocusTarget,
  WorkspaceManuscriptEditor,
} from "./workspace-manuscript-editor";
import { WorkspaceSearch } from "./workspace-search";
import styles from "./workspace.module.css";

export interface WorkspaceTab {
  closable?: boolean;
  icon: WorkspaceIconName;
  id: string;
  isFile: boolean;
  label: string;
}

interface WorkspaceTabBarProps {
  activeTabId: string;
  aiChatOpen: boolean;
  onActiveChange: (tabId: string) => void;
  onAiChatToggle: () => void;
  onClose: (tabId: string) => void;
  onNewTab: () => void;
  onReorder: (sourceId: string, targetId: string) => void;
  onSidebarToggle: () => void;
  sidebarOpen: boolean;
  tabs: WorkspaceTab[];
}

export function WorkspaceTabBar({
  activeTabId,
  aiChatOpen,
  onActiveChange,
  onAiChatToggle,
  onClose,
  onNewTab,
  onReorder,
  onSidebarToggle,
  sidebarOpen,
  tabs,
}: WorkspaceTabBarProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const showOverflowControls = tabs.length > 3;

  const closeAndFocus = (tabId: string) => {
    const closingIndex = tabs.findIndex((tab) => tab.id === tabId);
    const remaining = tabs.filter((tab) => tab.id !== tabId);
    const focusId =
      tabId === activeTabId
        ? (remaining[Math.min(closingIndex, remaining.length - 1)]?.id ??
          "new-tab")
        : activeTabId;
    onClose(tabId);
    requestAnimationFrame(() =>
      document.getElementById(`tab-${focusId}`)?.focus(),
    );
  };

  const focusTab = (index: number) => {
    const tab = tabs[(index + tabs.length) % tabs.length];
    if (!tab) return;
    onActiveChange(tab.id);
    requestAnimationFrame(() =>
      document.getElementById(`tab-${tab.id}`)?.focus(),
    );
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
    tabId: string,
  ) => {
    if (
      event.altKey &&
      (event.key === "ArrowLeft" || event.key === "ArrowRight")
    ) {
      event.preventDefault();
      const targetIndex = event.key === "ArrowLeft" ? index - 1 : index + 1;
      const target = tabs[targetIndex];
      if (target) onReorder(tabId, target.id);
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(tabs.length - 1);
    } else if (event.key === "Delete" && tabs[index]?.closable !== false) {
      event.preventDefault();
      closeAndFocus(tabId);
    }
  };

  const handleDrop = (event: DragEvent, targetId: string) => {
    event.preventDefault();
    const sourceId =
      event.dataTransfer.getData("text/workspace-tab") || draggingId;
    if (sourceId && sourceId !== targetId) onReorder(sourceId, targetId);
    setDraggingId(null);
  };

  return (
    <div className={styles.tabBar}>
      <IconButton
        aria-label={sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
        aria-pressed={sidebarOpen}
        className={styles.tabBarIconButton}
        onClick={onSidebarToggle}
      >
        <WorkspaceIcon name="sidebar" />
      </IconButton>

      <div className={styles.tabsViewport} ref={viewportRef}>
        <div aria-label="열린 문서" className={styles.tabsTrack} role="tablist">
          {tabs.map((tab, index) => {
            const active = tab.id === activeTabId;
            const dragging = tab.id === draggingId;
            return (
              <button
                aria-controls={`panel-${tab.id}`}
                aria-selected={active}
                className={styles.documentTab}
                data-active={active || undefined}
                data-dragging={dragging || undefined}
                data-document-id={tab.isFile ? tab.id : undefined}
                data-new-tab={tab.id === "new-tab" || undefined}
                draggable
                id={`tab-${tab.id}`}
                key={tab.id}
                onClick={() => onActiveChange(tab.id)}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={(event) => {
                  event.dataTransfer.setData("text/workspace-tab", tab.id);
                  setDraggingId(tab.id);
                }}
                onDrop={(event) => handleDrop(event, tab.id)}
                onKeyDown={(event) => handleKeyDown(event, index, tab.id)}
                role="tab"
                tabIndex={active ? 0 : -1}
                type="button"
              >
                <WorkspaceIcon name={dragging ? "grip" : tab.icon} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <div className={styles.tabCloseTrack}>
          {tabs.map((tab) => (
            <span
              className={styles.tabCloseSlot}
              data-new-tab={tab.id === "new-tab" || undefined}
              key={tab.id}
            >
              {tab.closable !== false && (
                <button
                  aria-label={`${tab.label} 탭 닫기`}
                  className={styles.tabClose}
                  onClick={() => closeAndFocus(tab.id)}
                  type="button"
                >
                  <WorkspaceIcon name="close" />
                </button>
              )}
            </span>
          ))}
        </div>
      </div>

      {showOverflowControls && (
        <div className={styles.overflowControls}>
          <IconButton
            aria-label="이전 탭 보기"
            className={styles.scrollButton}
            onClick={() =>
              viewportRef.current?.scrollBy({ left: -165, behavior: "smooth" })
            }
          >
            <WorkspaceIcon name="chevron-left" />
          </IconButton>
          <IconButton
            aria-label="다음 탭 보기"
            className={styles.scrollButton}
            onClick={() =>
              viewportRef.current?.scrollBy({ left: 165, behavior: "smooth" })
            }
          >
            <WorkspaceIcon name="chevron-right" />
          </IconButton>
        </div>
      )}

      <IconButton
        aria-label="새 탭 열기"
        className={styles.tabBarIconButton}
        onClick={onNewTab}
      >
        <WorkspaceIcon name="plus" />
      </IconButton>
      <span className={styles.tabBarSpacer} />
      <Button
        aria-pressed={aiChatOpen}
        className={styles.aiChatButton}
        icon={<WorkspaceIcon name="sparkles" />}
        onClick={onAiChatToggle}
      >
        AI 챗
      </Button>
    </div>
  );
}

interface FileHeaderProps {
  documentId: string;
  locked: boolean;
  memoActive: boolean;
  memoButtonRef: RefObject<HTMLButtonElement | null>;
  onAction: (action: string) => void;
  onLockToggle: () => void;
  onMemoToggle: () => void;
}

export function FileHeader({
  documentId,
  locked,
  memoActive,
  memoButtonRef,
  onAction,
  onLockToggle,
  onMemoToggle,
}: FileHeaderProps) {
  return (
    <header
      aria-label="파일 도구"
      className={styles.fileHeader}
      data-document-id={documentId}
    >
      <Button
        aria-pressed={memoActive}
        className={styles.headerButton}
        icon={<WorkspaceIcon name="memo" />}
        onClick={onMemoToggle}
        ref={memoButtonRef}
      >
        메모
      </Button>
      <Button
        className={styles.headerButton}
        icon={<WorkspaceIcon name="history" />}
        onClick={() => onAction("버전 기록을 열었습니다.")}
      >
        버전
      </Button>
      <Button
        className={styles.headerButton}
        icon={<WorkspaceIcon name="download" />}
        onClick={() => onAction("내보내기 준비를 시작했습니다.")}
      >
        내보내기
      </Button>
      <Button
        aria-pressed={locked}
        className={styles.headerButton}
        icon={<WorkspaceIcon name="lock" />}
        onClick={onLockToggle}
      >
        {locked ? "잠금 해제" : "잠금"}
      </Button>
    </header>
  );
}

interface WorkspaceContentProps {
  activeTab: WorkspaceTab;
  aiChatOpen: boolean;
  deleteMemo?: (memo: MemoDeleteInput) => Promise<void>;
  initialPropertyScenario?: PropertyDocumentScenario;
  onCreateFile: (fileType: string, icon: WorkspaceIconName) => void;
  onOpenSearchResult: (item: WorkspaceNavItem) => void;
  onSearchQueryChange: (query: string) => void;
  projectId: string;
  projectName: string;
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
  searchQuery: string;
}

const availablePropertyFiles: PropertyReference[] = [
  { id: "manuscript-12", title: "12화 · 균열의 밤", type: "manuscript" },
  { id: "manuscript-11", title: "11화 · 유리 정원", type: "manuscript" },
  { id: "character", title: "서윤", type: "character" },
  { id: "organization", title: "정원 기록단", type: "organization" },
  { id: "item", title: "은빛 등불", type: "item" },
  { id: "place", title: "북쪽 온실", type: "place" },
  { id: "place-garden", title: "유리 정원", type: "place" },
  { id: "setting", title: "균열의 법칙", type: "setting" },
];

const propertyDocumentIcons = new Set<WorkspaceIconName>(
  Object.values(propertyFileIcons).filter((icon) => icon !== "file"),
);

export function WorkspaceContent({
  activeTab,
  aiChatOpen,
  deleteMemo,
  initialPropertyScenario,
  onCreateFile,
  onOpenSearchResult,
  onSearchQueryChange,
  projectId,
  projectName,
  recentFiles,
  saveManuscript,
  saveMemo,
  savePropertyDocument,
  searchQuery,
}: WorkspaceContentProps) {
  const [memoOpen, setMemoOpen] = useState(false);
  const [locked, setLocked] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [editorFocusRestore, setEditorFocusRestore] = useState<{
    documentId: string;
    request: number;
    target: ManuscriptFocusTarget;
  }>();
  const [manuscriptDocuments, setManuscriptDocuments] = useState<
    Record<string, ManuscriptDocument>
  >({});
  const [propertyDocuments, setPropertyDocuments] = useState<
    Record<string, PropertyDocument>
  >(() =>
    initialPropertyScenario
      ? {
          [initialPropertyScenario.documentId]:
            initialPropertyScenario.document,
        }
      : {},
  );
  const [memoCollections, setMemoCollections] = useState<
    Record<string, MemoCollection>
  >(initialMemoCollections);
  const [memoScopes, setMemoScopes] = useState<
    Record<string, ProjectMemoScope>
  >({});
  const [pendingMemoId, setPendingMemoId] = useState<string>();
  const [deleteTarget, setDeleteTarget] = useState<MemoDeleteTarget>();
  const memoButtonRef = useRef<HTMLButtonElement>(null);
  const memoCounterRef = useRef(0);
  const memoLatestBodyRef = useRef<Record<string, string>>({});
  const memoRequestsRef = useRef<
    Record<string, { inFlight: boolean; queued?: MemoSaveInput }>
  >({});
  const memoSaveTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const lastEditorFocusRef = useRef<Record<string, ManuscriptFocusTarget>>({});
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );
  const propertySaveTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const propertyLatestRef = useRef<Record<string, PropertyDocument>>({});
  const propertyRequestsRef = useRef<
    Record<string, { inFlight: boolean; queued?: PropertyDocument }>
  >({});

  useEffect(
    () => () => {
      Object.values(saveTimersRef.current).forEach(clearTimeout);
      Object.values(memoSaveTimersRef.current).forEach(clearTimeout);
      Object.values(propertySaveTimersRef.current).forEach(clearTimeout);
    },
    [],
  );

  useEffect(() => {
    const target = lastEditorFocusRef.current[activeTab.id];
    if (!target) return;
    setEditorFocusRestore((current) => ({
      documentId: activeTab.id,
      request: (current?.request ?? 0) + 1,
      target,
    }));
  }, [activeTab.id]);

  const currentManuscript =
    manuscriptDocuments[activeTab.id] ??
    createInitialManuscriptDocument(activeTab.id, activeTab.label);
  const currentPropertyDocument =
    propertyDocuments[activeTab.id] ??
    createInitialPropertyDocument(activeTab.id, activeTab.label);
  const currentMemoCollection =
    memoCollections[projectId] ?? emptyMemoCollection();
  const currentMemoScope = memoScopes[projectId] ?? "project";
  const currentFileMemo = currentMemoCollection.file.find(
    (memo) => memo.fileId === activeTab.id,
  );

  const updateCurrentMemoCollection = (
    update: (collection: MemoCollection) => MemoCollection,
  ) => {
    setMemoCollections((current) => ({
      ...current,
      [projectId]: update(current[projectId] ?? emptyMemoCollection()),
    }));
  };

  const setMemoStatus = (
    targetProjectId: string,
    memoId: string,
    saveStatus: MemoSaveStatus,
  ) => {
    setMemoCollections((current) => {
      const collection = current[targetProjectId] ?? emptyMemoCollection();
      return {
        ...current,
        [targetProjectId]: {
          file: collection.file.map((memo) =>
            memo.id === memoId ? { ...memo, saveStatus } : memo,
          ),
          project: collection.project.map((memo) =>
            memo.id === memoId ? { ...memo, saveStatus } : memo,
          ),
        },
      };
    });
  };

  async function executeMemoSave(input: MemoSaveInput) {
    if (!saveMemo) return;
    const requestKey = `${input.projectId}:${input.id}`;
    const request = (memoRequestsRef.current[requestKey] ??= {
      inFlight: false,
    });
    if (request.inFlight) {
      request.queued = input;
      return;
    }
    request.inFlight = true;
    let failed = false;
    try {
      await saveMemo(input);
    } catch {
      failed = true;
    }

    const queued = request.queued;
    request.queued = undefined;
    request.inFlight = false;
    if (queued && queued.body !== input.body) {
      setMemoStatus(input.projectId, input.id, "saving");
      void executeMemoSave(queued);
      return;
    }
    if (memoLatestBodyRef.current[requestKey] !== input.body) {
      setMemoStatus(input.projectId, input.id, "saving");
      return;
    }
    setMemoStatus(input.projectId, input.id, failed ? "error" : "saved");
  }

  const scheduleMemoSave = (input: MemoSaveInput) => {
    const requestKey = `${input.projectId}:${input.id}`;
    memoLatestBodyRef.current[requestKey] = input.body;
    clearTimeout(memoSaveTimersRef.current[requestKey]);
    if (!saveMemo) {
      setMemoStatus(input.projectId, input.id, "disconnected");
      return;
    }
    setMemoStatus(input.projectId, input.id, "saving");
    memoSaveTimersRef.current[requestKey] = setTimeout(() => {
      delete memoSaveTimersRef.current[requestKey];
      void executeMemoSave(input);
    }, 350);
  };

  const retryMemoSave = (input: MemoSaveInput) => {
    if (!saveMemo) return;
    const requestKey = `${input.projectId}:${input.id}`;
    clearTimeout(memoSaveTimersRef.current[requestKey]);
    delete memoSaveTimersRef.current[requestKey];
    memoLatestBodyRef.current[requestKey] = input.body;
    setMemoStatus(input.projectId, input.id, "saving");
    void executeMemoSave(input);
  };

  const addProjectMemo = () => {
    memoCounterRef.current += 1;
    const id = `project-${projectId}-draft-${memoCounterRef.current}`;
    updateCurrentMemoCollection((collection) => ({
      ...collection,
      project: [{ id, body: "" }, ...collection.project],
    }));
    setMemoScopes((current) => ({ ...current, [projectId]: "project" }));
    setPendingMemoId(id);
  };

  const updateProjectMemo = (memo: ProjectMemo, body: string) => {
    updateCurrentMemoCollection((collection) => ({
      ...collection,
      project: collection.project.map((item) =>
        item.id === memo.id ? { ...item, body } : item,
      ),
    }));
    scheduleMemoSave({
      body,
      id: memo.id,
      projectId,
      scope: "project",
    });
  };

  const discardEmptyProjectMemo = (memo: ProjectMemo) => {
    if (memo.id !== pendingMemoId || memo.body.trim()) return;
    updateCurrentMemoCollection((collection) => ({
      ...collection,
      project: collection.project.filter((item) => item.id !== memo.id),
    }));
    setPendingMemoId(undefined);
  };

  const updateFileMemo = (memo: FileMemo, body: string) => {
    updateCurrentMemoCollection((collection) => ({
      ...collection,
      file: collection.file.map((item) =>
        item.id === memo.id ? { ...item, body } : item,
      ),
    }));
    scheduleMemoSave({
      body,
      fileId: memo.fileId,
      id: memo.id,
      projectId,
      scope: "file",
    });
  };

  const updateActiveFileMemo = (body: string) => {
    const memoId = currentFileMemo?.id ?? `file-${activeTab.id}-memo`;
    updateCurrentMemoCollection((collection) => {
      const existing = collection.file.find(
        (memo) => memo.fileId === activeTab.id,
      );
      if (existing) {
        return {
          ...collection,
          file: collection.file.map((memo) =>
            memo.id === existing.id ? { ...memo, body } : memo,
          ),
        };
      }
      return {
        ...collection,
        file: [
          {
            id: `file-${activeTab.id}-memo`,
            fileId: activeTab.id,
            fileName: activeTab.label,
            body,
          },
          ...collection.file,
        ],
      };
    });
    scheduleMemoSave({
      body,
      fileId: activeTab.id,
      id: memoId,
      projectId,
      scope: "file",
    });
  };

  const retryProjectMemo = (memo: ProjectMemo) =>
    retryMemoSave({
      body: memo.body,
      id: memo.id,
      projectId,
      scope: "project",
    });

  const retryFileMemo = (memo: FileMemo) =>
    retryMemoSave({
      body: memo.body,
      fileId: memo.fileId,
      id: memo.id,
      projectId,
      scope: "file",
    });

  const requestMemoDelete = (
    memo: FileMemo | ProjectMemo,
    scope: "file" | "project",
    returnFocus: HTMLElement,
  ) => {
    setDeleteTarget({
      body: memo.body,
      input: {
        fileId: "fileId" in memo ? memo.fileId : undefined,
        id: memo.id,
        projectId,
        scope,
      },
      label: "fileName" in memo ? memo.fileName : "프로젝트 메모",
      returnFocus,
    });
  };

  const finishMemoDelete = (target: MemoDeleteTarget) => {
    const collection =
      memoCollections[target.input.projectId] ?? emptyMemoCollection();
    const list =
      target.input.scope === "project" ? collection.project : collection.file;
    const deletedIndex = list.findIndex((memo) => memo.id === target.input.id);
    const nextMemo = list[deletedIndex + 1] ?? list[deletedIndex - 1];
    setMemoCollections((current) => {
      const currentCollection =
        current[target.input.projectId] ?? emptyMemoCollection();
      return {
        ...current,
        [target.input.projectId]: {
          file: currentCollection.file.filter(
            (memo) => memo.id !== target.input.id,
          ),
          project: currentCollection.project.filter(
            (memo) => memo.id !== target.input.id,
          ),
        },
      };
    });
    const requestKey = `${target.input.projectId}:${target.input.id}`;
    clearTimeout(memoSaveTimersRef.current[requestKey]);
    delete memoSaveTimersRef.current[requestKey];
    delete memoLatestBodyRef.current[requestKey];
    delete memoRequestsRef.current[requestKey];
    setDeleteTarget(undefined);
    requestAnimationFrame(() => {
      const nextInput = nextMemo
        ? document.querySelector<HTMLTextAreaElement>(
            `[data-memo-id="${nextMemo.id}"] textarea`,
          )
        : undefined;
      nextInput?.focus();
      if (nextInput) return;
      const fallback =
        document.querySelector<HTMLElement>("[data-add-project-memo]") ??
        document.querySelector<HTMLElement>(
          '[role="tab"][aria-selected="true"]',
        );
      fallback?.focus();
    });
  };

  const openMemoFile = (memo: FileMemo) => {
    onOpenSearchResult({
      contentId: memo.fileId,
      icon: "file",
      id: memo.fileId,
      kind: "file",
      label: memo.fileName,
    });
  };

  const persistManuscript = (
    documentId: string,
    document: ManuscriptDocument,
  ) => {
    clearTimeout(saveTimersRef.current[documentId]);
    if (!saveManuscript) {
      setManuscriptDocuments((current) => ({
        ...current,
        [documentId]: { ...document, saveStatus: "disconnected" },
      }));
      return;
    }

    const savingDocument = { ...document, saveStatus: "saving" as const };
    setManuscriptDocuments((current) => ({
      ...current,
      [documentId]: savingDocument,
    }));
    saveTimersRef.current[documentId] = setTimeout(async () => {
      try {
        await saveManuscript(documentId, savingDocument);
        setManuscriptDocuments((current) => ({
          ...current,
          [documentId]: { ...current[documentId], saveStatus: "saved" },
        }));
      } catch {
        setManuscriptDocuments((current) => ({
          ...current,
          [documentId]: { ...current[documentId], saveStatus: "error" },
        }));
      }
    }, 350);
  };

  const setPropertySaveStatus = (
    documentId: string,
    saveStatus: PropertyDocument["saveStatus"],
  ) => {
    setPropertyDocuments((current) => ({
      ...current,
      [documentId]: {
        ...(current[documentId] ??
          createInitialPropertyDocument(documentId, documentId)),
        saveStatus,
      },
    }));
  };

  async function executePropertySave(
    documentId: string,
    nextDocument: PropertyDocument,
  ) {
    if (!savePropertyDocument) return;
    const request = (propertyRequestsRef.current[documentId] ??= {
      inFlight: false,
    });
    if (request.inFlight) {
      request.queued = nextDocument;
      return;
    }
    request.inFlight = true;
    setPropertySaveStatus(documentId, "saving");
    let failed = false;
    try {
      await savePropertyDocument(documentId, {
        body: nextDocument.body,
        properties: nextDocument.properties,
        title: nextDocument.title,
      });
    } catch {
      failed = true;
    }
    const queued = request.queued;
    request.queued = undefined;
    request.inFlight = false;
    if (queued) {
      void executePropertySave(documentId, queued);
      return;
    }
    if (propertyLatestRef.current[documentId] !== nextDocument) {
      setPropertySaveStatus(documentId, "changed");
      return;
    }
    setPropertySaveStatus(documentId, failed ? "error" : "saved");
  }

  const persistPropertyDocument = (
    documentId: string,
    nextDocument: PropertyDocument,
  ) => {
    const changedDocument = { ...nextDocument, saveStatus: "changed" as const };
    propertyLatestRef.current[documentId] = changedDocument;
    clearTimeout(propertySaveTimersRef.current[documentId]);
    setPropertyDocuments((current) => ({
      ...current,
      [documentId]: changedDocument,
    }));
    if (!savePropertyDocument) return;
    propertySaveTimersRef.current[documentId] = setTimeout(() => {
      delete propertySaveTimersRef.current[documentId];
      void executePropertySave(documentId, changedDocument);
    }, 350);
  };

  const retryPropertySave = (documentId: string) => {
    if (!savePropertyDocument) return;
    clearTimeout(propertySaveTimersRef.current[documentId]);
    delete propertySaveTimersRef.current[documentId];
    const nextDocument =
      propertyLatestRef.current[documentId] ?? currentPropertyDocument;
    propertyLatestRef.current[documentId] = nextDocument;
    void executePropertySave(documentId, nextDocument);
  };

  const closeMemo = () => {
    setMemoOpen(false);
    requestAnimationFrame(() => memoButtonRef.current?.focus());
  };

  return (
    <div className={styles.contentColumn}>
      {activeTab.isFile && (
        <FileHeader
          documentId={activeTab.id}
          locked={locked}
          memoActive={memoOpen}
          memoButtonRef={memoButtonRef}
          onAction={setAnnouncement}
          onLockToggle={() => {
            setLocked((value) => !value);
            setAnnouncement(
              locked ? "편집 잠금을 해제했습니다." : "문서를 잠갔습니다.",
            );
          }}
          onMemoToggle={() => setMemoOpen((value) => !value)}
        />
      )}
      {activeTab.id === "new-tab" ? (
        <WorkspaceNewTab
          onCreateFile={onCreateFile}
          onOpenFile={onOpenSearchResult}
          projectName={projectName}
          recentFiles={recentFiles}
        />
      ) : activeTab.id === "search" ? (
        <WorkspaceSearch
          onOpenResult={onOpenSearchResult}
          onQueryChange={onSearchQueryChange}
          query={searchQuery}
        />
      ) : activeTab.id === "memo" ? (
        <ProjectMemos
          collection={currentMemoCollection}
          onAddProjectMemo={addProjectMemo}
          onDeleteRequest={requestMemoDelete}
          onFileMemoChange={updateFileMemo}
          onFileMemoRetry={retryFileMemo}
          onProjectMemoBlur={discardEmptyProjectMemo}
          onProjectMemoChange={updateProjectMemo}
          onProjectMemoRetry={retryProjectMemo}
          onOpenFile={openMemoFile}
          onScopeChange={(scope) =>
            setMemoScopes((current) => ({ ...current, [projectId]: scope }))
          }
          pendingMemoId={pendingMemoId}
          projectName={projectName}
          saveAvailable={Boolean(saveMemo)}
          scope={currentMemoScope}
        />
      ) : activeTab.isFile && propertyDocumentIcons.has(activeTab.icon) ? (
        <FileMemoWorkspace
          aiChatOpen={aiChatOpen}
          documentId={activeTab.id}
          documentName={activeTab.label}
          fileMemo={currentFileMemo}
          onAddProjectMemo={addProjectMemo}
          onClose={closeMemo}
          onDeleteRequest={requestMemoDelete}
          onFileMemoChange={updateActiveFileMemo}
          onFileMemoRetry={() => {
            if (currentFileMemo) retryFileMemo(currentFileMemo);
          }}
          onProjectMemoBlur={discardEmptyProjectMemo}
          onProjectMemoChange={updateProjectMemo}
          onProjectMemoRetry={retryProjectMemo}
          open={memoOpen}
          pendingMemoId={pendingMemoId}
          projectMemos={currentMemoCollection.project}
          saveAvailable={Boolean(saveMemo)}
        >
          <PropertyDocumentEditor
            availableFiles={availablePropertyFiles}
            document={currentPropertyDocument}
            documentId={activeTab.id}
            initialOpenTypeMenuFor={
              initialPropertyScenario?.documentId === activeTab.id
                ? initialPropertyScenario.initialOpenTypeMenuFor
                : undefined
            }
            key={activeTab.id}
            onChange={(nextDocument) =>
              persistPropertyDocument(activeTab.id, nextDocument)
            }
            onOpenReference={(reference) =>
              onOpenSearchResult({
                contentId: reference.id,
                icon: propertyFileIcons[reference.type],
                id: reference.id,
                kind: "file",
                label: reference.title,
              })
            }
            onRetrySave={() => retryPropertySave(activeTab.id)}
            saveAvailable={Boolean(savePropertyDocument)}
          />
        </FileMemoWorkspace>
      ) : activeTab.isFile && activeTab.icon === "file" ? (
        <FileMemoWorkspace
          aiChatOpen={aiChatOpen}
          documentId={activeTab.id}
          documentName={activeTab.label}
          fileMemo={currentFileMemo}
          onAddProjectMemo={addProjectMemo}
          onClose={closeMemo}
          onDeleteRequest={requestMemoDelete}
          onFileMemoChange={updateActiveFileMemo}
          onFileMemoRetry={() => {
            if (currentFileMemo) retryFileMemo(currentFileMemo);
          }}
          onProjectMemoBlur={discardEmptyProjectMemo}
          onProjectMemoChange={updateProjectMemo}
          onProjectMemoRetry={retryProjectMemo}
          open={memoOpen}
          pendingMemoId={pendingMemoId}
          projectMemos={currentMemoCollection.project}
          saveAvailable={Boolean(saveMemo)}
        >
          <WorkspaceManuscriptEditor
            document={currentManuscript}
            documentId={activeTab.id}
            focusRequest={editorFocusRestore?.request ?? 0}
            key={activeTab.id}
            onChange={(document) => persistManuscript(activeTab.id, document)}
            onFocusTargetChange={(target) => {
              lastEditorFocusRef.current[activeTab.id] = target;
            }}
            onRetrySave={() =>
              persistManuscript(activeTab.id, currentManuscript)
            }
            restoreFocus={
              editorFocusRestore?.documentId === activeTab.id
                ? editorFocusRestore.target
                : undefined
            }
          />
        </FileMemoWorkspace>
      ) : (
        <FileMemoWorkspace
          aiChatOpen={aiChatOpen}
          documentId={activeTab.id}
          documentName={activeTab.label}
          fileMemo={currentFileMemo}
          onAddProjectMemo={addProjectMemo}
          onClose={closeMemo}
          onDeleteRequest={requestMemoDelete}
          onFileMemoChange={updateActiveFileMemo}
          onFileMemoRetry={() => {
            if (currentFileMemo) retryFileMemo(currentFileMemo);
          }}
          onProjectMemoBlur={discardEmptyProjectMemo}
          onProjectMemoChange={updateProjectMemo}
          onProjectMemoRetry={retryProjectMemo}
          open={memoOpen && activeTab.isFile}
          pendingMemoId={pendingMemoId}
          projectMemos={currentMemoCollection.project}
          saveAvailable={Boolean(saveMemo)}
        >
          <section
            aria-labelledby={`tab-${activeTab.id}`}
            className={styles.workspaceCanvas}
            id={`panel-${activeTab.id}`}
            role="tabpanel"
            tabIndex={-1}
          >
            <div className={styles.canvasCopy}>
              <span className={styles.eyebrow}>
                {activeTab.isFile ? "문서" : "Workspace"}
              </span>
              <h1>{activeTab.label}</h1>
              <p>
                선택한 탭의 작업 문맥입니다. 탭은 키보드로 이동·닫기·재정렬할 수
                있으며 파일 도구의 상태는 현재 문서에 유지됩니다.
              </p>
              {announcement && <StatusNotice>{announcement}</StatusNotice>}
            </div>
          </section>
        </FileMemoWorkspace>
      )}
      <MemoDeleteDialog
        deleteMemo={deleteMemo}
        key={deleteTarget?.input.id ?? "closed"}
        onClose={() => setDeleteTarget(undefined)}
        onDeleted={finishMemoDelete}
        target={deleteTarget}
      />
    </div>
  );
}
