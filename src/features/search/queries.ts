"use client";

import { useQuery } from "@tanstack/react-query";

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
