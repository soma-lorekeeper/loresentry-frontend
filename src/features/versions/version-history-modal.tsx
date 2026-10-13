"use client";

import { useId, useState } from "react";

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  InlineNotice,
  Modal,
  Segmented,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type {
  DocumentContent,
  DocumentVersion,
  FileNode,
  VersionKind,
} from "@/domain/models";
import {
  DocumentDiff,
  type DiffSnapshot,
  type DiffTarget,
} from "@/features/graph-refresh/document-diff";
import { isDocument } from "@/features/workspace/model/tree";
import { INTL_LOCALE, LOCALE, t } from "@/i18n";
import { clockTime, versionTimeLabel } from "@/shared/format";
import { cx } from "@/shared/cx";

import { useVersionMutations, useVersions } from "./queries";
import styles from "./version-history-modal.module.css";

const KIND_LABEL: Record<VersionKind, string> = {
  AUTO: t("자동 저장"),
  NAMED: t("수동 저장"),
  PRE_RESTORE: t("복원 전 상태"),
  RESTORE: t("복원됨"),
  AI_APPLY: t("그래프 반영"),
};

const monthDay = new Intl.DateTimeFormat(INTL_LOCALE[LOCALE], {
  month: "short",
  day: "numeric",
});

function fullTime(iso: string) {
  return `${monthDay.format(new Date(iso))} ${clockTime(iso)}`;
}

function versionName(version: DocumentVersion) {
  if (version.kind === "PRE_RESTORE" && version.label !== null)
    return t("복원 전");
  return version.label ?? versionTimeLabel(version.createdAt);
}

function VersionRow({
  version,
  selected,
  onSelect,
}: {
  version: DocumentVersion;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <li className={cx(styles.version, selected && styles.selected)}>
      <button
        type="button"
        className={styles.versionButton}
        aria-current={selected || undefined}
        onClick={onSelect}
      >
        <span className={styles.versionTime}>{versionName(version)}</span>
        <span className={styles.versionKind}>{KIND_LABEL[version.kind]}</span>
      </button>
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
  current: DiffSnapshot;
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
  // 좁은 화면에서는 두 문서를 나란히 둘 폭이 없다. 한 번에 한쪽만 보이고, 이 값으로 고른다.
  const [shown, setShown] = useState<"left" | "right">("left");
  const [preparing, setPreparing] = useState(false);
  const list = versions.data ?? [];
  const selected =
    list.find((version) => version.id === selectedId) ?? list[0] ?? null;
  const busy =
    preparing || mutations.save.isPending || mutations.restore.isPending;

  /** 관계 칩에 그릴 문서. 그 뒤로 지워진 문서도 버전에는 남아 있어 이름만 대신 적는다 */
  const lookup = (id: string): DiffTarget => {
    const node = index.get(id);
    return isDocument(node)
      ? {
          title: node.title,
          icon: DOCUMENT_TYPE_META[node.docType].entityIcon,
          docType: node.docType,
        }
      : { title: node?.title ?? t("삭제된 파일"), icon: "file" };
  };

  const close = () => {
    if (busy) return;
    mutations.save.reset();
    mutations.restore.reset();
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
    ? t(
        "버전을 복원하지 못했어요. 문서가 잠겨 있거나 다른 곳에서 먼저 바뀌었을 수 있어요.",
      )
    : mutations.save.isError
      ? t("버전을 저장하지 못했어요. 다시 시도해 주세요.")
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
          label={t("버전 기록 닫기")}
          onClick={close}
          disabled={busy}
        />
      </header>
      <div className={styles.layout}>
        <nav className={styles.list} aria-label={t("버전 기록")}>
          <span className={styles.listLabel}>{t("버전 기록")}</span>
          <ul>
            {list.map((version) => (
              <VersionRow
                key={version.id}
                version={version}
                selected={version.id === selected?.id}
                onSelect={() => setSelectedId(version.id)}
              />
            ))}
          </ul>
        </nav>
        <div className={styles.main}>
          {versions.isPending ? (
            <EmptyState
              role="status"
              icon="loader-circle"
              title={t("버전 기록을 불러오는 중이에요")}
            />
          ) : versions.isError ? (
            <EmptyState
              role="alert"
              icon="triangle-alert"
              title={t("버전 기록을 불러오지 못했어요")}
              action={
                <Button
                  size="md"
                  icon="refresh-cw"
                  onClick={() => versions.refetch()}
                >
                  {t("다시 시도")}
                </Button>
              }
            />
          ) : !selected ? (
            <EmptyState
              icon="history"
              title={t("아직 저장된 버전이 없어요")}
              description={t(
                "지금 상태를 버전으로 남겨 두면, 나중에 언제든 이 문서를 그때로 되돌릴 수 있어요.",
              )}
            />
          ) : (
            <>
              {/* 좁은 화면에서만 보인다(CSS). 넓은 화면에서는 두 문서가 나란히 있다. */}
              <Segmented
                className={styles.switch}
                label={t("볼 문서")}
                value={shown}
                onChange={setShown}
                options={[
                  { value: "left", label: t("선택한 버전") },
                  { value: "right", label: t("현재 문서") },
                ]}
              />
              {/*
                두 문서 상자는 변경 사항 창의 것과 같다(같은 컴포넌트 계열, 같은 스타일). 여기서는
                읽기만 하므로 화살표가 없고, 달라진 곳의 띠와 낱말 표시는 그대로다.
              */}
              <DocumentDiff
                className={styles.diff}
                left={selected.snapshot}
                right={current}
                labels={{ left: t("선택한 버전"), right: t("현재 문서") }}
                notes={{ left: fullTime(selected.createdAt) }}
                only={shown}
                lookup={lookup}
              />
            </>
          )}
          {error && <InlineNotice icon="circle-alert">{error}</InlineNotice>}
          <footer className={styles.footer}>
            {locked ? (
              <span className={styles.lockedHint}>
                <Icon name="lock" size={14} />
                {t("잠긴 문서는 버전을 저장하거나 복원할 수 없어요.")}
              </span>
            ) : (
              unsaved && (
                <span className={styles.lockedHint}>
                  <Icon name="circle-alert" size={14} />
                  {t(
                    "저장하지 못한 편집이 있어요. 먼저 저장해야 복원할 수 있어요.",
                  )}
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
              {t("버전 저장")}
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
                {t("이 버전으로 복원")}
              </Button>
            )}
          </footer>
        </div>
      </div>
    </Modal>
  );
}
