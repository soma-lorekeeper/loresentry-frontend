"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

import { IconButton } from "@/components/ui";
import type { FileMemo, ProjectMemo } from "@/features/memo/memo-model";
import { WorkspaceIcon } from "@/features/workspace/icons";

import { MemoCard } from "./memo-card";
import styles from "./file-memo-workspace.module.css";

export type MemoPlacement = "below" | "right";
export type MemoScope = "manuscript" | "work";

interface FileMemoWorkspaceProps {
  aiChatOpen: boolean;
  children: ReactNode;
  documentId: string;
  documentName: string;
  fileMemo?: FileMemo;
  onAddProjectMemo: () => void;
  onClose: () => void;
  onDeleteRequest: (
    memo: FileMemo | ProjectMemo,
    scope: "file" | "project",
    returnFocus: HTMLElement,
  ) => void;
  onFileMemoChange: (body: string) => void;
  onFileMemoRetry: () => void;
  onProjectMemoBlur: (memo: ProjectMemo) => void;
  onProjectMemoChange: (memo: ProjectMemo, body: string) => void;
  onProjectMemoRetry: (memo: ProjectMemo) => void;
  open: boolean;
  pendingMemoId?: string;
  projectMemos: ProjectMemo[];
  saveAvailable: boolean;
}

export function FileMemoWorkspace({
  aiChatOpen,
  children,
  documentId,
  documentName,
  fileMemo,
  onAddProjectMemo,
  onClose,
  onDeleteRequest,
  onFileMemoChange,
  onFileMemoRetry,
  onProjectMemoBlur,
  onProjectMemoChange,
  onProjectMemoRetry,
  open,
  pendingMemoId,
  projectMemos,
  saveAvailable,
}: FileMemoWorkspaceProps) {
  const [placement, setPlacement] = useState<MemoPlacement>("right");
  const [scope, setScope] = useState<MemoScope>("work");
  const [rightWidth, setRightWidth] = useState(360);
  const [belowHeight, setBelowHeight] = useState(300);
  const [announcement, setAnnouncement] = useState("");
  const workTabRef = useRef<HTMLButtonElement>(null);
  const manuscriptTabRef = useRef<HTMLButtonElement>(null);
  const pendingInputRef = useRef<HTMLTextAreaElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<
    | {
        pointerId: number;
        startPosition: number;
        startSize: number;
      }
    | undefined
  >(undefined);
  const [workspaceSize, setWorkspaceSize] = useState({ height: 0, width: 0 });
  const temporarilyBelow = aiChatOpen && placement === "right";
  const effectivePlacement = temporarilyBelow ? "below" : placement;
  const maximumRightWidth =
    workspaceSize.width > 0
      ? Math.max(320, Math.floor(workspaceSize.width * 0.45))
      : 560;
  const maximumBelowHeight =
    workspaceSize.height > 0
      ? Math.max(240, Math.floor(workspaceSize.height * 0.5))
      : 480;
  const displayedRightWidth = Math.min(rightWidth, maximumRightWidth);
  const displayedBelowHeight = Math.min(belowHeight, maximumBelowHeight);
  const currentSize =
    effectivePlacement === "right" ? displayedRightWidth : displayedBelowHeight;
  const minimumSize = effectivePlacement === "right" ? 320 : 240;
  const maximumSize =
    effectivePlacement === "right" ? maximumRightWidth : maximumBelowHeight;
  const sizeLabel = effectivePlacement === "right" ? "너비" : "높이";
  const panelId = `file-memo-panel-${documentId}`;
  const style = {
    "--memo-below-height": `${displayedBelowHeight}px`,
    "--memo-right-width": `${displayedRightWidth}px`,
  } as CSSProperties;

  useEffect(() => {
    if (!pendingMemoId || !open || scope !== "work") return;
    requestAnimationFrame(() => pendingInputRef.current?.focus());
  }, [open, pendingMemoId, scope]);

  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;
    const measure = () => {
      const bounds = workspace.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) {
        setWorkspaceSize({ height: bounds.height, width: bounds.width });
      }
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const size = entries[0]?.contentRect;
      if (size && size.width > 0 && size.height > 0) {
        setWorkspaceSize({ height: size.height, width: size.width });
      }
    });
    observer.observe(workspace);
    return () => observer.disconnect();
  }, []);

  const changeSize = (next: number) => {
    const clamped = Math.min(maximumSize, Math.max(minimumSize, next));
    if (effectivePlacement === "right") setRightWidth(clamped);
    else {
      setBelowHeight(clamped);
      if (temporarilyBelow) setPlacement("below");
    }
    setAnnouncement(`메모 패널 ${sizeLabel} ${clamped}픽셀`);
  };

  const handleResizeKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 8;
    let delta = 0;
    if (effectivePlacement === "right") {
      if (event.key === "ArrowLeft") delta = step;
      if (event.key === "ArrowRight") delta = -step;
    } else {
      if (event.key === "ArrowUp") delta = step;
      if (event.key === "ArrowDown") delta = -step;
    }
    if (!delta) return;
    event.preventDefault();
    changeSize(currentSize + delta);
  };

  const handleResizePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    event.preventDefault();
    dragRef.current = {
      pointerId: event.pointerId,
      startPosition:
        effectivePlacement === "right" ? event.clientX : event.clientY,
      startSize: currentSize,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handleResizePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const position =
      effectivePlacement === "right" ? event.clientX : event.clientY;
    changeSize(drag.startSize + drag.startPosition - position);
  };

  const handleResizePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return;
    dragRef.current = undefined;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const changeScopeFromKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    current: MemoScope,
  ) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
      return;
    }
    event.preventDefault();
    let next: MemoScope;
    if (event.key === "Home") next = "work";
    else if (event.key === "End") next = "manuscript";
    else next = current === "work" ? "manuscript" : "work";
    setScope(next);
    requestAnimationFrame(() =>
      (next === "work" ? workTabRef : manuscriptTabRef).current?.focus(),
    );
  };

  return (
    <div
      className={styles.workspace}
      data-memo-open={open || undefined}
      data-placement={open ? effectivePlacement : undefined}
      ref={workspaceRef}
      style={style}
    >
      <div className={styles.editorSlot}>{children}</div>
      {open && (
        <div
          aria-controls={panelId}
          aria-label={`메모 패널 ${sizeLabel} 조절, 현재 ${currentSize}픽셀`}
          aria-orientation={
            effectivePlacement === "right" ? "vertical" : "horizontal"
          }
          aria-valuemax={maximumSize}
          aria-valuemin={minimumSize}
          aria-valuenow={currentSize}
          className={styles.resizeHandle}
          onKeyDown={handleResizeKeyDown}
          onPointerCancel={handleResizePointerUp}
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          role="separator"
          tabIndex={0}
        >
          <span aria-hidden="true" />
        </div>
      )}
      <aside
        aria-label={`${documentName} 메모`}
        className={styles.panel}
        data-placement={effectivePlacement}
        hidden={!open}
        id={panelId}
      >
        <header className={styles.panelHeader}>
          <IconButton aria-label="파일 메모 닫기" onClick={onClose}>
            <WorkspaceIcon name="close" />
          </IconButton>
          <strong>메모</strong>
          <span className={styles.spacer} />
          <div aria-label="메모 패널 배치" className={styles.segmented}>
            <button
              aria-pressed={effectivePlacement === "below"}
              onClick={() => setPlacement("below")}
              type="button"
            >
              <WorkspaceIcon name="panel-bottom" />
              아래
            </button>
            <button
              aria-pressed={effectivePlacement === "right"}
              onClick={() => setPlacement("right")}
              type="button"
            >
              <WorkspaceIcon name="panel-right" />
              오른쪽
            </button>
          </div>
        </header>

        <div aria-label="메모 범위" className={styles.scopeTabs} role="tablist">
          <button
            aria-controls={`${panelId}-work`}
            aria-selected={scope === "work"}
            id={`${panelId}-work-tab`}
            onClick={() => setScope("work")}
            onKeyDown={(event) => changeScopeFromKeyboard(event, "work")}
            ref={workTabRef}
            role="tab"
            tabIndex={scope === "work" ? 0 : -1}
            type="button"
          >
            작품 메모
          </button>
          <button
            aria-controls={`${panelId}-manuscript`}
            aria-selected={scope === "manuscript"}
            id={`${panelId}-manuscript-tab`}
            onClick={() => setScope("manuscript")}
            onKeyDown={(event) => changeScopeFromKeyboard(event, "manuscript")}
            ref={manuscriptTabRef}
            role="tab"
            tabIndex={scope === "manuscript" ? 0 : -1}
            type="button"
          >
            원고 메모
          </button>
          <span className={styles.spacer} />
          {scope === "work" && (
            <IconButton
              aria-label="작품 메모 추가"
              data-add-project-memo
              onClick={onAddProjectMemo}
            >
              <WorkspaceIcon name="plus" />
            </IconButton>
          )}
        </div>

        {scope === "work" ? (
          <section
            aria-labelledby={`${panelId}-work-tab`}
            className={styles.memoList}
            id={`${panelId}-work`}
            role="tabpanel"
          >
            {projectMemos.map((memo, index) => (
              <MemoCard
                body={memo.body}
                key={memo.id}
                label={`프로젝트 메모 ${index + 1}`}
                memoId={memo.id}
                onBlur={() => onProjectMemoBlur(memo)}
                onChange={(body) => onProjectMemoChange(memo, body)}
                onDeleteRequest={(returnFocus) =>
                  onDeleteRequest(memo, "project", returnFocus)
                }
                onRetry={() => onProjectMemoRetry(memo)}
                ref={memo.id === pendingMemoId ? pendingInputRef : undefined}
                saveStatus={
                  memo.saveStatus ?? (saveAvailable ? "saved" : "disconnected")
                }
                variant="project"
              />
            ))}
          </section>
        ) : (
          <section
            aria-labelledby={`${panelId}-manuscript-tab`}
            className={styles.manuscriptMemo}
            id={`${panelId}-manuscript`}
            role="tabpanel"
          >
            <header>
              <strong>원고 메모</strong>
              <span>{documentName}</span>
            </header>
            <MemoCard
              body={fileMemo?.body ?? ""}
              label={`${documentName} 원고 메모`}
              memoId={fileMemo?.id ?? `file-${documentId}-memo`}
              onChange={onFileMemoChange}
              onDeleteRequest={(returnFocus) =>
                onDeleteRequest(
                  fileMemo ?? {
                    body: "",
                    fileId: documentId,
                    fileName: documentName,
                    id: `file-${documentId}-memo`,
                  },
                  "file",
                  returnFocus,
                )
              }
              onRetry={onFileMemoRetry}
              saveStatus={
                fileMemo?.saveStatus ??
                (saveAvailable ? "saved" : "disconnected")
              }
              variant="editor"
            />
            <span className={styles.srOnly}>
              이 메모는 현재 파일 {documentName}에 연결되어 있습니다.
            </span>
          </section>
        )}

        {temporarilyBelow && (
          <p className={styles.srOnly}>
            AI 챗과 함께 표시하기 위해 메모 패널을 임시로 아래에 배치했습니다.
          </p>
        )}
        <p aria-live="polite" className={styles.srOnly} role="status">
          {announcement}
        </p>
      </aside>
    </div>
  );
}
