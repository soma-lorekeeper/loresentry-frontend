import { useSyncExternalStore } from "react";

/**
 * 작업공간 틀의 크기 가운데 **기기마다 다른 것**을 이 브라우저에 기억한다.
 *
 * <p>사이드바 폭은 화면 크기와 손에 익은 정도에 달린 값이라 작품이 아니라 기기를 따른다.
 * 그래서 서버에 저장되는 배치(WorkspaceLayout)에 넣지 않고, 편집기 설정
 * (documents/editor-prefs.ts)과 같은 방식으로 localStorage 에 둔다. 사이드바는 접으면
 * 화면에서 사라지지만(unmount) 값은 여기 남아 있어 다시 펴면 그 폭으로 돌아온다.
 */
export const SIDEBAR_WIDTH = { min: 200, max: 420, initial: 232 };

const STORAGE_KEY = "loresentry.workspace-chrome";
const listeners = new Set<() => void>();
let snapshot: number | null = null;

export function clampSidebarWidth(width: number) {
  return Math.min(
    SIDEBAR_WIDTH.max,
    Math.max(SIDEBAR_WIDTH.min, Math.round(width)),
  );
}

function read(): number {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const stored = raw
      ? (JSON.parse(raw) as { sidebarWidth?: unknown }).sidebarWidth
      : null;
    // 저장된 값이 숫자가 아니면(손으로 고쳤거나 옛 형식) 기본 폭으로 돌아간다.
    return typeof stored === "number" && Number.isFinite(stored)
      ? clampSidebarWidth(stored)
      : SIDEBAR_WIDTH.initial;
  } catch {
    // 사생활 보호 모드처럼 저장소를 못 쓰는 환경에서는 기본 폭으로 지낸다.
    return SIDEBAR_WIDTH.initial;
  }
}

export function setSidebarWidth(width: number) {
  snapshot = clampSidebarWidth(width);
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ sidebarWidth: snapshot }),
    );
  } catch {
    // 기억하지 못해도 이번 화면에서는 바뀐 폭으로 보인다.
  }
  listeners.forEach((listener) => listener());
}

export function useSidebarWidth(): number {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (snapshot ??= read()),
    () => SIDEBAR_WIDTH.initial,
  );
}

/** 테스트가 저장소를 비운 뒤 다시 읽게 한다. */
export function resetSidebarWidthCache() {
  snapshot = null;
}
