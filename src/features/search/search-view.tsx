"use client";

import {
  useEffect,
  useMemo,
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
  Segmented,
  type SegmentedOption,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { SearchHit } from "@/domain/models";
import { trackProjectSearch } from "@/features/analytics/google-analytics";
import { indexNodes, isDocument } from "@/features/workspace/model/tree";
import { useFavorites, useFileTree } from "@/features/workspace/queries";
import type { WorkspaceViewProps } from "@/features/workspace/views/view-types";
import { ViewPage, ViewPanel } from "@/features/workspace/views/view-page";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { dottedDate, relativeTime } from "@/shared/format";

import {
  SEARCH_DEBOUNCE_MS,
  SEARCH_LIMIT,
  displaySnippet,
  searchTermOf,
  DEFAULT_DIRECTION,
  sortHits,
  useProjectSearch,
  type SearchOrder,
  type SortDirection,
} from "./queries";
import styles from "./search-view.module.css";

const ORDERS: SegmentedOption<SearchOrder>[] = [
  { value: "relevance", label: t("검색::관련도순") },
  { value: "recent", label: t("검색::최근 수정순") },
  { value: "title", label: t("검색::이름순") },
];

const DIRECTION_HINT: Record<SearchOrder, Record<SortDirection, string>> = {
  relevance: {
    desc: t("검색::관련도가 높은 문서부터"),
    asc: t("검색::관련도가 낮은 문서부터"),
  },
  recent: {
    desc: t("검색::최근에 고친 문서부터"),
    asc: t("검색::오래전에 고친 문서부터"),
  },
  title: {
    asc: t("검색::가나다순"),
    desc: t("검색::가나다 역순"),
  },
};

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
  locked,
  favorite,
  onOpen,
  onKeyDown,
}: {
  hit: SearchHit;
  term: string;
  locked: boolean;
  favorite: boolean;
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
          <span className={styles.head}>
            <span className={styles.title}>{highlight(hit.title, term)}</span>
            <time
              className={styles.time}
              dateTime={hit.updatedAt}
              title={t("검색::마지막 수정 {date}", {
                date: dottedDate(hit.updatedAt),
              })}
            >
              {relativeTime(hit.updatedAt)}
            </time>
          </span>
          {snippet && (
            <span className={styles.snippet}>
              {snippet.leading && "…"}
              {snippet.before}
              <mark className={styles.match}>{snippet.match}</mark>
              {snippet.after}
              {snippet.trailing && "…"}
            </span>
          )}
          <span className={styles.meta}>
            {hit.path.map((part) => (
              <span key={part} className={styles.metaItem}>
                {part}
              </span>
            ))}
            {locked && (
              <span className={styles.metaItem}>
                <Icon name="lock" size={12} />
                {t("검색::잠김")}
              </span>
            )}
            {favorite && (
              <span className={styles.metaItem} data-favorite>
                <Icon name="star" size={12} />
                {t("검색::즐겨찾기")}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

export function SearchView({ paneId, active }: WorkspaceViewProps) {
  const { projectId, open, activePane } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const measuredSearch = useRef({ term: "", reported: false });
  const [query, setQuery] = useState("");
  const [requested, setRequested] = useState("");
  const [shown, setShown] = useState<Shown | null>(null);
  const [order, setOrder] = useState<SearchOrder>("relevance");
  const [direction, setDirection] = useState<SortDirection>(
    DEFAULT_DIRECTION.relevance,
  );
  const term = searchTermOf(query);
  const search = useProjectSearch(projectId, requested);
  const tree = useFileTree(projectId);
  const favorites = useFavorites(projectId);
  const nodes = useMemo(() => indexNodes(tree.data ?? []), [tree.data]);
  const favoriteIds = useMemo(
    () => new Set(favorites.data ?? []),
    [favorites.data],
  );
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

  useEffect(() => {
    if (measuredSearch.current.term !== requested) {
      measuredSearch.current = { term: requested, reported: false };
    }
    if (
      !requested ||
      requested !== term ||
      !search.isSuccess ||
      search.isFetching ||
      measuredSearch.current.reported
    ) {
      return;
    }
    measuredSearch.current.reported = true;
    trackProjectSearch(search.data.length > 0);
  }, [requested, term, search.data, search.isSuccess, search.isFetching]);

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
  const hits = useMemo(
    () =>
      status === "results" && shown
        ? sortHits(shown.hits, order, direction)
        : [],
    [status, shown, order, direction],
  );

  const change = (next: string) => {
    setQuery(next);
    if (!searchTermOf(next)) setShown(null);
  };

  const rowsOf = () =>
    Array.from(listRef.current?.querySelectorAll("button") ?? []);

  const changeOrder = (next: SearchOrder) => {
    setOrder(next);
    setDirection(DEFAULT_DIRECTION[next]);
  };

  const lockedOf = (fileId: string) => {
    const node = nodes.get(fileId);
    return isDocument(node) && node.locked;
  };

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
          <div className={styles.sort}>
            <Segmented
              label={t("검색::정렬")}
              variant="pills"
              options={ORDERS}
              value={order}
              onChange={changeOrder}
            />
            <Button
              variant="ghost"
              size="md"
              icon={
                direction === "asc"
                  ? "arrow-up-narrow-wide"
                  : "arrow-down-wide-narrow"
              }
              aria-label={t("검색::정렬 방향: {direction}", {
                direction:
                  direction === "asc"
                    ? t("검색::오름차순")
                    : t("검색::내림차순"),
              })}
              title={DIRECTION_HINT[order][direction]}
              onClick={() =>
                setDirection((current) => (current === "asc" ? "desc" : "asc"))
              }
            >
              {direction === "asc" ? t("검색::오름차순") : t("검색::내림차순")}
            </Button>
          </div>
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
                locked={lockedOf(hit.fileId)}
                favorite={favoriteIds.has(hit.fileId)}
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
