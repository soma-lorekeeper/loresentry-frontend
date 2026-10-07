"use client";

import { useState, type KeyboardEvent, type PointerEvent } from "react";

import { IconButton, Segmented } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import type { MemoDock } from "@/features/workspace/model/layout";
import { cx } from "@/shared/cx";

import { MemoList } from "./memo-list";
import styles from "./memo-panel.module.css";
import { useCreateMemo } from "./queries";

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
  // 이 패널은 문서를 열어 둔 채 쓴다. 지금 쓰는 문서의 메모가 먼저 보여야 한다.
  const [tab, setTab] = useState<PanelTab>("file");
  // 추가 버튼은 디자인처럼 탭 줄에 있다. 그래서 만들기는 패널이 하고 목록은 결과만 받는다.
  const create = useCreateMemo(projectId);
  const [fresh, setFresh] = useState<string | null>(null);
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
            { value: "file" as const, label: `${typeLabel} 메모` },
            { value: "project" as const, label: "작품 메모" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <IconButton
          icon="plus"
          iconSize={16}
          label={tab === "file" ? `${typeLabel} 메모 추가` : "작품 메모 추가"}
          className={styles.add}
          disabled={create.isPending}
          onClick={() =>
            create.mutate(
              {
                scope: tab,
                fileId: tab === "file" ? fileId : null,
                body: "",
              },
              { onSuccess: (memo) => setFresh(memo.id) },
            )
          }
        />
      </div>
      <div className={styles.content}>
        {tab === "file" ? (
          <MemoList
            key={fileId}
            projectId={projectId}
            scope="file"
            fileId={fileId}
            compact={dock === "below"}
            canAdd={false}
            freshId={fresh}
            addLabel="메모 추가"
            emptyTitle={`${fileTitle}에 적은 메모가 없어요`}
            emptyDescription={`이 ${typeLabel}에 대해 기억할 것을 적어 두세요.`}
          />
        ) : (
          <MemoList
            projectId={projectId}
            scope="project"
            compact={dock === "below"}
            canAdd={false}
            freshId={fresh}
            addLabel="메모 추가"
            emptyTitle="작품 메모가 없어요"
            emptyDescription="작품 전체에 걸친 생각을 적어 두세요."
          />
        )}
      </div>
    </aside>
  );
}
