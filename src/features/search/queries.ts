"use client";

import { useQuery } from "@tanstack/react-query";

import type { SearchHit } from "@/domain/models";
import { INTL_LOCALE, LOCALE } from "@/i18n/locale";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export const SEARCH_DEBOUNCE_MS = 250;

export const SEARCH_LIMIT = 50;

const SNIPPET_CONTEXT = 40;

const LEAD_CONTEXT = 24;

const TRAILING_JAMO = /[ㄱ-ㆎ]+$/u;

export function searchTermOf(text: string) {
  return text.trim().replace(TRAILING_JAMO, "").trim();
}

export function displaySnippet(snippet: {
  before: string;
  match: string;
  after: string;
}) {
  const before = snippet.before.trimStart();
  const cut = before.length > LEAD_CONTEXT;
  return {
    before: cut ? before.slice(-LEAD_CONTEXT).trimStart() : before,
    match: snippet.match,
    after: snippet.after.trimEnd(),
    leading: cut || snippet.before.length >= SNIPPET_CONTEXT,
    trailing: snippet.after.length >= SNIPPET_CONTEXT,
  };
}

export function useProjectSearch(projectId: string, term: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.search(projectId, term),
    queryFn: () => services.search.search(projectId, term),
    enabled: term.length > 0,
  });
}

export type SearchOrder = "relevance" | "recent" | "title";

export type SortDirection = "asc" | "desc";

export const DEFAULT_DIRECTION: Record<SearchOrder, SortDirection> = {
  relevance: "desc",
  recent: "desc",
  title: "asc",
};

const titleCollator = new Intl.Collator(INTL_LOCALE[LOCALE], {
  numeric: true,
  sensitivity: "base",
});

function ascending(hits: SearchHit[], order: SearchOrder): SearchHit[] {
  if (order === "relevance") return [...hits].reverse();
  const sorted = [...hits];
  if (order === "recent")
    sorted.sort((a, b) => Date.parse(a.updatedAt) - Date.parse(b.updatedAt));
  else sorted.sort((a, b) => titleCollator.compare(a.title, b.title));
  return sorted;
}

export function sortHits(
  hits: SearchHit[],
  order: SearchOrder,
  direction: SortDirection,
): SearchHit[] {
  const sorted = ascending(hits, order);
  return direction === "asc" ? sorted : sorted.reverse();
}
