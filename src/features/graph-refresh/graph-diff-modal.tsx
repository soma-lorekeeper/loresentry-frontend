"use client";

import { Fragment, useId, useMemo, useState } from "react";

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  InlineNotice,
  Modal,
  useToast,
  type IconName,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type {
  DocumentDraft,
  DocumentProperty,
  RefreshProposal,
  RefreshRun,
} from "@/domain/models";
import { indexNodes, isDocument } from "@/features/workspace/model/tree";
import { useFileTree } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { cx } from "@/shared/cx";

import styles from "./graph-diff-modal.module.css";
import {
  adoptDocument,
  bodyHunks,
  initMerge,
  isResolved,
  propertyRows,
  pushBodyHunk,
  pushDocument,
  pushProperty,
  remainingOf,
  resetDocument,
  resolvedDrafts,
  type Direction,
  type MergeState,
} from "./merge";
import { useRefreshActions } from "./queries";

const KIND_BADGE: Record<RefreshProposal["kind"], string> = {
  modified: "수정",
  added: "추가",
  removed: "삭제",
};

const KIND_MARK: Record<RefreshProposal["kind"], string> = {
  modified: "~",
  added: "+",
  removed: "−",
};

type Lookup = (id: string) => { title: string; icon: IconName } | null;

function Arrows({
  onPush,
  label,
}: {
  onPush: (direction: Direction) => void;
  label: string;
}) {
  return (
    <span className={styles.arrows}>
      <IconButton
        icon="chevrons-right"
        iconSize={14}
        label={`${label}: 현재 버전 값을 신규 버전에 넣기`}
        onClick={() => onPush(">>")}
      />
      <IconButton
        icon="chevrons-left"
        iconSize={14}
        label={`${label}: 신규 버전 값을 현재 버전에 넣기`}
        onClick={() => onPush("<<")}
      />
    </span>
  );
}

function PropertyValue({
  property,
  targetId,
  lookup,
}: {
  property: DocumentProperty | undefined;
  targetId?: string;
  lookup: Lookup;
}) {
  if (!property) return <span className={styles.missing}>—</span>;
  if (property.kind === "text") return <span>{property.value || "—"}</span>;
  if (!targetId) return <span className={styles.missing}>—</span>;
  const target = lookup(targetId);
  return (
    <span className={styles.chip}>
      <Icon name={target?.icon ?? "file"} size={14} />
      {target?.title ?? "새 문서"}
    </span>
  );
}

function DocumentCompare({
  proposal,
  state,
  lookup,
  onChange,
}: {
  proposal: RefreshProposal;
  state: MergeState;
  lookup: Lookup;
  onChange: (next: MergeState) => void;
}) {
  const id = proposal.fileId;
  const left = state.left.get(id);
  const right = state.right.get(id);
  const meta = DOCUMENT_TYPE_META[proposal.docType];
  const rows = propertyRows(left, right);
  const hunks = bodyHunks(left, right);

  const pane = (doc: DocumentDraft | undefined, side: "left" | "right") =>
    !doc ? (
      <p className={styles.absent}>
        {side === "left"
          ? "현재 버전에는 없는 문서예요."
          : "신규 버전에서 사라진 문서예요."}
      </p>
    ) : null;

  return (
    <div className={styles.compare}>
      <div className={cx(styles.cell, styles.left, styles.first)}>
        <strong>현재 버전</strong>
        <span className={styles.caption}>지금 쓰고 있는 문서예요</span>
      </div>
      <div className={styles.gutter}>
        {(!left || !right) && (
          <Arrows
            label="문서 전체"
            onPush={(direction) => onChange(pushDocument(state, id, direction))}
          />
        )}
      </div>
      <div className={cx(styles.cell, styles.right, styles.first)}>
        <strong>신규 버전</strong>
        <span className={styles.caption}>새로 추출한 결과예요</span>
      </div>

      {(!left || !right) && (
        <>
          <div className={cx(styles.cell, styles.left)}>
            {pane(left, "left")}
          </div>
          <div className={styles.gutter} />
          <div className={cx(styles.cell, styles.right)}>
            {pane(right, "right")}
          </div>
        </>
      )}

      <div className={cx(styles.cell, styles.left, styles.property)}>
        <span className={styles.label}>분류</span>
        {left && (
          <span className={styles.type}>
            <Icon name={meta.entityIcon} size={14} />
            {meta.label}
          </span>
        )}
      </div>
      <div className={styles.gutter} />
      <div className={cx(styles.cell, styles.right, styles.property)}>
        <span className={styles.label}>분류</span>
        {right && (
          <span className={styles.type}>
            <Icon name={meta.entityIcon} size={14} />
            {meta.label}
          </span>
        )}
      </div>

      {rows.map((row) => {
        const relation =
          row.left?.kind === "relation" || row.right?.kind === "relation";
        const leftIds = row.left?.kind === "relation" ? row.left.targetIds : [];
        const rightIds =
          row.right?.kind === "relation" ? row.right.targetIds : [];
        const targets = relation
          ? [...leftIds, ...rightIds.filter((t) => !leftIds.includes(t))]
          : [undefined];
        return targets.map((target, index) => {
          const changed = relation
            ? leftIds.includes(target!) !== rightIds.includes(target!)
            : !row.same;
          const showArrows = !row.same && (relation ? changed : true);
          const firstChanged =
            showArrows &&
            (!relation ||
              targets.findIndex(
                (t) => leftIds.includes(t!) !== rightIds.includes(t!),
              ) === index);
          return (
            <Fragment key={`${row.key}:${target ?? ""}`}>
              <div
                className={cx(
                  styles.cell,
                  styles.left,
                  styles.property,
                  changed && styles.changed,
                )}
              >
                <span className={styles.label}>
                  {index === 0 ? row.label : ""}
                </span>
                <PropertyValue
                  property={
                    relation && !leftIds.includes(target!)
                      ? undefined
                      : row.left
                  }
                  targetId={target}
                  lookup={lookup}
                />
              </div>
              <div className={styles.gutter}>
                {firstChanged && left && right && (
                  <Arrows
                    label={row.label}
                    onPush={(direction) =>
                      onChange(pushProperty(state, id, row.key, direction))
                    }
                  />
                )}
              </div>
              <div
                className={cx(
                  styles.cell,
                  styles.right,
                  styles.property,
                  changed && styles.changed,
                )}
              >
                <span className={styles.label}>
                  {index === 0 ? row.label : ""}
                </span>
                <PropertyValue
                  property={
                    relation && !rightIds.includes(target!)
                      ? undefined
                      : row.right
                  }
                  targetId={target}
                  lookup={lookup}
                />
              </div>
            </Fragment>
          );
        });
      })}

      <div className={cx(styles.cell, styles.left, styles.spacer)} />
      <div className={styles.gutter} />
      <div className={cx(styles.cell, styles.right, styles.spacer)} />
      {hunks.map((hunk, hunkIndex) => {
        const length = Math.max(hunk.leftLines.length, hunk.rightLines.length);
        return Array.from({ length }, (_, line) => (
          <Fragment key={`${hunkIndex}:${line}`}>
            <p
              className={cx(
                styles.cell,
                styles.left,
                styles.paragraph,
                !hunk.same && styles.changed,
              )}
            >
              {hunk.leftLines[line] ?? " "}
            </p>
            <div className={styles.gutter}>
              {!hunk.same && line === 0 && left && right && (
                <Arrows
                  label="본문"
                  onPush={(direction) =>
                    onChange(pushBodyHunk(state, id, hunk, direction))
                  }
                />
              )}
            </div>
            <p
              className={cx(
                styles.cell,
                styles.right,
                styles.paragraph,
                !hunk.same && styles.changed,
              )}
            >
              {hunk.rightLines[line] ?? " "}
            </p>
          </Fragment>
        ));
      })}
      <div className={cx(styles.cell, styles.left, styles.last)} />
      <div className={styles.gutter} />
      <div className={cx(styles.cell, styles.right, styles.last)} />
    </div>
  );
}

export function GraphDiffModal({
  run,
  open,
  onClose,
}: {
  run: RefreshRun;
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const toast = useToast();
  const { projectId } = useWorkspace();
  const actions = useRefreshActions(projectId);
  const tree = useFileTree(projectId);
  const index = useMemo(() => indexNodes(tree.data ?? []), [tree.data]);
  const proposals = run.proposals;
  const start = useMemo(
    () =>
      initMerge(
        proposals.map((p) => ({
          fileId: p.fileId,
          current: p.current,
          proposed: p.proposed,
        })),
      ),
    [proposals],
  );
  const [state, setState] = useState(start);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = proposals.find((p) => p.fileId === selectedId) ?? null;
  const resolvedCount = proposals.filter((p) =>
    isResolved(state, p.fileId),
  ).length;
  const allResolved = resolvedCount === proposals.length;
  const ids = proposals.map((p) => p.fileId);

  const lookup: Lookup = (id) => {
    const node = index.get(id);
    if (isDocument(node))
      return {
        title: node.title,
        icon: DOCUMENT_TYPE_META[node.docType].entityIcon,
      };
    const proposal = proposals.find((p) => p.fileId === id);
    return proposal
      ? {
          title: proposal.title,
          icon: DOCUMENT_TYPE_META[proposal.docType].entityIcon,
        }
      : null;
  };

  const adoptAll = (side: "left" | "right") =>
    setState(ids.reduce((acc, id) => adoptDocument(acc, id, side), state));

  const confirm = () =>
    actions.apply.mutate(
      { runId: run.id, resolved: resolvedDrafts(state, ids) },
      {
        onSuccess: () => {
          onClose();
          toast({
            icon: "circle-check",
            title: "변경 사항을 반영했어요.",
            description: "반영 전 상태는 각 문서의 버전 기록에 남아 있어요.",
          });
        },
      },
    );

  const remaining = selected ? remainingOf(state, selected.fileId) : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      className={styles.modal}
      dismissible={!actions.apply.isPending}
    >
      <header className={styles.header}>
        <h2 id={titleId} className={styles.title}>
          변경 사항 <span>문서 {proposals.length}개</span>
        </h2>
        <Button
          size="sm"
          variant={allResolved ? "primary" : "outline"}
          disabled={!allResolved}
          busy={actions.apply.isPending}
          onClick={confirm}
        >
          반영 확정
        </Button>
        <Button size="sm" onClick={() => adoptAll("left")}>
          현재 버전 전체 반영
        </Button>
        <Button size="sm" onClick={() => adoptAll("right")}>
          신규 버전 전체 반영
        </Button>
        <Button size="sm" onClick={() => setState(start)}>
          되돌리기
        </Button>
        <IconButton
          icon="x"
          iconSize={16}
          label="변경 사항 닫기"
          onClick={onClose}
        />
      </header>
      <div className={styles.layout}>
        <nav className={styles.list} aria-label="달라진 문서">
          <span className={styles.listLabel}>
            <strong>변경 {proposals.length - resolvedCount}</strong>
            <span>확정 {resolvedCount}</span>
          </span>
          <ul>
            {proposals.map((proposal) => {
              const done = isResolved(state, proposal.fileId);
              const meta = DOCUMENT_TYPE_META[proposal.docType];
              return (
                <li key={proposal.id}>
                  <button
                    type="button"
                    className={cx(
                      styles.item,
                      proposal.fileId === selectedId && styles.itemSelected,
                    )}
                    aria-current={proposal.fileId === selectedId || undefined}
                    onClick={() => setSelectedId(proposal.fileId)}
                  >
                    <Icon name={meta.entityIcon} size={14} />
                    <span className={styles.itemKind}>{meta.label}</span>
                    <span className={styles.itemTitle}>{proposal.title}</span>
                    {done ? (
                      <Icon name="check" size={15} label="확정" />
                    ) : (
                      <span
                        className={styles.mark}
                        aria-label={KIND_BADGE[proposal.kind]}
                      >
                        {KIND_MARK[proposal.kind]}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={styles.main}>
          {!selected ? (
            <EmptyState
              icon="git-compare-arrows"
              title={`달라진 문서가 ${proposals.length}개 있어요`}
              description={
                <>
                  <span>
                    왼쪽에서 문서를 하나 골라주세요. 지금 문서와 새로 추출한
                    결과를 나란히 보여드려요.
                  </span>
                  <span>
                    가운데 화살표로 필요한 부분만 골라 받을 수 있어요. 양쪽이
                    같아지면 반영이 끝나요.
                  </span>
                </>
              }
            />
          ) : (
            <>
              <div className={styles.docHeader}>
                <h3>{selected.title}</h3>
                <span className={styles.badge}>
                  {KIND_BADGE[selected.kind]}
                </span>
              </div>
              <div className={styles.status} role="status">
                <span>
                  {remaining === 0
                    ? "✓ 두 버전이 같아져서 반영이 끝났어요"
                    : `아직 다른 곳이 ${remaining}군데 있어요`}
                </span>
                <Button
                  size="sm"
                  onClick={() =>
                    setState(adoptDocument(state, selected.fileId, "left"))
                  }
                >
                  현재 버전 반영
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setState(adoptDocument(state, selected.fileId, "right"))
                  }
                >
                  신규 버전 반영
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    setState(resetDocument(state, selected.fileId, start))
                  }
                >
                  되돌리기
                </Button>
              </div>
              <DocumentCompare
                proposal={selected}
                state={state}
                lookup={lookup}
                onChange={setState}
              />
            </>
          )}
          {actions.apply.isError && (
            <InlineNotice icon="circle-alert">
              변경 사항을 반영하지 못했어요. 고른 내용은 그대로 남아 있어요.
            </InlineNotice>
          )}
        </div>
      </div>
    </Modal>
  );
}
