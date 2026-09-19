"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Icon, IconButton, Popover } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import { cx } from "@/shared/cx";

import type { RenderNode } from "./engine/render-graph";
import { NODE_KINDS, type NodeKind } from "./engine/types";
import styles from "./graph-view.module.css";

const SEARCH_LIMIT = 8;

export function kindColor(kind: NodeKind) {
  return `var(--lk-${DOCUMENT_TYPE_META[kind].nodeColor})`;
}

function SearchPanel({
  nodes,
  onPick,
}: {
  nodes: readonly RenderNode[];
  onPick: (node: RenderNode) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const needle = query.trim().toLocaleLowerCase();
  const results = useMemo(
    () =>
      needle
        ? nodes
            .filter((node) => node.name.toLocaleLowerCase().includes(needle))
            .sort(
              (a, b) =>
                Number(!a.name.toLocaleLowerCase().startsWith(needle)) -
                  Number(!b.name.toLocaleLowerCase().startsWith(needle)) ||
                b.degree - a.degree,
            )
            .slice(0, SEARCH_LIMIT)
        : [],
    [needle, nodes],
  );

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter" && results[active]) {
      event.preventDefault();
      onPick(results[active]);
    }
  };

  return (
    <div className={styles.searchPanel}>
      <div className={styles.searchField}>
        <Icon name="search" size={15} />
        <input
          autoFocus
          role="combobox"
          aria-expanded={results.length > 0}
          aria-controls="graph-search-results"
          aria-activedescendant={
            results[active] ? `graph-search-${results[active].id}` : undefined
          }
          aria-label="노드 이름으로 찾기"
          placeholder="노드 이름으로 찾기"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {needle && (
        <ul id="graph-search-results" role="listbox" className={styles.results}>
          {results.length === 0 ? (
            <li className={styles.noResult}>일치하는 노드가 없어요</li>
          ) : (
            results.map((node, index) => (
              <li
                key={node.id}
                id={`graph-search-${node.id}`}
                role="option"
                aria-selected={index === active}
                className={styles.result}
                onMouseEnter={() => setActive(index)}
                onClick={() => onPick(node)}
              >
                <Icon
                  name={DOCUMENT_TYPE_META[node.kind].entityIcon}
                  size={15}
                />
                <span className={styles.resultName}>{node.name}</span>
                <span className={styles.resultKind}>
                  {DOCUMENT_TYPE_META[node.kind].label}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

function FilterPanel({
  kinds,
  onChange,
}: {
  kinds: ReadonlySet<NodeKind>;
  onChange: (kinds: Set<NodeKind>) => void;
}) {
  const toggle = (kind: NodeKind) => {
    const next = new Set(kinds);
    if (next.has(kind)) next.delete(kind);
    else next.add(kind);
    onChange(next);
  };
  return (
    <div className={styles.filterPanel} role="group" aria-label="분류 필터">
      {NODE_KINDS.map((kind) => {
        const on = kinds.has(kind);
        return (
          <button
            key={kind}
            type="button"
            role="menuitemcheckbox"
            aria-checked={on}
            className={styles.filterItem}
            onClick={() => toggle(kind)}
          >
            <span className={styles.check}>
              {on && <Icon name="check" size={14} />}
            </span>
            <span
              className={styles.dot}
              style={{ background: kindColor(kind) }}
            />
            <Icon name={DOCUMENT_TYPE_META[kind].entityIcon} size={15} />
            {DOCUMENT_TYPE_META[kind].label}
          </button>
        );
      })}
      <hr className={styles.filterRule} />
      <button
        type="button"
        className={styles.filterAction}
        onClick={() => onChange(new Set(NODE_KINDS))}
      >
        모두 선택
      </button>
      <button
        type="button"
        className={styles.filterAction}
        onClick={() => onChange(new Set())}
      >
        선택 해제
      </button>
    </div>
  );
}

export function GraphTools({
  nodes,
  kinds,
  onKindsChange,
  onPick,
}: {
  nodes: readonly RenderNode[];
  kinds: ReadonlySet<NodeKind>;
  onKindsChange: (kinds: Set<NodeKind>) => void;
  onPick: (node: RenderNode) => void;
}) {
  const searchRef = useRef<HTMLButtonElement>(null);
  const filterRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState<"search" | "filter" | null>(null);
  const filtered = kinds.size < NODE_KINDS.length;
  return (
    <div className={styles.tools}>
      <IconButton
        ref={searchRef}
        icon="search"
        iconSize={15}
        label="노드 찾기"
        aria-expanded={open === "search"}
        className={styles.toolButton}
        onClick={() => setOpen(open === "search" ? null : "search")}
      />
      <IconButton
        ref={filterRef}
        icon="filter"
        iconSize={15}
        label="분류 필터"
        aria-expanded={open === "filter"}
        className={cx(styles.toolButton, filtered && styles.toolActive)}
        onClick={() => setOpen(open === "filter" ? null : "filter")}
      />
      {open === "search" && (
        <Popover
          anchorRef={filterRef}
          open
          onClose={() => {
            setOpen(null);
            searchRef.current?.focus();
          }}
          placement="bottom-end"
          className={styles.popover}
        >
          <SearchPanel
            nodes={nodes}
            onPick={(node) => {
              setOpen(null);
              onPick(node);
            }}
          />
        </Popover>
      )}
      {open === "filter" && (
        <Popover
          anchorRef={filterRef}
          open
          onClose={() => {
            setOpen(null);
            filterRef.current?.focus();
          }}
          placement="bottom-end"
          className={styles.popover}
        >
          <FilterPanel kinds={kinds} onChange={onKindsChange} />
        </Popover>
      )}
    </div>
  );
}

export function GraphLegend({
  kinds,
  hasFavorites,
}: {
  kinds: ReadonlySet<NodeKind>;
  hasFavorites: boolean;
}) {
  return (
    <ul className={styles.legend} aria-label="범례">
      {NODE_KINDS.map((kind) => (
        <li key={kind} className={cx(!kinds.has(kind) && styles.legendOff)}>
          <span
            className={styles.dot}
            style={{ background: kindColor(kind) }}
          />
          {DOCUMENT_TYPE_META[kind].label}
        </li>
      ))}
      {hasFavorites && (
        <li className={styles.legendFavorite}>
          <Icon name="star" size={13} />
          즐겨찾기
        </li>
      )}
    </ul>
  );
}
