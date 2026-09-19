"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

import {
  EmptyState,
  Icon,
  IconButton,
  Segmented,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import type { MemoDock } from "@/features/workspace/model/layout";
import { cx } from "@/shared/cx";

import { MemoEditor } from "./memo-editor";
import styles from "./memo-panel.module.css";
import { memoHeadline, useCreateMemo, useMemos } from "./queries";

export const MEMO_RIGHT_RANGE = { min: 280, max: 560 };
export const MEMO_BELOW_RANGE = { min: 180, max: 480 };
const KEY_STEP = 16;

const DOCK_OPTIONS = [
  { value: "below" as const, label: "아래", icon: "panel-bottom" as const },
  { value: "right" as const, label: "오른쪽", icon: "panel-right" as const },
];

type PanelTab = "project" | "file";

function clamp(value: number, range: { min: number; max: number }) {
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

function ResizeHandle({
  dock,
  size,
  onResize,
}: {
  dock: MemoDock;
  size: number;
  onResize: (size: number) => void;
}) {
  const range = dock === "right" ? MEMO_RIGHT_RANGE : MEMO_BELOW_RANGE;
  const [drag, setDrag] = useState<{ start: number; size: number } | null>(
    null,
  );
  const coord = (event: PointerEvent) =>
    dock === "right" ? event.clientX : event.clientY;
  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label="메모 패널 크기 조절"
      aria-orientation={dock === "right" ? "vertical" : "horizontal"}
      aria-valuemin={range.min}
      aria-valuemax={range.max}
      aria-valuenow={size}
      data-dragging={drag ? true : undefined}
      className={cx(styles.handle, dock === "below" && styles.handleBelow)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setDrag({ start: coord(event), size });
      }}
      onPointerMove={(event) => {
        if (!drag) return;
        onResize(clamp(drag.size + drag.start - coord(event), range));
      }}
      onPointerUp={() => setDrag(null)}
      onPointerCancel={() => setDrag(null)}
      onKeyDown={(event: KeyboardEvent) => {
        const grow =
          dock === "right"
            ? { ArrowLeft: 1, ArrowRight: -1 }
            : { ArrowUp: 1, ArrowDown: -1 };
        const delta = grow[event.key as keyof typeof grow];
        if (!delta) return;
        event.preventDefault();
        onResize(clamp(size + delta * KEY_STEP, range));
      }}
    />
  );
}

function ProjectMemoList({
  projectId,
  dock,
  expanded,
  onExpand,
}: {
  projectId: string;
  dock: MemoDock;
  expanded: string | null;
  onExpand: (id: string | null) => void;
}) {
  const memos = useMemos(projectId, "project");
  if (memos.isPending) return <p className={styles.hint}>불러오는 중…</p>;
  if (memos.isError)
    return (
      <EmptyState
        role="alert"
        icon="triangle-alert"
        title="메모를 불러오지 못했어요"
      />
    );
  if (memos.data.length === 0)
    return (
      <EmptyState
        icon="notebook-pen"
        title="작품 메모가 없습니다"
        description="+ 버튼으로 첫 메모를 추가하세요."
      />
    );
  return (
    <ul className={cx(styles.cards, dock === "below" && styles.cardsBelow)}>
      {memos.data.map((memo) => (
        <li key={memo.id} className={styles.card}>
          {expanded === memo.id ? (
            <MemoEditor
              projectId={projectId}
              scope="project"
              fileId={null}
              memo={memo}
              variant="plain"
              autoFocus
              label="작품 메모"
              placeholder="새 작품 메모를 작성하세요."
            >
              <button
                type="button"
                className={styles.cardHead}
                aria-expanded
                onClick={() => onExpand(null)}
              >
                <Icon name="notebook-pen" size={14} />
                <span className={styles.cardTitle}>
                  {memo.title || memoHeadline(memo.body, 16) || "새 메모"}
                </span>
                <span className={styles.tag}>작업 메모</span>
              </button>
            </MemoEditor>
          ) : (
            <button
              type="button"
              className={styles.cardButton}
              aria-expanded={false}
              onClick={() => onExpand(memo.id)}
            >
              <span className={styles.cardHead}>
                <Icon name="notebook-pen" size={14} />
                <span className={styles.cardTitle}>
                  {memo.title || memoHeadline(memo.body, 16) || "새 메모"}
                </span>
                <span className={styles.tag}>작업 메모</span>
              </span>
              <span className={styles.excerpt}>
                {memo.body || "내용을 입력하세요."}
              </span>
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function FileMemo({
  projectId,
  fileId,
  fileTitle,
  typeLabel,
}: {
  projectId: string;
  fileId: string;
  fileTitle: string;
  typeLabel: string;
}) {
  const memos = useMemos(projectId, "file", fileId);
  if (memos.isPending) return <p className={styles.hint}>불러오는 중…</p>;
  if (memos.isError)
    return (
      <EmptyState
        role="alert"
        icon="triangle-alert"
        title="메모를 불러오지 못했어요"
      />
    );
  return (
    <MemoEditor
      key={fileId}
      projectId={projectId}
      scope="file"
      fileId={fileId}
      memo={memos.data[0] ?? null}
      variant="plain"
      label={`${typeLabel} 메모`}
      placeholder={`이 ${typeLabel}에 대한 메모를 작성하세요.`}
      className={styles.fileMemo}
    >
      <div className={styles.fileHead}>
        <strong>{typeLabel} 메모</strong>
        <span>{fileTitle}</span>
      </div>
    </MemoEditor>
  );
}

export function MemoPanel({
  projectId,
  fileId,
  fileTitle,
  docType,
  dock,
  size,
  onResize,
  onDock,
  onClose,
}: {
  projectId: string;
  fileId: string;
  fileTitle: string;
  docType: DocumentType;
  dock: MemoDock;
  size: number;
  onResize: (size: number) => void;
  onDock: (dock: MemoDock) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PanelTab>("project");
  const [expanded, setExpanded] = useState<string | null>(null);
  const create = useCreateMemo(projectId);
  const typeLabel = DOCUMENT_TYPE_META[docType].label;

  return (
    <aside
      className={cx(styles.panel, dock === "below" && styles.below)}
      style={dock === "right" ? { width: size } : { height: size }}
      aria-label="메모"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <ResizeHandle dock={dock} size={size} onResize={onResize} />
      <header className={styles.header}>
        <IconButton
          icon="x"
          iconSize={15}
          label="메모 닫기"
          onClick={onClose}
        />
        <h2 className={styles.title}>메모</h2>
        <Segmented
          label="메모 위치"
          options={DOCK_OPTIONS}
          value={dock}
          onChange={onDock}
          className={styles.dock}
        />
      </header>
      <div className={styles.tabs}>
        <Segmented
          variant="pills"
          label="메모 종류"
          options={[
            { value: "project" as const, label: "작품 메모" },
            { value: "file" as const, label: `${typeLabel} 메모` },
          ]}
          value={tab}
          onChange={setTab}
        />
        {tab === "project" && (
          <IconButton
            icon="plus"
            iconSize={16}
            label="작품 메모 추가"
            className={styles.add}
            disabled={create.isPending}
            onClick={() =>
              create.mutate(
                { scope: "project", fileId: null, body: "" },
                { onSuccess: (memo) => setExpanded(memo.id) },
              )
            }
          />
        )}
      </div>
      <div className={styles.content}>
        {tab === "project" ? (
          <ProjectMemoList
            projectId={projectId}
            dock={dock}
            expanded={expanded}
            onExpand={setExpanded}
          />
        ) : (
          <FileMemo
            projectId={projectId}
            fileId={fileId}
            fileTitle={fileTitle}
            typeLabel={typeLabel}
          />
        )}
      </div>
    </aside>
  );
}
