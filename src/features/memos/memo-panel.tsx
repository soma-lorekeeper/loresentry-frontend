"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

import {
  EmptyState,
  Icon,
  IconButton,
  Segmented,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import type { Memo, MemoScope } from "@/domain/models";
import type { MemoDock } from "@/features/workspace/model/layout";
import { cx } from "@/shared/cx";

import { DeleteMemoDialog } from "./delete-memo-dialog";
import { MemoEditor } from "./memo-editor";
import { MemoMenuButton } from "./memo-menu-button";
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

function MemoList({
  projectId,
  scope,
  fileId,
  dock,
  emptyTitle,
  emptyDescription,
  label,
  placeholder,
  expanded,
  onExpand,
  onDelete,
}: {
  projectId: string;
  scope: MemoScope;
  fileId: string | null;
  dock: MemoDock;
  emptyTitle: string;
  emptyDescription: string;
  label: string;
  placeholder: string;
  expanded: string | null;
  onExpand: (id: string | null) => void;
  onDelete: (memo: Memo) => void;
}) {
  const memos = useMemos(projectId, scope, fileId);
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
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  return (
    <ul className={cx(styles.cards, dock === "below" && styles.cardsBelow)}>
      {memos.data.map((memo) => {
        const title = memo.title || memoHeadline(memo.body, 16) || "새 메모";
        return (
          <li key={memo.id} className={styles.card}>
            {expanded === memo.id ? (
              <MemoEditor
                projectId={projectId}
                scope={scope}
                fileId={fileId}
                memo={memo}
                variant="plain"
                autoFocus
                label={label}
                placeholder={placeholder}
              >
                <div className={styles.cardHead}>
                  <button
                    type="button"
                    className={styles.cardHeadButton}
                    aria-expanded
                    onClick={() => onExpand(null)}
                  >
                    <Icon name="notebook-pen" size={14} />
                    <span className={styles.cardTitle}>{title}</span>
                  </button>
                  <MemoMenuButton
                    label={`${title} 메모 메뉴`}
                    className={styles.cardMenu}
                    entries={[
                      {
                        id: "delete",
                        label: "삭제",
                        icon: "trash-2",
                        destructive: true,
                        onSelect: () => onDelete(memo),
                      },
                    ]}
                  />
                </div>
              </MemoEditor>
            ) : (
              <div className={styles.cardHead}>
                <button
                  type="button"
                  className={styles.cardButton}
                  aria-expanded={false}
                  onClick={() => onExpand(memo.id)}
                >
                  <span className={styles.cardHeadButton}>
                    <Icon name="notebook-pen" size={14} />
                    <span className={styles.cardTitle}>{title}</span>
                  </span>
                  <span className={styles.excerpt}>
                    {memo.body || "내용을 입력하세요."}
                  </span>
                </button>
                <MemoMenuButton
                  label={`${title} 메모 메뉴`}
                  className={styles.cardMenu}
                  entries={[
                    {
                      id: "delete",
                      label: "삭제",
                      icon: "trash-2",
                      destructive: true,
                      onSelect: () => onDelete(memo),
                    },
                  ]}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
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
  const [deleting, setDeleting] = useState<Memo | null>(null);
  const create = useCreateMemo(projectId);
  const typeLabel = DOCUMENT_TYPE_META[docType].label;
  const scope: MemoScope = tab === "project" ? "project" : "file";
  const scopeLabel = tab === "project" ? "작품 메모" : `${typeLabel} 메모`;

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
        <IconButton
          icon="plus"
          iconSize={16}
          label={`${scopeLabel} 추가`}
          className={styles.add}
          disabled={create.isPending}
          onClick={() =>
            create.mutate(
              {
                scope,
                fileId: scope === "file" ? fileId : null,
                body: "",
              },
              { onSuccess: (memo) => setExpanded(memo.id) },
            )
          }
        />
      </div>
      <div className={styles.content}>
        {tab === "file" && <p className={styles.fileHint}>{fileTitle}</p>}
        <MemoList
          key={tab === "file" ? fileId : "project"}
          projectId={projectId}
          scope={scope}
          fileId={scope === "file" ? fileId : null}
          dock={dock}
          label={scopeLabel}
          placeholder={
            scope === "file"
              ? `이 ${typeLabel}에 대한 메모를 작성하세요.`
              : "새 작품 메모를 작성하세요."
          }
          emptyTitle={`${scopeLabel}가 없습니다`}
          emptyDescription="+ 버튼으로 첫 메모를 추가하세요."
          expanded={expanded}
          onExpand={setExpanded}
          onDelete={setDeleting}
        />
      </div>
      <DeleteMemoDialog
        projectId={projectId}
        memo={deleting}
        onClose={() => setDeleting(null)}
      />
    </aside>
  );
}
