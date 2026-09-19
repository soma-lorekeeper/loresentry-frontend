"use client";

import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Popover,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import { kindColor } from "@/features/graph/graph-tools";
import { useProjectGraph } from "@/features/graph/queries";
import { useFavorites } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { cx } from "@/shared/cx";

import { getTimeline } from "./timeline-data";
import {
  FAVORITES_GROUP,
  stepColumn,
  type TimelineRow,
  type TimelineTable,
} from "./timeline-rows";
import styles from "./timeline-view.module.css";

const LABEL_WIDTH = 190;
const NO_EPISODE = "__none__";
const MIN_COLUMN_WIDTH = 52;

function pct(index: number, total: number) {
  return `${(index / total) * 100}%`;
}

function Track({ row, total }: { row: TimelineRow; total: number }) {
  return (
    <div className={styles.track} aria-hidden="true">
      <span
        className={styles.span}
        style={{
          left: pct(row.first + 0.15, total),
          width: pct(row.last - row.first + 0.7, total),
        }}
      />
      {row.runs.map((run) => (
        <span
          key={run.from}
          className={styles.bar}
          style={{
            left: pct(run.from + 0.15, total),
            width: pct(run.to - run.from + 0.7, total),
            background: kindColor(row.kind),
          }}
        />
      ))}
    </div>
  );
}

function EpisodeMenu({
  episodes,
  selected,
  onChange,
}: {
  episodes: { id: string; title: string }[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const all = selected.length === 0;
  const label = all
    ? "전체"
    : selected[0] === NO_EPISODE
      ? "없음"
      : selected.length === 1
        ? (episodes.find((e) => e.id === selected[0])?.title ?? "전체")
        : `${selected.length}개 선택`;
  const isOn = (id: string) => all || selected.includes(id);
  const toggle = (id: string) => {
    const current = all
      ? episodes.map((e) => e.id)
      : selected.filter((value) => value !== NO_EPISODE);
    const next = current.includes(id)
      ? current.filter((value) => value !== id)
      : [...current, id];
    onChange(
      next.length === episodes.length
        ? []
        : next.length === 0
          ? [NO_EPISODE]
          : next,
    );
  };
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={styles.episode}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.muted}>에피소드</span>
        <strong>{label}</strong>
        <Icon name="chevron-down" size={14} />
      </button>
      {open && (
        <Popover
          anchorRef={ref}
          open
          onClose={() => {
            setOpen(false);
            ref.current?.focus();
          }}
          placement="bottom-start"
          className={styles.popover}
        >
          <div
            role="group"
            aria-label="에피소드 선택"
            className={styles.checklist}
          >
            {episodes.map((episode) => (
              <button
                key={episode.id}
                type="button"
                role="menuitemcheckbox"
                aria-checked={isOn(episode.id)}
                className={styles.checkItem}
                onClick={() => toggle(episode.id)}
              >
                <span className={styles.check}>
                  {isOn(episode.id) && <Icon name="check" size={14} />}
                </span>
                {episode.title}
              </button>
            ))}
            <hr className={styles.rule} />
            <button
              type="button"
              className={styles.action}
              onClick={() => onChange([])}
            >
              모두 선택
            </button>
            <button
              type="button"
              className={styles.action}
              onClick={() => onChange([NO_EPISODE])}
            >
              선택 해제
            </button>
          </div>
        </Popover>
      )}
    </>
  );
}

function RowFilter({
  table,
  hidden,
  onChange,
}: {
  table: TimelineTable;
  hidden: ReadonlySet<string>;
  onChange: (hidden: Set<string>) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rows = table.groups.flatMap((group) => group.rows);
  const needle = query.trim().toLocaleLowerCase();
  const matches = rows.filter((row) =>
    row.name.toLocaleLowerCase().includes(needle),
  );
  const toggle = (id: string) => {
    const next = new Set(hidden);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };
  return (
    <>
      <IconButton
        ref={ref}
        icon="list-filter"
        iconSize={16}
        label="표시할 항목"
        aria-expanded={open}
        className={cx(
          styles.filterButton,
          hidden.size > 0 && styles.filterActive,
        )}
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <Popover
          anchorRef={ref}
          open
          onClose={() => {
            setOpen(false);
            ref.current?.focus();
          }}
          placement="bottom-end"
          className={cx(styles.popover, styles.rowPopover)}
        >
          <div className={styles.searchField}>
            <Icon name="search" size={15} />
            <input
              autoFocus
              aria-label="이름으로 찾기"
              placeholder="이름으로 찾기"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div role="group" aria-label="표시할 항목" className={styles.rowList}>
            {matches.map((row) => (
              <button
                key={row.nodeId}
                type="button"
                role="menuitemcheckbox"
                aria-checked={!hidden.has(row.nodeId)}
                className={styles.checkItem}
                onClick={() => toggle(row.nodeId)}
              >
                <span className={styles.check}>
                  {!hidden.has(row.nodeId) && <Icon name="check" size={14} />}
                </span>
                <span
                  className={styles.dot}
                  style={{ background: kindColor(row.kind) }}
                />
                <Icon
                  name={DOCUMENT_TYPE_META[row.kind].entityIcon}
                  size={15}
                />
                <span className={styles.checkName}>{row.name}</span>
                <span className={styles.muted}>
                  {DOCUMENT_TYPE_META[row.kind].label}
                </span>
              </button>
            ))}
            {matches.length === 0 && (
              <p className={styles.noMatch}>일치하는 항목이 없어요</p>
            )}
          </div>
          <hr className={styles.rule} />
          <button
            type="button"
            className={styles.action}
            onClick={() => onChange(new Set())}
          >
            모두 선택
          </button>
          <button
            type="button"
            className={styles.action}
            onClick={() => onChange(new Set(rows.map((row) => row.nodeId)))}
          >
            선택 해제
          </button>
        </Popover>
      )}
    </>
  );
}

export function TimelineView() {
  const { projectId, open } = useWorkspace();
  const graph = useProjectGraph(projectId);
  const favorites = useFavorites(projectId);
  const [episodeIds, setEpisodeIds] = useState<string[]>([]);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [selected, setSelected] = useState(0);
  const favoriteSet = useMemo(
    () => new Set(favorites.data ?? []),
    [favorites.data],
  );

  const table = useMemo(
    () =>
      graph.data
        ? getTimeline(
            graph.data,
            episodeIds.length > 0 ? episodeIds : null,
            favoriteSet,
          )
        : null,
    [graph.data, episodeIds, favoriteSet],
  );

  if (graph.isPending) return <div className={styles.view} aria-busy="true" />;
  if (graph.isError || !graph.data || !table)
    return (
      <EmptyState
        role="alert"
        icon="triangle-alert"
        title="타임라인을 불러오지 못했어요"
        action={
          <Button size="md" icon="refresh-cw" onClick={() => graph.refetch()}>
            다시 시도
          </Button>
        }
      />
    );

  const total = table.columns.length;
  const current = Math.min(selected, Math.max(total - 1, 0));
  const column = table.columns[current];
  const move = (dx: number, dy: number) =>
    setSelected(stepColumn(table, current, dx, dy));

  const onKeyDown = (event: KeyboardEvent) => {
    const keys: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const step = keys[event.key];
    if (step) {
      event.preventDefault();
      move(...step);
    } else if (event.key === "Enter" && column) {
      open({ kind: "file", fileId: column.chapterId });
    }
  };

  const gridStyle = {
    "--label-width": `${LABEL_WIDTH}px`,
    "--columns": total,
    "--min-track": `${Math.max(total, 1) * MIN_COLUMN_WIDTH}px`,
    "--selected-left": pct(current, Math.max(total, 1)),
    "--selected-width": pct(1, Math.max(total, 1)),
  } as CSSProperties;

  return (
    <div className={styles.view}>
      <div className={styles.toolbar} role="toolbar" aria-label="타임라인 도구">
        <EpisodeMenu
          episodes={graph.data.episodes.map((e) => ({
            id: e.id,
            title: e.title,
          }))}
          selected={episodeIds}
          onChange={(ids) => {
            setEpisodeIds(ids);
            setSelected(0);
          }}
        />
        {total > 0 && (
          <div className={styles.stepper}>
            <IconButton
              icon="chevron-left"
              iconSize={14}
              label="이전 회차"
              disabled={current === 0}
              onClick={() => move(-1, 0)}
            />
            <span aria-live="polite">{column?.name}</span>
            <IconButton
              icon="chevron-right"
              iconSize={14}
              label="다음 회차"
              disabled={current === total - 1}
              onClick={() => move(1, 0)}
            />
          </div>
        )}
        <span className={styles.spacer} />
        <RowFilter table={table} hidden={hidden} onChange={setHidden} />
      </div>

      {total === 0 ? (
        <EmptyState
          icon="chart-no-axes-gantt"
          title="표시할 회차가 없어요"
          description="에피소드를 고르거나 원고를 추가하면 회차가 열이 됩니다."
        />
      ) : (
        <div
          className={styles.scroller}
          tabIndex={0}
          role="grid"
          aria-label="타임라인"
          aria-rowcount={table.rowCount}
          onKeyDown={onKeyDown}
          style={gridStyle}
        >
          <div className={styles.head} role="row">
            <div className={styles.corner} />
            <div className={styles.headTrack}>
              <div className={styles.episodes}>
                {table.episodes.map((episode) => (
                  <span
                    key={`${episode.episodeId}-${episode.from}`}
                    className={styles.episodeBand}
                    style={{
                      left: pct(episode.from, total),
                      width: pct(episode.to - episode.from + 1, total),
                    }}
                    title={episode.name}
                  >
                    {episode.name}
                  </span>
                ))}
              </div>
              <div className={styles.chapters}>
                {table.columns.map((chapter, index) => (
                  <button
                    key={chapter.chapterId}
                    type="button"
                    role="columnheader"
                    aria-selected={index === current}
                    className={styles.chapter}
                    title={chapter.title}
                    onClick={() => setSelected(index)}
                    onDoubleClick={() =>
                      open({ kind: "file", fileId: chapter.chapterId })
                    }
                  >
                    <Icon name="file-text" size={14} />
                    {chapter.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className={styles.body}>
            {table.episodes.slice(1).map((episode) => (
              <div
                key={`line-${episode.from}`}
                className={styles.episodeLine}
                aria-hidden="true"
                style={{
                  left: `calc(var(--label-width) + (100% - var(--label-width)) * ${episode.from / total})`,
                }}
              />
            ))}
            {table.groups.map((group) => {
              const rows = group.rows.filter((row) => !hidden.has(row.nodeId));
              if (rows.length === 0) return null;
              const isCollapsed = collapsed.has(group.id);
              return (
                <div key={group.id} role="rowgroup">
                  <button
                    type="button"
                    className={styles.group}
                    aria-expanded={!isCollapsed}
                    onClick={() =>
                      setCollapsed((current) => {
                        const next = new Set(current);
                        if (next.has(group.id)) next.delete(group.id);
                        else next.add(group.id);
                        return next;
                      })
                    }
                  >
                    <Icon
                      name={isCollapsed ? "folder" : "folder-open"}
                      size={15}
                    />
                    {group.id === FAVORITES_GROUP ? "즐겨찾기" : group.label}
                  </button>
                  {!isCollapsed &&
                    rows.map((row) => (
                      <div
                        key={`${group.id}-${row.nodeId}`}
                        role="row"
                        className={styles.row}
                        title={`${row.name} · ${row.columns.length}회 등장`}
                      >
                        <button
                          type="button"
                          role="rowheader"
                          className={styles.rowLabel}
                          onClick={() =>
                            open({ kind: "file", fileId: row.nodeId })
                          }
                        >
                          <Icon
                            name={DOCUMENT_TYPE_META[row.kind].entityIcon}
                            size={15}
                          />
                          <span>{row.name}</span>
                        </button>
                        <Track row={row} total={total} />
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
