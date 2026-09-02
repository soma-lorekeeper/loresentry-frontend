"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
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
  onFileMemoChange: (body: string) => void;
  onProjectMemoBlur: (memo: ProjectMemo) => void;
  onProjectMemoChange: (memo: ProjectMemo, body: string) => void;
  open: boolean;
  pendingMemoId?: string;
  projectMemos: ProjectMemo[];
}

export function FileMemoWorkspace({
  aiChatOpen,
  children,
  documentId,
  documentName,
  fileMemo,
  onAddProjectMemo,
  onClose,
  onFileMemoChange,
  onProjectMemoBlur,
  onProjectMemoChange,
  open,
  pendingMemoId,
  projectMemos,
}: FileMemoWorkspaceProps) {
  const [placement, setPlacement] = useState<MemoPlacement>("right");
  const [scope, setScope] = useState<MemoScope>("work");
  const [rightWidth, setRightWidth] = useState(360);
  const [belowHeight, setBelowHeight] = useState(300);
  const [announcement, setAnnouncement] = useState("");
  const workTabRef = useRef<HTMLButtonElement>(null);
  const manuscriptTabRef = useRef<HTMLButtonElement>(null);
  const pendingInputRef = useRef<HTMLTextAreaElement>(null);
  const temporarilyBelow = aiChatOpen && placement === "right";
  const effectivePlacement = temporarilyBelow ? "below" : placement;
  const currentSize = effectivePlacement === "right" ? rightWidth : belowHeight;
  const minimumSize = effectivePlacement === "right" ? 320 : 240;
  const maximumSize = effectivePlacement === "right" ? 560 : 480;
  const sizeLabel = effectivePlacement === "right" ? "너비" : "높이";
  const panelId = `file-memo-panel-${documentId}`;
  const style = {
    "--memo-below-height": `${belowHeight}px`,
    "--memo-right-width": `${rightWidth}px`,
  } as CSSProperties;

  useEffect(() => {
    if (!pendingMemoId || !open || scope !== "work") return;
    requestAnimationFrame(() => pendingInputRef.current?.focus());
  }, [open, pendingMemoId, scope]);

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
            <IconButton aria-label="작품 메모 추가" onClick={onAddProjectMemo}>
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
                onBlur={() => onProjectMemoBlur(memo)}
                onChange={(body) => onProjectMemoChange(memo, body)}
                ref={memo.id === pendingMemoId ? pendingInputRef : undefined}
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
              onChange={onFileMemoChange}
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
