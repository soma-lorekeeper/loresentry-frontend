"use client";

import { useState } from "react";

import {
  Button,
  DialogCard,
  EmptyState,
  Icon,
  InlineNotice,
  useToast,
  type IconName,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { TrashEntry } from "@/domain/models";
import {
  useDeleteFile,
  useFileTrash,
  useRestoreFile,
} from "@/features/workspace/queries";
import { ViewPage, ViewPanel } from "@/features/workspace/views/view-page";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { relativeTime } from "@/shared/format";

import styles from "./file-trash-view.module.css";

function entryIcon({ node }: TrashEntry): IconName {
  return node.kind === "document"
    ? DOCUMENT_TYPE_META[node.docType].entityIcon
    : "folder";
}

function entryKind({ node }: TrashEntry) {
  return node.kind === "document"
    ? DOCUMENT_TYPE_META[node.docType].label
    : "폴더";
}

function DeleteEntryDialog({
  entry,
  onClose,
}: {
  entry: TrashEntry | null;
  onClose: () => void;
}) {
  const { projectId } = useWorkspace();
  const toast = useToast();
  const remove = useDeleteFile(projectId);
  const busy = remove.isPending;
  const close = () => {
    if (busy) return;
    remove.reset();
    onClose();
  };
  const withChildren = entry && entry.childCount > 0;
  return (
    <DialogCard
      open={entry !== null}
      onClose={close}
      dismissible={!busy}
      icon="trash-2"
      title="이 항목을 영구 삭제할까요?"
      description={
        withChildren
          ? `안에 있는 ${entry.childCount}개 항목도 함께 완전히 삭제되고 복원할 수 없어요.`
          : "이 항목은 프로젝트에서 완전히 삭제되고 복원할 수 없어요."
      }
      target={
        entry ? { icon: entryIcon(entry), name: entry.node.title } : undefined
      }
      actions={
        <>
          <Button size="md" icon="x" onClick={close} disabled={busy}>
            취소
          </Button>
          <Button
            size="md"
            variant="primary"
            icon="trash-2"
            busy={busy}
            onClick={() =>
              entry &&
              remove.mutate(entry.node.id, {
                onSuccess: () => {
                  remove.reset();
                  onClose();
                  toast({
                    icon: "circle-check",
                    title: "영구 삭제했어요.",
                    description: `‘${entry.node.title}’을 휴지통에서 지웠어요.`,
                  });
                },
              })
            }
          >
            {busy ? "삭제 중…" : "영구 삭제"}
          </Button>
        </>
      }
    >
      {remove.isError && (
        <InlineNotice icon="circle-alert">
          영구 삭제하지 못했어요. 다시 시도해 주세요.
        </InlineNotice>
      )}
    </DialogCard>
  );
}

export function FileTrashView() {
  const { project, projectId, open } = useWorkspace();
  const toast = useToast();
  const trash = useFileTrash(projectId);
  const restore = useRestoreFile(projectId);
  const [failedId, setFailedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<TrashEntry | null>(null);

  const meta = trash.isPending
    ? "불러오는 중"
    : trash.isError
      ? "불러오지 못했어요"
      : `${trash.data.length}개 항목`;

  const restoreEntry = (entry: TrashEntry) => {
    setFailedId(null);
    restore.mutate(entry.node.id, {
      onSuccess: (node) =>
        toast({
          icon: "circle-check",
          title: "원래 위치로 복원했어요.",
          description:
            node.kind === "document"
              ? `‘${node.title}’을 다시 열 수 있어요.`
              : `‘${node.title}’ 폴더를 파일 목록에 되돌렸어요.`,
          action:
            node.kind === "document"
              ? {
                  label: "열기",
                  icon: "arrow-right",
                  onSelect: () => open({ kind: "file", fileId: node.id }),
                }
              : undefined,
        }),
      onError: () => setFailedId(entry.node.id),
    });
  };

  return (
    <ViewPage
      context={project.title}
      title="휴지통"
      description="현재 프로젝트에서 삭제한 파일과 폴더입니다."
      meta={meta}
    >
      {trash.isPending ? (
        <ViewPanel>
          <EmptyState
            role="status"
            icon="loader-circle"
            title="휴지통을 불러오는 중이에요"
          />
        </ViewPanel>
      ) : trash.isError ? (
        <ViewPanel>
          <EmptyState
            role="alert"
            icon="triangle-alert"
            title="휴지통을 불러오지 못했어요"
            description="연결을 확인한 뒤 다시 시도해 주세요."
            action={
              <Button
                size="md"
                icon="refresh-cw"
                onClick={() => trash.refetch()}
              >
                다시 시도
              </Button>
            }
          />
        </ViewPanel>
      ) : trash.data.length === 0 ? (
        <ViewPanel>
          <EmptyState
            icon="trash-2"
            title="휴지통이 비어 있습니다"
            description="삭제한 파일과 폴더는 여기에서 복원하거나 영구 삭제할 수 있습니다."
          />
        </ViewPanel>
      ) : (
        <ul className={styles.list} aria-label="삭제한 항목">
          {trash.data.map((entry) => {
            const restoring =
              restore.isPending && restore.variables === entry.node.id;
            return (
              <li key={entry.node.id}>
                <div className={styles.row}>
                  <span className={styles.icon}>
                    <Icon name={entryIcon(entry)} size={16} />
                  </span>
                  <span className={styles.copy}>
                    <span className={styles.title}>{entry.node.title}</span>
                    <span className={styles.meta}>
                      {entryKind(entry)} · 삭제 전 위치:{" "}
                      {entry.originalPath.join("/")}
                      {entry.node.trashedAt &&
                        ` · ${relativeTime(entry.node.trashedAt)}`}
                    </span>
                  </span>
                  <span className={styles.actions}>
                    <Button
                      size="lg"
                      icon="rotate-ccw"
                      busy={restoring}
                      disabled={restore.isPending}
                      onClick={() => restoreEntry(entry)}
                    >
                      {restoring ? "복원 중…" : "복원"}
                    </Button>
                    <Button
                      size="lg"
                      icon="trash-2"
                      disabled={restoring}
                      onClick={() => setDeleting(entry)}
                    >
                      영구 삭제
                    </Button>
                  </span>
                </div>
                {failedId === entry.node.id && (
                  <p className={styles.rowError} role="alert">
                    <Icon name="circle-alert" size={14} />
                    복원하지 못했어요. 다시 시도해 주세요.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <DeleteEntryDialog entry={deleting} onClose={() => setDeleting(null)} />
    </ViewPage>
  );
}
