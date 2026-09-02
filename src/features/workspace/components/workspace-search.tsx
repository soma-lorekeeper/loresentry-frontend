"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Button, StatusNotice } from "@/components/ui";

import { WorkspaceIcon } from "../icons";
import type { WorkspaceNavItem } from "../workspace-data";
import styles from "./workspace.module.css";

interface SearchRecord {
  excerpt: string;
  item: WorkspaceNavItem;
  path: string;
  type: string;
}

const records: SearchRecord[] = [
  {
    excerpt: "차가운 유리벽 사이로 균열이 번지며 밤의 경계가 열렸다.",
    item: {
      contentId: "manuscript-12",
      icon: "file",
      id: "file-manuscript-12",
      kind: "file",
      label: "12화 · 균열의 밤",
    },
    path: "파일 > 원고",
    type: "원고",
  },
  {
    excerpt: "유리 정원 중앙의 오래된 나무가 새벽빛을 받아 반짝였다.",
    item: {
      contentId: "manuscript-11",
      icon: "file",
      id: "file-manuscript-11",
      kind: "file",
      label: "11화 · 유리 정원",
    },
    path: "파일 > 원고",
    type: "원고",
  },
  {
    excerpt: "북쪽 관문은 일몰 이후 봉인되며 기록관의 허가가 필요하다.",
    item: {
      icon: "settings",
      id: "setting",
      kind: "file",
      label: "세계 설정",
    },
    path: "파일",
    type: "설정",
  },
  {
    excerpt: "서윤은 잃어버린 기록을 복원하기 위해 정원에 들어왔다.",
    item: {
      icon: "character",
      id: "character",
      kind: "file",
      label: "서윤",
    },
    path: "파일",
    type: "캐릭터",
  },
];

export interface WorkspaceSearchProps {
  onOpenResult: (item: WorkspaceNavItem) => void;
  onQueryChange: (query: string) => void;
  query: string;
}

export function WorkspaceSearch({
  onOpenResult,
  onQueryChange,
  query,
}: WorkspaceSearchProps) {
  const [settledQuery, setSettledQuery] = useState(query.trim());
  const [retryCount, setRetryCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  const loading = Boolean(normalizedQuery) && settledQuery !== normalizedQuery;
  const failed = settledQuery === "오류";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!normalizedQuery) return;
    const timeout = window.setTimeout(
      () => setSettledQuery(normalizedQuery),
      120,
    );
    return () => window.clearTimeout(timeout);
  }, [normalizedQuery, retryCount]);

  const results = useMemo(() => {
    if (!settledQuery || failed) return [];
    return records.filter((record) =>
      `${record.item.label} ${record.excerpt} ${record.type}`
        .toLocaleLowerCase("ko")
        .includes(settledQuery),
    );
  }, [failed, settledQuery]);

  return (
    <section
      aria-labelledby="tab-search"
      className={styles.searchView}
      id="panel-search"
      role="tabpanel"
    >
      <div className={styles.searchSurface}>
        <div className={styles.searchHeading}>
          <span className={styles.eyebrow}>현재 프로젝트</span>
          <h1 id="workspace-search-title">검색</h1>
        </div>
        <label className={styles.searchField}>
          <span className={styles.srOnly}>현재 프로젝트에서 검색</span>
          <WorkspaceIcon name="search" />
          <input
            onChange={(event) => {
              const nextQuery = event.target.value;
              onQueryChange(nextQuery);
              if (!nextQuery.trim()) setSettledQuery("");
            }}
            placeholder="현재 프로젝트에서 검색"
            ref={inputRef}
            type="search"
            value={query}
          />
        </label>

        <div
          aria-busy={loading}
          aria-live="polite"
          className={styles.searchResults}
        >
          {!normalizedQuery && (
            <div className={styles.searchEmptyState}>
              <WorkspaceIcon name="search" />
              <h2>현재 프로젝트의 파일을 검색하세요</h2>
              <p>파일 이름과 검색 가능한 본문에서 찾습니다.</p>
            </div>
          )}
          {loading && (
            <div className={styles.searchEmptyState} role="status">
              <span aria-hidden="true" className={styles.searchSpinner} />
              <h2>검색 중</h2>
              <p>“{query.trim()}”에 맞는 파일을 찾고 있습니다.</p>
            </div>
          )}
          {!loading && failed && (
            <StatusNotice variant="error">
              <span className={styles.searchErrorCopy}>
                <strong>검색 결과를 불러오지 못했습니다</strong>
                <span>
                  검색어를 유지했습니다. 같은 검색을 다시 시도할 수 있습니다.
                </span>
              </span>
              <Button
                onClick={() => {
                  setSettledQuery("");
                  setRetryCount((count) => count + 1);
                }}
              >
                다시 시도
              </Button>
            </StatusNotice>
          )}
          {!loading && normalizedQuery && !failed && results.length === 0 && (
            <div className={styles.searchEmptyState} role="status">
              <WorkspaceIcon name="search" />
              <h2>검색 결과가 없습니다</h2>
              <p>“{query.trim()}” 대신 다른 검색어를 입력해 보세요.</p>
            </div>
          )}
          {!loading && results.length > 0 && (
            <>
              <p className={styles.resultSummary} role="status">
                “{query.trim()}” 검색 결과 {results.length}개
              </p>
              <ul aria-label="검색 결과" className={styles.resultList}>
                {results.map((result) => (
                  <li key={result.item.id}>
                    <button
                      aria-label={`${result.item.label}, ${result.type}, ${result.path}`}
                      className={styles.resultRow}
                      onClick={() => onOpenResult(result.item)}
                      type="button"
                    >
                      <WorkspaceIcon name={result.item.icon} />
                      <span className={styles.resultCopy}>
                        <span className={styles.resultTitleRow}>
                          <strong>{result.item.label}</strong>
                          <span>{result.type}</span>
                        </span>
                        <span>{result.excerpt}</span>
                        <small>{result.path}</small>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
