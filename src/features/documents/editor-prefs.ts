import { useSyncExternalStore } from "react";

// 서버 가정(DOCUMENT_EDITING_PROPOSAL §2.3): 글꼴·크기·줄 간격·정렬은 문서가 아니라
// user_editor_prefs에 저장한다. 서버 API가 생기기 전까지는 이 브라우저에만 보관한다.
export const EDITOR_FONTS = [
  { id: "inter", label: "Inter", stack: "var(--lk-font-stack-ui)" },
  {
    id: "myeongjo",
    label: "명조",
    stack: '"AppleMyungjo", "Nanum Myeongjo", "Noto Serif KR", serif',
  },
  { id: "mono", label: "고정폭", stack: "var(--lk-font-stack-mono)" },
] as const;

export const EDITOR_FONT_SIZES = [13, 14, 15, 16, 18, 20] as const;
export const EDITOR_LINE_HEIGHTS = [1.5, 1.65, 1.78, 2] as const;

// 기본값은 디자인 토큰(font-size-manuscript-body, line-height-manuscript-body)과 같다.
export const EDITOR_ALIGNMENTS = [
  { id: "left", label: "왼쪽" },
  { id: "justify", label: "양쪽" },
] as const;

export interface EditorPrefs {
  font: (typeof EDITOR_FONTS)[number]["id"];
  fontSize: (typeof EDITOR_FONT_SIZES)[number];
  lineHeight: (typeof EDITOR_LINE_HEIGHTS)[number];
  align: (typeof EDITOR_ALIGNMENTS)[number]["id"];
}

export const DEFAULT_EDITOR_PREFS: EditorPrefs = {
  font: "inter",
  fontSize: 14,
  lineHeight: 1.5,
  align: "left",
};

const STORAGE_KEY = "loresentry.editor-prefs";
const listeners = new Set<() => void>();
let snapshot: EditorPrefs | null = null;

function read(): EditorPrefs {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw
      ? {
          ...DEFAULT_EDITOR_PREFS,
          ...(JSON.parse(raw) as Partial<EditorPrefs>),
        }
      : DEFAULT_EDITOR_PREFS;
  } catch {
    return DEFAULT_EDITOR_PREFS;
  }
}

export function setEditorPrefs(patch: Partial<EditorPrefs>) {
  snapshot = { ...(snapshot ?? read()), ...patch };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {}
  listeners.forEach((listener) => listener());
}

export function useEditorPrefs(): EditorPrefs {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => (snapshot ??= read()),
    () => DEFAULT_EDITOR_PREFS,
  );
}
