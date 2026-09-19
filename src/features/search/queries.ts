"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export const SEARCH_DEBOUNCE_MS = 250;

export function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function useProjectSearch(projectId: string, query: string) {
  const services = useServices();
  const trimmed = query.trim();
  return useQuery({
    queryKey: queryKeys.search(projectId, trimmed),
    queryFn: () => services.search.search(projectId, trimmed),
    enabled: trimmed.length > 0,
  });
}
