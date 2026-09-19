"use client";

import { useRef, useState } from "react";

import { Button, EmptyState, Icon } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { SearchHit } from "@/domain/models";
import { ViewPage, ViewPanel } from "@/features/workspace/views/view-page";
import { useWorkspace } from "@/features/workspace/workspace-context";

import {
  SEARCH_DEBOUNCE_MS,
  useDebouncedValue,
  useProjectSearch,
} from "./queries";
import styles from "./search-view.module.css";

function ResultRow({ hit, onOpen }: { hit: SearchHit; onOpen: () => void }) {
  const meta = DOCUMENT_TYPE_META[hit.docType];
  return (
    <li>
      <button type="button" className={styles.result} onClick={onOpen}>
        <span className={styles.resultIcon}>
          <Icon name={meta.entityIcon} size={16} />
        </span>
        <span className={styles.resultCopy}>
          <span className={styles.resultTitleLine}>
            <span className={styles.resultTitle}>{hit.title}</span>
            <span className={styles.resultType}>{meta.label}</span>
          </span>
          {hit.snippet && (
            <span className={styles.snippet}>
              {hit.snippet.before}
              <mark className={styles.match}>{hit.snippet.match}</mark>
              {hit.snippet.after}
            </span>
          )}
          <span className={styles.path}>{hit.path.join(" > ")}</span>
        </span>
        <Icon name="arrow-up-right" size={15} className={styles.resultArrow} />
      </button>
    </li>
  );
}

export function SearchView() {
  const { project, projectId, open } = useWorkspace();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, SEARCH_DEBOUNCE_MS);
  const settled = debounced.trim() === query.trim();
  const search = useProjectSearch(projectId, debounced);
  const term = query.trim();

  const status: "idle" | "loading" | "error" | "done" = !term
    ? "idle"
    : !settled || search.isFetching
      ? "loading"
      : search.isError
        ? "error"
        : "done";
  const hits = status === "done" ? (search.data ?? []) : [];

  const meta = {
    idle: "검색어를 기다리는 중",
    loading: "검색 중",
    error: "불러오지 못했어요",
    done: `${hits.length}개 결과`,
  }[status];

  const clear = () => {
    setQuery("");
    inputRef.current?.focus();
  };

  return (
    <ViewPage
      context={project.title}
      title="검색"
      description="현재 프로젝트의 파일 이름과 본문을 검색합니다."
      meta={meta}
    >
      <div className={styles.field} role="search">
        <Icon name="search" size={16} className={styles.fieldIcon} />
        <input
          ref={inputRef}
          className={styles.input}
          type="search"
          value={query}
          placeholder="현재 프로젝트에서 검색"
          aria-label="현재 프로젝트에서 검색"
          size={Math.max(query.length, 1)}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape" && query) {
              event.preventDefault();
              clear();
            }
          }}
        />
        {status === "loading" ? (
          <Icon
            name="loader-circle"
            size={15}
            className={styles.spin}
            label="검색 중"
          />
        ) : (
          term && (
            <button
              type="button"
              className={styles.clear}
              aria-label="검색어 지우기"
              onClick={clear}
            >
              <Icon name="x" size={15} />
            </button>
          )
        )}
      </div>

      {status === "done" && hits.length > 0 ? (
        <ul className={styles.results} aria-label="검색 결과">
          {hits.map((hit) => (
            <ResultRow
              key={hit.fileId}
              hit={hit}
              onOpen={() => open({ kind: "file", fileId: hit.fileId })}
            />
          ))}
        </ul>
      ) : (
        <ViewPanel>
          {status === "idle" && (
            <EmptyState
              icon="search"
              title="현재 프로젝트의 파일을 검색하세요"
              description="파일 이름과 검색 가능한 본문에서 찾을 수 있습니다."
            />
          )}
          {status === "loading" && (
            <EmptyState
              role="status"
              icon="loader-circle"
              title={`‘${term}’를 검색하고 있습니다`}
              description="새 검색 결과를 불러오는 동안 이전 결과는 표시하지 않습니다."
            />
          )}
          {status === "error" && (
            <EmptyState
              role="alert"
              icon="triangle-alert"
              title="검색 결과를 불러오지 못했어요"
              description="검색어는 그대로 남아 있어요. 연결을 확인한 뒤 다시 시도해 주세요."
              action={
                <Button
                  size="md"
                  icon="refresh-cw"
                  onClick={() => search.refetch()}
                >
                  다시 시도
                </Button>
              }
            />
          )}
          {status === "done" && (
            <EmptyState
              icon="file-x"
              title="검색 결과가 없습니다"
              description={`‘${term}’과 일치하는 파일이 없습니다. 다른 검색어를 입력해 보세요.`}
            />
          )}
        </ViewPanel>
      )}
    </ViewPage>
  );
}
