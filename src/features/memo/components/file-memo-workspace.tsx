"use client";

import {
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  useState,
} from "react";

import { IconButton } from "@/components/ui";
import { WorkspaceIcon } from "@/features/workspace/icons";

import styles from "./file-memo-workspace.module.css";

export type MemoPlacement = "below" | "right";
export type MemoScope = "manuscript" | "work";

interface FileMemoWorkspaceProps {
  aiChatOpen: boolean;
  children: ReactNode;
  documentName: string;
  onClose: () => void;
  open: boolean;
}

const workMemos = [
  {
    body: "북쪽 문은 서윤의 기억에 반응한다. 문 너머의 목소리는 3화에서 떠난 인물과 연결한다.",
    title: "북쪽 문과 균열",
  },
  {
    body: "등불이 꺼지는 순간을 장면 전환점으로 사용한다. 다른 원고에서도 같은 규칙을 유지한다.",
    title: "등불 규칙",
  },
];

const manuscriptMemo =
  "손잡이 진동 묘사는 한 번만 사용한다. ‘균열’이라는 단어는 마지막 문장까지 아껴 두기.";

export function FileMemoWorkspace({
  aiChatOpen,
  children,
  documentName,
  onClose,
  open,
}: FileMemoWorkspaceProps) {
  const [placement, setPlacement] = useState<MemoPlacement>("right");
  const [scope, setScope] = useState<MemoScope>("work");
  const [rightWidth, setRightWidth] = useState(360);
  const [belowHeight, setBelowHeight] = useState(300);
  const [announcement, setAnnouncement] = useState("");
  const temporarilyBelow = aiChatOpen && placement === "right";
  const effectivePlacement = temporarilyBelow ? "below" : placement;
  const currentSize = effectivePlacement === "right" ? rightWidth : belowHeight;
  const minimumSize = effectivePlacement === "right" ? 320 : 240;
  const maximumSize = effectivePlacement === "right" ? 560 : 480;
  const sizeLabel = effectivePlacement === "right" ? "너비" : "높이";
  const panelId = `file-memo-panel-${documentName.replaceAll(" ", "-")}`;
  const style = {
    "--memo-below-height": `${belowHeight}px`,
    "--memo-right-width": `${rightWidth}px`,
  } as CSSProperties;

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
            role="tab"
            type="button"
          >
            작품 메모
          </button>
          <button
            aria-controls={`${panelId}-manuscript`}
            aria-selected={scope === "manuscript"}
            id={`${panelId}-manuscript-tab`}
            onClick={() => setScope("manuscript")}
            role="tab"
            type="button"
          >
            원고 메모
          </button>
          <span className={styles.spacer} />
          {scope === "work" && (
            <IconButton aria-label="작품 메모 추가" disabled>
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
            {workMemos.map((memo) => (
              <article className={styles.previewCard} key={memo.title}>
                <header>
                  <WorkspaceIcon name="notebook-pen" />
                  <strong>{memo.title}</strong>
                  <span>작품 메모</span>
                </header>
                <p>{memo.body}</p>
              </article>
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
            <p>{manuscriptMemo}</p>
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
