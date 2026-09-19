"use client";

import { useId, useState } from "react";

import {
  Button,
  DialogCard,
  EmptyState,
  Icon,
  IconButton,
  InlineNotice,
  Modal,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import type {
  DocumentContent,
  DocumentDraft,
  DocumentVersion,
  FileNode,
  VersionKind,
} from "@/domain/models";
import { isDocument } from "@/features/workspace/model/tree";
import { clockTime, versionTimeLabel } from "@/shared/format";
import { cx } from "@/shared/cx";

import { compareBodies, compareProperties, type CompareCell } from "./compare";
import { useVersionMutations, useVersions } from "./queries";
import styles from "./version-history-modal.module.css";

const KIND_LABEL: Record<VersionKind, string> = {
  AUTO: "자동 저장",
  NAMED: "수동 저장",
  PRE_RESTORE: "복원 전 상태",
  RESTORE: "복원됨",
  AI_APPLY: "그래프 반영",
};

function fullTime(iso: string) {
  const date = new Date(iso);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${clockTime(iso)}`;
}

type Snapshot = DocumentDraft & { docType: DocumentType };

function Cell({
  cell,
  index,
}: {
  cell: CompareCell;
  index: ReadonlyMap<string, FileNode>;
}) {
  if (cell.kind === "missing") return <span className={styles.missing}>—</span>;
  if (cell.kind === "text")
    return <span className={styles.text}>{cell.value || "—"}</span>;
  const node = index.get(cell.targetId);
  return (
    <span className={styles.chip}>
      <Icon
        name={
          isDocument(node)
            ? DOCUMENT_TYPE_META[node.docType].entityIcon
            : "file"
        }
        size={14}
      />
      {node?.title ?? "삭제된 파일"}
    </span>
  );
}

function ComparePane({
  title,
  subtitle,
  snapshot,
  other,
  side,
  index,
}: {
  title: string;
  subtitle: string;
  snapshot: Snapshot;
  other: Snapshot;
  side: "left" | "right";
  index: ReadonlyMap<string, FileNode>;
}) {
  const [left, right] = side === "left" ? [snapshot, other] : [other, snapshot];
  const properties = compareProperties(left.properties, right.properties);
  const body = compareBodies(left.bodyMd, right.bodyMd);
  const meta = DOCUMENT_TYPE_META[snapshot.docType];
  return (
    <section className={styles.pane} aria-label={title}>
      <header className={styles.paneHeader}>
        <h3>{title}</h3>
        <span>{subtitle}</span>
      </header>
      <dl className={styles.properties}>
        <div className={styles.property}>
          <dt>분류</dt>
          <dd>
            <span className={styles.type}>
              <Icon name={meta.entityIcon} size={14} />
              {meta.label}
            </span>
          </dd>
        </div>
        {properties.map((row) => (
          <div
            key={row.key}
            className={cx(styles.property, row.changed && styles.changed)}
          >
            <dt>{row.label}</dt>
            <dd>
              <Cell cell={row[side]} index={index} />
            </dd>
          </div>
        ))}
      </dl>
      <div className={styles.body}>
        {body.map((row, position) => {
          const text = row[side];
          return (
            <p
              key={position}
              className={cx(
                styles.paragraph,
                row.changed && styles.changed,
                text === null && styles.placeholder,
              )}
            >
              {text ?? " "}
            </p>
          );
        })}
      </div>
    </section>
  );
}

function VersionRow({
  version,
  selected,
  onSelect,
  onDelete,
}: {
  version: DocumentVersion;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <li className={cx(styles.version, selected && styles.selected)}>
      <button
        type="button"
        className={styles.versionButton}
        aria-current={selected || undefined}
        onClick={onSelect}
      >
        <span className={styles.versionTime}>
          {version.label ?? versionTimeLabel(version.createdAt)}
        </span>
        <span className={styles.versionKind}>{KIND_LABEL[version.kind]}</span>
      </button>
      <IconButton
        icon="trash-2"
        iconSize={15}
        label={`${versionTimeLabel(version.createdAt)} 버전 삭제`}
        className={styles.versionDelete}
        onClick={onDelete}
      />
    </li>
  );
}

export function VersionHistoryModal({
  open,
  fileId,
  title,
  current,
  locked,
  unsaved,
  index,
  onClose,
  beforeSave,
  currentRevision,
  onRestored,
}: {
  open: boolean;
  fileId: string;
  title: string;
  current: Snapshot;
  locked: boolean;
  /** 저장하지 못한 편집이 남아 있다(저장 오류·충돌). 복원하면 그 편집을 잃는다 */
  unsaved: boolean;
  index: ReadonlyMap<string, FileNode>;
  onClose: () => void;
  beforeSave: () => Promise<void>;
  currentRevision: () => number;
  onRestored: (content: DocumentContent) => void;
}) {
  const titleId = useId();
  const versions = useVersions(fileId, open);
  const mutations = useVersionMutations(fileId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<DocumentVersion | null>(null);
  const [preparing, setPreparing] = useState(false);
  const list = versions.data ?? [];
  const selected =
    list.find((version) => version.id === selectedId) ?? list[0] ?? null;
  const busy =
    preparing || mutations.save.isPending || mutations.restore.isPending;

  const close = () => {
    if (busy) return;
    mutations.save.reset();
    mutations.restore.reset();
    mutations.remove.reset();
    onClose();
  };

  const saveVersion = async () => {
    setPreparing(true);
    try {
      await beforeSave();
    } finally {
      setPreparing(false);
    }
    mutations.save.mutate(undefined, {
      onSuccess: (version) => setSelectedId(version.id),
    });
  };

  const restore = async () => {
    if (!selected || unsaved) return;
    setPreparing(true);
    try {
      await beforeSave();
    } finally {
      setPreparing(false);
    }
    mutations.restore.mutate(
      { versionId: selected.id, revision: currentRevision() },
      {
        onSuccess: (content) => {
          onRestored(content);
          close();
        },
      },
    );
  };

  const error = mutations.restore.isError
    ? "버전을 복원하지 못했어요. 문서가 잠겨 있거나 다른 곳에서 먼저 바뀌었을 수 있어요."
    : mutations.save.isError
      ? "버전을 저장하지 못했어요. 다시 시도해 주세요."
      : null;

  return (
    <Modal
      open={open}
      onClose={close}
      labelledBy={titleId}
      className={styles.modal}
      dismissible={!busy}
    >
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <IconButton
          icon="x"
          iconSize={16}
          label="버전 기록 닫기"
          onClick={close}
          disabled={busy}
        />
      </header>
      <div className={styles.layout}>
        <nav className={styles.list} aria-label="버전 기록">
          <span className={styles.listLabel}>버전 기록</span>
          <ul>
            {list.map((version) => (
              <VersionRow
                key={version.id}
                version={version}
                selected={version.id === selected?.id}
                onSelect={() => setSelectedId(version.id)}
                onDelete={() => setDeleting(version)}
              />
            ))}
          </ul>
        </nav>
        <div className={styles.main}>
          {versions.isPending ? (
            <EmptyState
              role="status"
              icon="loader-circle"
              title="버전 기록을 불러오는 중이에요"
            />
          ) : versions.isError ? (
            <EmptyState
              role="alert"
              icon="triangle-alert"
              title="버전 기록을 불러오지 못했어요"
              action={
                <Button
                  size="md"
                  icon="refresh-cw"
                  onClick={() => versions.refetch()}
                >
                  다시 시도
                </Button>
              }
            />
          ) : !selected ? (
            <EmptyState
              icon="history"
              title="아직 저장된 버전이 없어요"
              description="지금 상태를 버전으로 남겨 두면, 나중에 언제든 이 문서를 그때로 되돌릴 수 있어요."
            />
          ) : (
            <div className={styles.compare}>
              <ComparePane
                title="선택한 버전"
                subtitle={fullTime(selected.createdAt)}
                snapshot={selected.snapshot}
                other={current}
                side="left"
                index={index}
              />
              <ComparePane
                title="현재 문서"
                subtitle="지금"
                snapshot={current}
                other={selected.snapshot}
                side="right"
                index={index}
              />
            </div>
          )}
          {error && <InlineNotice icon="circle-alert">{error}</InlineNotice>}
          <footer className={styles.footer}>
            {locked ? (
              <span className={styles.lockedHint}>
                <Icon name="lock" size={14} />
                잠긴 문서는 버전을 저장하거나 복원할 수 없어요.
              </span>
            ) : (
              unsaved && (
                <span className={styles.lockedHint}>
                  <Icon name="circle-alert" size={14} />
                  저장하지 못한 편집이 있어요. 먼저 저장해야 복원할 수 있어요.
                </span>
              )
            )}
            <Button
              size="md"
              icon="plus"
              variant={selected ? "outline" : "primary"}
              busy={mutations.save.isPending}
              disabled={locked || busy}
              onClick={() => void saveVersion()}
            >
              버전 저장
            </Button>
            {selected && (
              <Button
                size="md"
                variant="primary"
                icon="rotate-ccw"
                busy={mutations.restore.isPending}
                disabled={locked || unsaved || busy}
                onClick={() => void restore()}
              >
                이 버전으로 복원
              </Button>
            )}
          </footer>
        </div>
      </div>
      <DialogCard
        open={deleting !== null}
        onClose={() => !mutations.remove.isPending && setDeleting(null)}
        icon="trash-2"
        title="이 버전을 삭제할까요?"
        description="삭제한 버전은 되돌릴 수 없어요. 현재 문서는 바뀌지 않습니다."
        target={
          deleting
            ? { icon: "history", name: fullTime(deleting.createdAt) }
            : undefined
        }
        actions={
          <>
            <Button
              size="md"
              icon="x"
              disabled={mutations.remove.isPending}
              onClick={() => setDeleting(null)}
            >
              취소
            </Button>
            <Button
              size="md"
              variant="primary"
              icon="trash-2"
              busy={mutations.remove.isPending}
              onClick={() =>
                deleting &&
                mutations.remove.mutate(deleting.id, {
                  onSuccess: () => {
                    if (selectedId === deleting.id) setSelectedId(null);
                    setDeleting(null);
                  },
                })
              }
            >
              버전 삭제
            </Button>
          </>
        }
      >
        {mutations.remove.isError && (
          <InlineNotice icon="circle-alert">
            버전을 삭제하지 못했어요. 다시 시도해 주세요.
          </InlineNotice>
        )}
      </DialogCard>
    </Modal>
  );
}
