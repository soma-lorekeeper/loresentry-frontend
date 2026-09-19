import { useSyncExternalStore } from "react";

import {
  DEFAULT_THEME_MODE,
  THEME_COLOR_SCHEME,
  THEME_MODES,
  type ThemeMode,
} from "../tokens/tokens";
import { PREFERS_DARK_QUERY, THEME_STORAGE_KEY } from "./theme-config";

export type ThemePreference = ThemeMode | "system";

export function isThemeMode(value: unknown): value is ThemeMode {
  return (THEME_MODES as readonly unknown[]).includes(value);
}

export function resolveThemeMode(
  preference: ThemePreference,
  prefersDark: boolean,
): ThemeMode {
  if (preference !== "system") return preference;
  const wanted = prefersDark ? "dark" : "light";
  return (
    THEME_MODES.find((mode) => THEME_COLOR_SCHEME[mode] === wanted) ??
    DEFAULT_THEME_MODE
  );
}

function readPreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : "system";
  } catch {
    return "system";
  }
}

function prefersDark() {
  return window.matchMedia?.(PREFERS_DARK_QUERY).matches ?? true;
}

function applyMode(mode: ThemeMode) {
  document.documentElement.dataset.theme = mode;
}

interface ThemeSnapshot {
  mode: ThemeMode;
  preference: ThemePreference;
}

const SERVER_SNAPSHOT: ThemeSnapshot = {
  mode: DEFAULT_THEME_MODE,
  preference: "system",
};

let snapshot: ThemeSnapshot | null = null;
const listeners = new Set<() => void>();

function computeSnapshot(): ThemeSnapshot {
  const preference = readPreference();
  return { preference, mode: resolveThemeMode(preference, prefersDark()) };
}

function refresh() {
  const next = computeSnapshot();
  if (
    snapshot &&
    snapshot.mode === next.mode &&
    snapshot.preference === next.preference
  ) {
    return;
  }
  snapshot = next;
  applyMode(next.mode);
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.matchMedia?.(PREFERS_DARK_QUERY).addEventListener("change", refresh);
    window.addEventListener("storage", refresh);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      window
        .matchMedia?.(PREFERS_DARK_QUERY)
        .removeEventListener("change", refresh);
      window.removeEventListener("storage", refresh);
    }
  };
}

function getSnapshot() {
  snapshot ??= computeSnapshot();
  return snapshot;
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      window.localStorage.setItem(THEME_STORAGE_KEY, preference);
    }
  } catch {}
  refresh();
}

export function useTheme() {
  const current = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => SERVER_SNAPSHOT,
  );
  return { ...current, setPreference: setThemePreference };
}

export function resetThemeStoreForTests() {
  snapshot = null;
}
