"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import {
  Button,
  EmptyState,
  Tooltip,
  useToast,
  type MenuEntry,
} from "@/design-system/primitives";
import type { Memo, MemoScope } from "@/domain/models";
import { formatChord, isMac } from "@/features/workspace/shell/shortcuts";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import { DeleteMemoDialog } from "./delete-memo-dialog";
import { MemoMenuButton } from "./memo-menu-button";
import styles from "./memo-list.module.css";
import { memoTitle, useCreateMemo, useMemos, useUpdateMemo } from "./queries";

/**
 * 메모를 적는 칸. 있던 메모를 고칠 때와 새 메모를 쓸 때가 같은 모양이다.
 *
 * <p><b>수동 저장이다.</b> 메모는 생각을 적다 지우는 곳이라 "쓰는 중"과 "남기기로 한 것"이
 * 다르고, 자동 저장은 그 둘을 구분하지 않는다. 그래서 `저장` 으로 남기고 `취소` 로 버린다.
 *
 * <p><b>키.</b> Cmd/Ctrl+Enter 는 저장, Esc 는 취소다. Esc 는 여기서 끝낸다 — 메모 패널도 Esc 로
 * 닫히는데, 적던 것을 그만두려던 키에 패널까지 닫히면 안 된다.
 *
 * @param initial 처음 내용. 새 메모면 빈 글이다
 * @param menu 동작 줄 왼쪽에 둘 것(카드의 더보기 메뉴). 새 메모에는 없다
 * @param onSave 지금 적힌 내용을 남긴다
 */
function MemoEditor({
  initial,
  pending,
  menu,
  onSave,
  onCancel,
}: {
  initial: string;
  pending: boolean;
  menu?: ReactNode;
  onSave: (body: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(initial);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  // 새 메모는 적은 것이 있어야 남길 수 있다. 있던 메모는 비워서 남길 수도 있다.
  const savable = initial !== "" || draft.trim() !== "";

  // 적은 만큼 칸이 늘어난다. 손으로 끌어 늘리지 않아도 된다(넘치면 CSS 의 상한에서 안쪽이 밀린다).
  useLayoutEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
  }, [draft]);

  // 고치기 시작하면 이어 쓸 자리, 곧 글의 끝에 커서를 둔다.
  useLayoutEffect(() => {
    const area = areaRef.current;
    area?.setSelectionRange(area.value.length, area.value.length);
  }, []);

  return (
    <>
      <textarea
        ref={areaRef}
        className={styles.textarea}
        value={draft}
        rows={3}
        autoFocus
        aria-label={t("메모 내용")}
        placeholder={t("메모를 적으세요.")}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            // 패널이 이 키로 닫히지 않게 여기서 끝낸다(패널은 처리된 키를 건너뛴다).
            event.preventDefault();
            onCancel();
          } else if (
            event.key === "Enter" &&
            (event.metaKey || event.ctrlKey) &&
            savable &&
            // 저장 단추는 보내는 동안 눌리지 않는다. 키도 같아야 같은 메모가 두 번 생기지 않는다.
            !pending
          ) {
            event.preventDefault();
            onSave(draft);
          }
        }}
      />
      <div className={styles.actions}>
        {menu}
        <span className={styles.spacer} />
        <Button ref={cancelRef} variant="ghost" onClick={onCancel}>
          {t("취소")}
        </Button>
        <Tooltip anchorRef={cancelRef} label={t("취소")} shortcut="Esc" />
        <Button
          ref={saveRef}
          variant="primary"
          busy={pending}
          disabled={!savable}
          onClick={() => onSave(draft)}
        >
          {t("저장")}
        </Button>
        <Tooltip
          anchorRef={saveRef}
          label={t("저장")}
          shortcut={formatChord({ mod: true, code: "Enter" }, isMac())}
        />
      </div>
    </>
  );
}

/**
 * 메모 한 장. 누르면 그 자리에서 고치는 칸이 된다.
 *
 * <p>작품 메모와 문서 메모가 같은 카드를 쓴다. 전에는 작품 메모만 목록이고 문서 메모는 큰 입력창
 * 하나였는데, 같은 것을 두 모양으로 보여 줄 이유가 없다.
 */
function MemoCard({
  projectId,
  memo,
  context,
  extraEntries,
  onDelete,
}: {
  projectId: string;
  memo: Memo;
  /** 카드 위에 붙일 맥락. 메모 화면의 파일 메모는 어느 문서의 것인지 보여야 한다. */
  context?: ReactNode;
  /** 카드 메뉴에 더 붙일 항목. 메모 화면의 "파일로 이동" 이 여기로 온다. */
  extraEntries?: MenuEntry[];
  onDelete: (memo: Memo) => void;
}) {
  const toast = useToast();
  const update = useUpdateMemo(projectId);
  const [editing, setEditing] = useState(false);

  const save = (body: string) => {
    // 고친 것이 없으면 저장할 것도 없다. 그대로 닫는다.
    if (body === memo.body) {
      setEditing(false);
      return;
    }
    update.mutate(
      { memoId: memo.id, body },
      {
        onSuccess: () => setEditing(false),
        onError: () =>
          toast({
            icon: "triangle-alert",
            title: t("메모를 저장하지 못했어요."),
            description: t("작업공간::연결을 확인한 뒤 다시 시도해 주세요."),
          }),
      },
    );
  };

  // 디자인의 카드는 삭제를 더보기 메뉴에 둔다. 목록을 훑을 때 가장 먼저 보일 버튼이 아니다.
  const menuEntries: MenuEntry[] = [
    ...(extraEntries ?? []),
    ...(extraEntries?.length
      ? [{ type: "separator" as const, id: "sep" }]
      : []),
    {
      id: "delete",
      label: t("삭제"),
      icon: "trash-2" as const,
      destructive: true,
      onSelect: () => onDelete(memo),
    },
  ];
  const menu = <MemoMenuButton label={t("메모 메뉴")} entries={menuEntries} />;

  if (!editing) {
    const title = memoTitle(memo);
    return (
      <li className={styles.card}>
        {context}
        {menu}
        <button
          type="button"
          className={styles.open}
          onClick={() => setEditing(true)}
        >
          {title && <span className={styles.title}>{title}</span>}
          <span className={styles.excerpt}>
            {memo.body || t("눌러서 내용을 적으세요.")}
          </span>
        </button>
      </li>
    );
  }

  return (
    <li className={cx(styles.card, styles.editingCard)}>
      {context}
      <MemoEditor
        initial={memo.body}
        pending={update.isPending}
        menu={menu}
        onSave={save}
        onCancel={() => setEditing(false)}
      />
    </li>
  );
}

/**
 * 한 범위의 메모 목록. 작품 메모와 문서 메모, 그리고 메모 전용 화면이 모두 이것을 쓴다.
 *
 * <p>`fileId` 가 있으면 그 문서의 메모이고, 없으면 그 범위 전체다 — 메모 화면의 "파일 메모" 는
 * 프로젝트의 모든 문서 메모를 한 목록으로 본다.
 *
 * <p><b>새 메모는 남길 때 만든다.</b> 전에는 추가를 누르는 순간 빈 메모를 서버에 만들고 그것을
 * 고치게 했다. 그러면 적다 그만둔 빈 메모가 목록에 남는다. 지금은 목록 맨 위에 적는 칸만 열고,
 * `저장` 을 눌러야 메모가 생긴다.
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
  composing: composingProp,
  onComposingChange,
  context,
  entriesFor,
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
  /**
   * 새 메모를 적는 칸이 열려 있는가. 패널은 추가 단추를 탭 줄에 두므로 바깥에서 여닫는다.
   * 주지 않으면 목록이 제 추가 단추로 스스로 여닫는다.
   */
  composing?: boolean;
  onComposingChange?: (composing: boolean) => void;
  context?: (memo: Memo) => ReactNode;
  /** 카드 메뉴에 더할 항목을 메모마다 만든다. */
  entriesFor?: (memo: Memo) => MenuEntry[];
}) {
  const toast = useToast();
  const memos = useMemos(projectId, scope, fileId);
  const create = useCreateMemo(projectId);
  const [ownComposing, setOwnComposing] = useState(false);
  const [deleting, setDeleting] = useState<Memo | null>(null);
  const composing = composingProp ?? ownComposing;
  const setComposing = onComposingChange ?? setOwnComposing;

  const add = (body: string) =>
    create.mutate(
      { scope, fileId, body },
      {
        onSuccess: () => setComposing(false),
        onError: () =>
          toast({
            icon: "triangle-alert",
            title: t("메모를 저장하지 못했어요."),
            description: t("작업공간::연결을 확인한 뒤 다시 시도해 주세요."),
          }),
      },
    );

  if (memos.isPending)
    return <p className={styles.hint}>{t("불러오는 중…")}</p>;
  if (memos.isError) {
    return (
      <EmptyState
        role="alert"
        icon="triangle-alert"
        title={t("메모를 불러오지 못했어요")}
        description={t("작업공간::연결을 확인한 뒤 다시 시도해 주세요.")}
        action={
          <Button size="md" icon="refresh-cw" onClick={() => memos.refetch()}>
            {t("다시 시도")}
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
            disabled={composing}
            onClick={() => setComposing(true)}
          >
            {addLabel}
          </Button>
        </div>
      )}
      {memos.data.length === 0 && !composing ? (
        <EmptyState
          icon="notebook-pen"
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <ul className={styles.cards}>
          {composing && (
            <li
              className={cx(styles.card, styles.editingCard)}
              aria-label={t("새 메모")}
            >
              <MemoEditor
                initial=""
                pending={create.isPending}
                onSave={add}
                onCancel={() => setComposing(false)}
              />
            </li>
          )}
          {memos.data.map((memo) => (
            <MemoCard
              key={memo.id}
              projectId={projectId}
              memo={memo}
              context={context?.(memo)}
              extraEntries={entriesFor?.(memo)}
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
