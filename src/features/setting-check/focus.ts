"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 점검 탭에서 고른 회차. 도구 막대·알림처럼 탭 밖에서 점검을 시작한 곳도 그 회차를 고르게 해야 해서
 * 탭 안의 상태가 아니라 프로젝트마다 하나씩 둔다.
 */
const focused = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function focusChapter(projectId: string, documentId: string) {
  if (focused.get(projectId) === documentId) return;
  focused.set(projectId, documentId);
  listeners.forEach((listener) => listener());
}

export function useFocusedChapter(
  projectId: string,
): [string | null, (documentId: string) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => focused.get(projectId) ?? null,
    () => null,
  );
  const set = useCallback(
    (documentId: string) => focusChapter(projectId, documentId),
    [projectId],
  );
  return [value, set];
}
