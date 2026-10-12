import { useSyncExternalStore } from "react";

import { EDITOR_FONTS, type EditorFontId } from "./editor-fonts";

// 서버 가정(DOCUMENT_EDITING_PROPOSAL §2.3): 글꼴·크기·줄 간격은 문서가 아니라
// user_editor_prefs에 저장한다. 서버 API가 생기기 전까지는 이 브라우저에만 보관한다.
// 정렬은 여기 없다 — 문단마다 다를 수 있어 문서 본문에 담는다(editor/text-align.ts).

/**
 * 글자 크기(pt). 워드프로세서와 같은 단위다. 10.5pt 는 14px 이고, 디자인 토큰의 원고 본문
 * 크기(font-size-manuscript-body)와 같다.
 */
export const EDITOR_FONT_SIZES = [10, 10.5, 11, 12, 14, 16] as const;
// 기본값은 디자인 토큰(line-height-manuscript-body)과 같다.
export const EDITOR_LINE_HEIGHTS = [1.5, 1.65, 1.78, 2] as const;

export interface EditorPrefs {
  font: EditorFontId;
  fontSize: (typeof EDITOR_FONT_SIZES)[number];
  lineHeight: (typeof EDITOR_LINE_HEIGHTS)[number];
}

export const DEFAULT_EDITOR_PREFS: EditorPrefs = {
  font: "inter",
  fontSize: 10.5,
  lineHeight: 1.5,
};

const STORAGE_KEY = "loresentry.editor-prefs.v2";
/**
 * 글자 크기를 px 로 적던 때의 자리. 같은 자리에 pt 를 적으면 `14` 가 어느 단위인지 알 수 없어
 * 자리를 새로 두었다. 여기는 읽기만 한다.
 */
const LEGACY_STORAGE_KEY = "loresentry.editor-prefs";
/** px 로 고르던 크기를 목록의 같은 자리 pt 로 옮긴다. 기본이던 14px 는 10.5pt 로 크기가 그대로다. */
const LEGACY_PX_TO_PT: Record<number, EditorPrefs["fontSize"]> = {
  13: 10,
  14: 10.5,
  15: 11,
  16: 12,
  18: 14,
  20: 16,
};
/** 이름이 바뀐 글꼴. "명조" 하나이던 것이 나눔명조·본명조·바탕으로 나뉘었다. */
const LEGACY_FONTS: Record<string, EditorFontId> = {
  myeongjo: "nanum-myeongjo",
};

const listeners = new Set<() => void>();
let snapshot: EditorPrefs | null = null;

/** 목록에 없는 값은 기본값으로 돌린다. 고를 수 있는 글꼴·크기는 판마다 달라질 수 있다. */
function normalize(raw: Record<string, unknown>): EditorPrefs {
  return {
    font:
      EDITOR_FONTS.find((font) => font.id === raw.font)?.id ??
      DEFAULT_EDITOR_PREFS.font,
    fontSize:
      EDITOR_FONT_SIZES.find((size) => size === raw.fontSize) ??
      DEFAULT_EDITOR_PREFS.fontSize,
    lineHeight:
      EDITOR_LINE_HEIGHTS.find((height) => height === raw.lineHeight) ??
      DEFAULT_EDITOR_PREFS.lineHeight,
  };
}

function read(): EditorPrefs {
  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) return normalize(JSON.parse(current));
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return DEFAULT_EDITOR_PREFS;
    const old = JSON.parse(legacy) as Record<string, unknown>;
    return normalize({
      ...old,
      font: LEGACY_FONTS[String(old.font)] ?? old.font,
      fontSize: LEGACY_PX_TO_PT[Number(old.fontSize)],
    });
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
