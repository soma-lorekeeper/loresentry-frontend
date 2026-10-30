"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 점검 탭이 보여 주는 회차. 없으면 처음 화면이다. 도구 막대·알림처럼 탭 밖에서 점검을 시작한 곳도
 * 그 회차를 열어야 해서 탭 안의 상태가 아니라 프로젝트마다 하나씩 둔다.
 */
const focused = new Map<string, string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function focusChapter(projectId: string, documentId: string | null) {
  if ((focused.get(projectId) ?? null) === documentId) return;
  if (documentId === null) focused.delete(projectId);
  else focused.set(projectId, documentId);
  listeners.forEach((listener) => listener());
}

export function useFocusedChapter(
  projectId: string,
): [string | null, (documentId: string | null) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => focused.get(projectId) ?? null,
    () => null,
  );
  const set = useCallback(
    (documentId: string | null) => focusChapter(projectId, documentId),
    [projectId],
  );
  return [value, set];
}
