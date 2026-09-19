"use client";

import { useMemo, useState } from "react";

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Segmented,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { Memo, MemoScope } from "@/domain/models";
import { indexNodes, isDocument } from "@/features/workspace/model/tree";
import { useFileTree } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";

import { DeleteMemoDialog } from "./delete-memo-dialog";
import { MemoEditor } from "./memo-editor";
import { MemoMenuButton } from "./memo-menu-button";
import styles from "./memo-view.module.css";
import { useCreateMemo, useMemos } from "./queries";

const SCOPES = [
  { value: "project" as const, label: "프로젝트 메모" },
  { value: "file" as const, label: "파일 메모" },
];

export function MemoView() {
  const { projectId, open } = useWorkspace();
  const [scope, setScope] = useState<MemoScope>("project");
  const [deleting, setDeleting] = useState<Memo | null>(null);
  const [fresh, setFresh] = useState<string | null>(null);
  const memos = useMemos(projectId, scope);
  const create = useCreateMemo(projectId);
  const tree = useFileTree(projectId);
  const index = useMemo(() => indexNodes(tree.data ?? []), [tree.data]);
  const [order, setOrder] = useState<string[]>([]);
  const ids = memos.data?.map((memo) => memo.id) ?? [];
  const unseen = ids.filter((id) => !order.includes(id));
  if (unseen.length > 0) setOrder([...unseen, ...order]);
  const ordered = order
    .map((id) => memos.data?.find((memo) => memo.id === id))
    .filter((memo): memo is Memo => Boolean(memo));

  const addMemo = () =>
    create.mutate(
      { scope: "project", fileId: null, body: "" },
      { onSuccess: (memo) => setFresh(memo.id) },
    );

  const empty =
    scope === "project"
      ? {
          title: "아직 프로젝트 메모가 없습니다",
          description: "새 메모를 추가해 작업 아이디어를 기록하세요.",
        }
      : {
          title: "아직 파일 메모가 없습니다",
          description: "파일을 열어 메모를 작성하면 여기에 표시됩니다.",
        };

  return (
    <div className={styles.view}>
      <header className={styles.header}>
        <h1 className={styles.title}>메모</h1>
        {scope === "project" && (
          <IconButton
            icon="plus"
            iconSize={16}
            label="프로젝트 메모 추가"
            className={styles.add}
            disabled={create.isPending}
            onClick={addMemo}
          />
        )}
        <Segmented
          label="메모 범위"
          options={SCOPES}
          value={scope}
          onChange={setScope}
          className={styles.scope}
        />
      </header>

      {memos.isPending ? (
        <div className={styles.panel}>
          <EmptyState
            role="status"
            icon="loader-circle"
            title="메모를 불러오는 중이에요"
          />
        </div>
      ) : memos.isError ? (
        <div className={styles.panel}>
          <EmptyState
            role="alert"
            icon="triangle-alert"
            title="메모를 불러오지 못했어요"
            description="연결을 확인한 뒤 다시 시도해 주세요."
            action={
              <Button
                size="md"
                icon="refresh-cw"
                onClick={() => memos.refetch()}
              >
                다시 시도
              </Button>
            }
          />
        </div>
      ) : memos.data.length === 0 ? (
        <div className={styles.panel}>
          <EmptyState
            icon="file-x"
            title={empty.title}
            description={empty.description}
            action={
              scope === "project" ? (
                <Button size="md" icon="plus" onClick={addMemo}>
                  메모 추가
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul
          className={styles.grid}
          aria-label={SCOPES.find((s) => s.value === scope)?.label}
        >
          {ordered.map((memo) => {
            const file = memo.fileId ? index.get(memo.fileId) : undefined;
            const fileTitle = file?.title ?? "찾을 수 없는 파일";
            const entries = [
              ...(file
                ? [
                    {
                      id: "open",
                      label: "파일로 이동",
                      icon: "external-link" as const,
                      onSelect: () => open({ kind: "file", fileId: file.id }),
                    },
                    { type: "separator" as const, id: "sep" },
                  ]
                : []),
              {
                id: "delete",
                label: "삭제",
                icon: "trash-2" as const,
                onSelect: () => setDeleting(memo),
              },
            ];
            return (
              <li key={memo.id} className={styles.item}>
                {scope === "file" && (
                  <div className={styles.fileHead}>
                    <Icon
                      name={
                        isDocument(file)
                          ? DOCUMENT_TYPE_META[file.docType].entityIcon
                          : "file"
                      }
                      size={15}
                    />
                    <span className={styles.fileTitle}>{fileTitle}</span>
                    <MemoMenuButton
                      label={`${fileTitle} 메모 메뉴`}
                      entries={entries}
                    />
                  </div>
                )}
                <MemoEditor
                  projectId={projectId}
                  scope={memo.scope}
                  fileId={memo.fileId}
                  memo={memo}
                  autoFocus={memo.id === fresh}
                  label={
                    scope === "file" ? `${fileTitle} 메모` : "프로젝트 메모"
                  }
                  placeholder={
                    scope === "file"
                      ? "이 파일에 대한 메모를 작성하세요."
                      : "새 프로젝트 메모를 작성하세요."
                  }
                >
                  {scope === "project" && (
                    <MemoMenuButton
                      label="메모 메뉴"
                      entries={entries}
                      className={styles.cardMenu}
                    />
                  )}
                </MemoEditor>
              </li>
            );
          })}
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
