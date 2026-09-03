"use client";

import { useEffect, useRef } from "react";

import { Button, Menu, MenuItem } from "@/components/ui";
import {
  PropertyFileChip,
  type PropertyReference,
} from "@/features/property/components/property-document";
import {
  WorkspaceIcon,
  type WorkspaceIconName,
} from "@/features/workspace/icons";

import {
  isTimelineItemDraftValid,
  type TimelineItemDraft,
  type TimelineItemType,
  timelineTypeLabels,
} from "../timeline-model";
import styles from "./timeline-item-editor.module.css";

export type TimelineEditorStatus = "editing" | "error" | "saving" | "waiting";

const typeIcons: Record<TimelineItemType, WorkspaceIconName> = {
  date: "calendar-days",
  order: "list-ordered",
  unscheduled: "circle-help",
};

interface TimelineItemEditorProps {
  availableFiles: PropertyReference[];
  draft: TimelineItemDraft;
  isNew?: boolean;
  onCancel: () => void;
  onChange: (draft: TimelineItemDraft) => void;
  onComplete: () => void;
  onOpenReference?: (reference: PropertyReference) => void;
  onRetry: () => void;
  status: TimelineEditorStatus;
}

export function TimelineItemEditor({
  availableFiles,
  draft,
  isNew,
  onCancel,
  onChange,
  onComplete,
  onOpenReference,
  onRetry,
  status,
}: TimelineItemEditorProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const selectedReferenceIds = new Set(
    draft.references.map((reference) => reference.id),
  );
  const selectableFiles = availableFiles.filter(
    (file) => !selectedReferenceIds.has(file.id),
  );
  const valid = isTimelineItemDraftValid(draft);

  useEffect(() => {
    requestAnimationFrame(() => titleRef.current?.focus());
  }, []);

  const changeType = (type: TimelineItemType) => {
    onChange({
      ...draft,
      date: type === "date" ? draft.date : "",
      order: type === "order" ? draft.order : 1,
      time: type === "date" ? draft.time : "",
      type,
    });
  };

  return (
    <section
      aria-label={isNew ? "새 시간 항목" : `${draft.title} 편집`}
      className={styles.editor}
      data-editor-status={status}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    >
      <header className={styles.header}>
        <h3>{isNew ? "시간 항목 추가" : "시간 항목 편집"}</h3>
        <span>제목 필수</span>
      </header>

      <label className={styles.field}>
        <span>항목 제목</span>
        <input
          autoFocus
          onChange={(event) =>
            onChange({ ...draft, title: event.target.value })
          }
          placeholder="항목 제목"
          ref={titleRef}
          value={draft.title}
        />
      </label>

      <fieldset className={styles.typeField}>
        <legend>시간 유형</legend>
        <div className={styles.typeSegments}>
          {(["date", "order", "unscheduled"] as const).map((type) => (
            <button
              aria-pressed={draft.type === type}
              data-selected={draft.type === type || undefined}
              key={type}
              onClick={() => changeType(type)}
              type="button"
            >
              <WorkspaceIcon name={typeIcons[type]} />
              <span>{timelineTypeLabels[type]}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {draft.type === "date" && (
        <div className={styles.dateFields}>
          <label className={styles.field}>
            <span>날짜</span>
            <input
              aria-label="날짜"
              aria-describedby={
                !draft.date ? "timeline-date-required" : undefined
              }
              onChange={(event) =>
                onChange({ ...draft, date: event.target.value })
              }
              placeholder="YYYY-MM-DD"
              value={draft.date}
            />
            {!draft.date && (
              <span className={styles.srOnly} id="timeline-date-required">
                날짜·시간 유형에서는 날짜가 필수입니다.
              </span>
            )}
          </label>
          <label className={styles.field}>
            <span>시간</span>
            <input
              onChange={(event) =>
                onChange({ ...draft, time: event.target.value })
              }
              placeholder="HH:MM"
              value={draft.time}
            />
          </label>
        </div>
      )}

      {draft.type === "order" && (
        <p className={styles.orderHint}>
          현재 순서 그룹의 {draft.order}번째 항목입니다.
        </p>
      )}

      <label className={styles.field}>
        <span>짧은 설명</span>
        <input
          onChange={(event) =>
            onChange({ ...draft, description: event.target.value })
          }
          placeholder="짧은 설명"
          value={draft.description}
        />
      </label>

      <div className={styles.relatedFiles}>
        <span>관련 파일</span>
        <div className={styles.relatedList}>
          {draft.references.map((reference) => (
            <PropertyFileChip
              key={reference.id}
              onOpen={() => onOpenReference?.(reference)}
              onRemove={() =>
                onChange({
                  ...draft,
                  references: draft.references.filter(
                    (item) => item.id !== reference.id,
                  ),
                })
              }
              reference={reference}
            />
          ))}
          <Menu
            buttonContent={<WorkspaceIcon name="plus" />}
            buttonLabel="관련 파일 추가"
            triggerClassName={styles.addReference}
          >
            {selectableFiles.length > 0 ? (
              selectableFiles.map((file) => (
                <MenuItem
                  key={file.id}
                  onClick={() =>
                    onChange({
                      ...draft,
                      references: [...draft.references, file],
                    })
                  }
                >
                  {file.title}
                </MenuItem>
              ))
            ) : (
              <MenuItem disabled>추가할 파일이 없습니다</MenuItem>
            )}
          </Menu>
        </div>
      </div>

      <footer className={styles.actions}>
        {status === "error" && (
          <p aria-live="assertive" role="alert">
            <WorkspaceIcon name="triangle-alert" />
            <span>저장하지 못했습니다. 입력은 유지됩니다.</span>
          </p>
        )}
        {status === "waiting" && (
          <p aria-live="polite" role="status">
            <WorkspaceIcon name="cloud-off" />
            <span>변경됨 · 백엔드 연결 대기</span>
          </p>
        )}
        <span className={styles.actionSpacer} />
        {status === "error" && (
          <Button icon={<WorkspaceIcon name="rotate-cw" />} onClick={onRetry}>
            다시 시도
          </Button>
        )}
        <Button disabled={status === "saving"} onClick={onCancel}>
          취소
        </Button>
        <Button
          disabled={!valid}
          isProcessing={status === "saving"}
          onClick={onComplete}
          variant="primary"
        >
          완료
        </Button>
      </footer>
    </section>
  );
}
