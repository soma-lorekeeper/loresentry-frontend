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
  onCreateFile: (fileType: string, icon: WorkspaceIconName) => void;
  onOpenSearchResult: (item: WorkspaceNavItem) => void;
  onSearchQueryChange: (query: string) => void;
  projectName: string;
  recentFiles?: RecentWorkspaceFile[];
  saveManuscript?: (
    documentId: string,
    document: Pick<ManuscriptDocument, "body" | "title">,
  ) => Promise<void>;
  searchQuery: string;
}

export function WorkspaceContent({
  activeTab,
  onCreateFile,
  onOpenSearchResult,
  onSearchQueryChange,
  projectName,
  recentFiles,
  saveManuscript,
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
  const memoButtonRef = useRef<HTMLButtonElement>(null);
  const lastEditorFocusRef = useRef<Record<string, ManuscriptFocusTarget>>({});
  const saveTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>(
    {},
  );

  useEffect(
    () => () => {
      Object.values(saveTimersRef.current).forEach(clearTimeout);
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

  const closeMemo = () => {
    setMemoOpen(false);
    const target = lastEditorFocusRef.current[activeTab.id];
    if (target) {
      setEditorFocusRestore((current) => ({
        documentId: activeTab.id,
        request: (current?.request ?? 0) + 1,
        target,
      }));
    } else {
      requestAnimationFrame(() => memoButtonRef.current?.focus());
    }
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
      ) : activeTab.isFile && activeTab.icon === "file" ? (
        <div className={styles.documentLayout}>
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
          {memoOpen && (
            <aside
              aria-label={`${activeTab.label} 메모`}
              className={styles.memoPanel}
            >
              <div className={styles.memoPanelHeader}>
                <strong>파일 메모</strong>
                <IconButton aria-label="파일 메모 닫기" onClick={closeMemo}>
                  <WorkspaceIcon name="close" />
                </IconButton>
              </div>
              <p>이 문서에서 이어서 기록할 메모를 표시합니다.</p>
            </aside>
          )}
        </div>
      ) : (
        <div className={styles.documentLayout}>
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
          {memoOpen && activeTab.isFile && (
            <aside
              aria-label={`${activeTab.label} 메모`}
              className={styles.memoPanel}
            >
              <div className={styles.memoPanelHeader}>
                <strong>파일 메모</strong>
                <IconButton aria-label="파일 메모 닫기" onClick={closeMemo}>
                  <WorkspaceIcon name="close" />
                </IconButton>
              </div>
              <p>이 문서에서 이어서 기록할 메모를 표시합니다.</p>
            </aside>
          )}
        </div>
      )}
    </div>
  );
}
