"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import {
  Button,
  EmptyState,
  Icon,
  SearchField,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { SearchHit } from "@/domain/models";
import type { WorkspaceViewProps } from "@/features/workspace/views/view-types";
import { ViewPage, ViewPanel } from "@/features/workspace/views/view-page";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";

import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_LIMIT,
  displaySnippet,
  searchTermOf,
  useProjectSearch,
} from "./queries";
import styles from "./search-view.module.css";

interface Shown {
  term: string;
  hits: SearchHit[];
}

function highlight(text: string, term: string): ReactNode {
  const at = text.toLocaleLowerCase().indexOf(term.toLocaleLowerCase());
  if (!term || at < 0) return text;
  const end = at + term.length;
  return (
    <>
      {text.slice(0, at)}
      <mark className={styles.match}>{text.slice(at, end)}</mark>
      {text.slice(end)}
    </>
  );
}

function ResultRow({
  hit,
  term,
  onOpen,
  onKeyDown,
}: {
  hit: SearchHit;
  term: string;
  onOpen: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const meta = DOCUMENT_TYPE_META[hit.docType];
  const snippet = hit.snippet ? displaySnippet(hit.snippet) : null;
  return (
    <li>
      <button
        type="button"
        className={styles.row}
        data-kind={hit.docType}
        onClick={onOpen}
        onKeyDown={onKeyDown}
      >
        <Icon name={meta.entityIcon} size={16} className={styles.icon} />
        <span className={styles.copy}>
          <span className={styles.title}>{highlight(hit.title, term)}</span>
          {snippet && (
            <span className={styles.snippet}>
              {snippet.leading && "…"}
              {snippet.before}
              <mark className={styles.match}>{snippet.match}</mark>
              {snippet.after}
              {snippet.trailing && "…"}
            </span>
          )}
          <span className={styles.path}>{hit.path.join("/")}</span>
        </span>
      </button>
    </li>
  );
}

export function SearchView({ paneId, active }: WorkspaceViewProps) {
  const { projectId, open, activePane } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [requested, setRequested] = useState("");
  const [shown, setShown] = useState<Shown | null>(null);
  const term = searchTermOf(query);
  const search = useProjectSearch(projectId, requested);
  const focused = active && activePane.id === paneId;

  useEffect(() => {
    const timer = window.setTimeout(
      () => setRequested(term),
      SEARCH_DEBOUNCE_MS,
    );
    return () => window.clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    if (focused) inputRef.current?.focus();
  }, [focused]);

  if (
    term &&
    requested === term &&
    search.data &&
    search.data !== shown?.hits
  ) {
    setShown({ term, hits: search.data });
  }

  const settled =
    shown !== null &&
    shown.term === term &&
    requested === term &&
    !search.isFetching;
  const failed =
    requested === term && search.isError && !search.isFetching && !settled;
  const status: "idle" | "loading" | "error" | "results" = !term
    ? "idle"
    : failed
      ? "error"
      : shown
        ? "results"
        : "loading";
  const busy = status === "loading" || (status === "results" && !settled);
  const hits = status === "results" && shown ? shown.hits : [];

  const change = (next: string) => {
    setQuery(next);
    if (!searchTermOf(next)) setShown(null);
  };

  const rowsOf = () =>
    Array.from(listRef.current?.querySelectorAll("button") ?? []);

  const openHit = (hit: SearchHit) =>
    open({ kind: "file", fileId: hit.fileId });

  const onFieldKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "Escape" && query) {
      event.preventDefault();
      change("");
    } else if (event.key === "ArrowDown" && hits.length > 0) {
      event.preventDefault();
      rowsOf()[0]?.focus();
    } else if (event.key === "Enter" && term) {
      event.preventDefault();
      if (settled && hits.length > 0) openHit(hits[0]);
      else setRequested(term);
    }
  };

  const onRowKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const rows = rowsOf();
    const at = rows.indexOf(event.currentTarget);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      rows[Math.min(at + 1, rows.length - 1)]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (at <= 0) inputRef.current?.focus();
      else rows[at - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      inputRef.current?.focus();
    }
  };

  const meta =
    status === "results" && settled && hits.length > 0
      ? t("검색::{count}개 결과", { count: hits.length })
      : undefined;

  return (
    <ViewPage title={t("작업공간::검색")} meta={meta}>
      <SearchField
        ref={inputRef}
        value={query}
        label={t("검색::프로젝트에서 검색")}
        clearLabel={t("검색::검색어 지우기")}
        busy={busy}
        busyLabel={t("검색::찾는 중")}
        onClear={() => change("")}
        onChange={(event) => change(event.target.value)}
        onKeyDown={onFieldKeyDown}
      />

      {status === "results" && hits.length > 0 ? (
        <div className={styles.results}>
          <ul
            ref={listRef}
            className={styles.list}
            aria-label={t("검색::검색 결과")}
            aria-busy={busy || undefined}
          >
            {hits.map((hit) => (
              <ResultRow
                key={hit.fileId}
                hit={hit}
                term={shown?.term ?? term}
                onOpen={() => openHit(hit)}
                onKeyDown={onRowKeyDown}
              />
            ))}
          </ul>
          {hits.length >= SEARCH_LIMIT && (
            <p className={styles.limit}>
              {t(
                "검색::처음 {count}개만 보여요. 검색어를 더 구체적으로 적어 보세요.",
                { count: SEARCH_LIMIT },
              )}
            </p>
          )}
        </div>
      ) : (
        <ViewPanel>
          {status === "idle" && (
            <EmptyState
              icon="search"
              title={t("검색::원고와 설정 문서의 제목과 본문에서 찾아요")}
            />
          )}
          {status === "loading" && (
            <EmptyState
              role="status"
              icon="loader-circle"
              title={t("검색::찾는 중이에요")}
            />
          )}
          {status === "error" && (
            <EmptyState
              role="alert"
              icon="triangle-alert"
              title={t("검색::검색하지 못했어요")}
              description={t("작업공간::연결을 확인한 뒤 다시 시도해 주세요.")}
              action={
                <Button
                  size="md"
                  icon="refresh-cw"
                  onClick={() => search.refetch()}
                >
                  {t("다시 시도")}
                </Button>
              }
            />
          )}
          {status === "results" && (
            <EmptyState
              icon="search-x"
              title={t("검색::일치하는 문서가 없어요")}
            />
          )}
        </ViewPanel>
      )}
    </ViewPage>
  );
}
