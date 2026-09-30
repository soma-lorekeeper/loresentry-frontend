"use client";

import { useState, type ReactNode } from "react";

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  useToast,
} from "@/design-system/primitives";
import type { Memo, MemoScope } from "@/domain/models";
import { cx } from "@/shared/cx";

import { DeleteMemoDialog } from "./delete-memo-dialog";
import styles from "./memo-list.module.css";
import {
  memoHeadline,
  useCreateMemo,
  useMemos,
  useUpdateMemo,
} from "./queries";

/**
 * 메모 한 장.
 *
 * <p><b>수동 저장이다.</b> 전에는 입력이 멈추면 저장했다. 메모는 생각을 적다 지우는 곳이라
 * "쓰는 중"과 "남기기로 한 것"이 다르고, 자동 저장은 그 둘을 구분하지 않는다. 그래서 ✓ 로 남기고
 * ✕ 로 버린다. 버리면 고치기 전 내용이 그대로 남는다.
 *
 * <p>작품 메모와 문서 메모가 같은 카드를 쓴다. 전에는 작품 메모만 목록이고 문서 메모는 큰 입력창
 * 하나였는데, 같은 것을 두 모양으로 보여 줄 이유가 없다.
 */
function MemoCard({
  projectId,
  memo,
  startEditing,
  context,
  onDelete,
}: {
  projectId: string;
  memo: Memo;
  startEditing?: boolean;
  /** 카드 위에 붙일 맥락. 메모 화면의 파일 메모는 어느 문서의 것인지 보여야 한다. */
  context?: ReactNode;
  onDelete: (memo: Memo) => void;
}) {
  const toast = useToast();
  const update = useUpdateMemo(projectId);
  const [editing, setEditing] = useState(Boolean(startEditing));
  const [draft, setDraft] = useState(memo.body);

  const save = () => {
    if (draft === memo.body) {
      setEditing(false);
      return;
    }
    update.mutate(
      { memoId: memo.id, body: draft },
      {
        onSuccess: () => setEditing(false),
        onError: () =>
          toast({
            icon: "triangle-alert",
            title: "메모를 저장하지 못했어요.",
            description: "연결을 확인한 뒤 다시 시도해 주세요.",
          }),
      },
    );
  };

  const cancel = () => {
    setDraft(memo.body);
    setEditing(false);
  };

  if (!editing) {
    return (
      <li className={styles.card}>
        {context}
        <button
          type="button"
          className={styles.open}
          onClick={() => setEditing(true)}
        >
          <span className={styles.head}>
            <Icon name="notebook-pen" size={14} />
            <span className={styles.title}>
              {memoHeadline(memo.body, 20) || "빈 메모"}
            </span>
          </span>
          <span className={styles.excerpt}>
            {memo.body || "눌러서 내용을 적으세요."}
          </span>
        </button>
        <IconButton
          icon="trash-2"
          iconSize={14}
          label="메모 삭제"
          className={styles.delete}
          onClick={() => onDelete(memo)}
        />
      </li>
    );
  }

  return (
    <li className={cx(styles.card, styles.editingCard)}>
      {context}
      <textarea
        className={styles.textarea}
        value={draft}
        autoFocus
        aria-label="메모 내용"
        placeholder="메모를 적으세요."
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") cancel();
          if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) save();
        }}
      />
      <div className={styles.actions}>
        <IconButton
          icon="trash-2"
          iconSize={14}
          label="메모 삭제"
          onClick={() => onDelete(memo)}
        />
        <span className={styles.spacer} />
        <IconButton icon="x" iconSize={16} label="취소" onClick={cancel} />
        <IconButton
          icon="check"
          iconSize={16}
          label="저장"
          disabled={update.isPending}
          onClick={save}
        />
      </div>
    </li>
  );
}

/**
 * 한 범위의 메모 목록. 작품 메모와 문서 메모, 그리고 메모 전용 화면이 모두 이것을 쓴다.
 *
 * <p>`fileId` 가 있으면 그 문서의 메모이고, 없으면 그 범위 전체다 — 메모 화면의 "파일 메모" 는
 * 프로젝트의 모든 문서 메모를 한 목록으로 본다.
 */
export function MemoList({
  projectId,
  scope,
  fileId = null,
  compact,
  emptyTitle,
  emptyDescription,
  addLabel,
  canAdd = true,
  context,
}: {
  projectId: string;
  scope: MemoScope;
  fileId?: string | null;
  compact?: boolean;
  emptyTitle: string;
  emptyDescription?: string;
  addLabel: string;
  /** 문서를 고를 수 없는 화면에서는 새 메모를 여기서 만들 수 없다. */
  canAdd?: boolean;
  context?: (memo: Memo) => ReactNode;
}) {
  const memos = useMemos(projectId, scope, fileId);
  const create = useCreateMemo(projectId);
  const [fresh, setFresh] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Memo | null>(null);

  const add = () =>
    create.mutate(
      { scope, fileId, body: "" },
      { onSuccess: (memo) => setFresh(memo.id) },
    );

  if (memos.isPending) return <p className={styles.hint}>불러오는 중…</p>;
  if (memos.isError) {
    return (
      <EmptyState
        role="alert"
        icon="triangle-alert"
        title="메모를 불러오지 못했어요"
        description="연결을 확인한 뒤 다시 시도해 주세요."
        action={
          <Button size="md" icon="refresh-cw" onClick={() => memos.refetch()}>
            다시 시도
          </Button>
        }
      />
    );
  }

  return (
    <div className={cx(styles.list, compact && styles.compact)}>
      {canAdd && (
        <div className={styles.toolbar}>
          <Button
            size="sm"
            icon="plus"
            disabled={create.isPending}
            onClick={add}
          >
            {addLabel}
          </Button>
        </div>
      )}
      {memos.data.length === 0 ? (
        <EmptyState
          icon="notebook-pen"
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <ul className={styles.cards}>
          {memos.data.map((memo) => (
            <MemoCard
              key={memo.id}
              projectId={projectId}
              memo={memo}
              startEditing={memo.id === fresh}
              context={context?.(memo)}
              onDelete={setDeleting}
            />
          ))}
        </ul>
      )}
      <DeleteMemoDialog
        projectId={projectId}
        memo={deleting}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
