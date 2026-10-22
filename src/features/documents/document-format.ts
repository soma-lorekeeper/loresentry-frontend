import type { JSONContent } from "@tiptap/core";
import { useSyncExternalStore } from "react";

import { EDITOR_FONTS, type EditorFontId } from "./editor-fonts";

// 글꼴·크기·줄 간격은 문서마다 본문 맨 위 노드(doc)의 속성으로 담는다(editor/formatted-document.ts).
// 그 속성이 없는 문서는 예전에 이 브라우저에 저장해 둔 값으로 보인다. 브라우저의 값은 이제 읽기만 한다 —
// 한 문서에서 바꾼 서식이 다른 문서로 번지지 않게 하려는 것이다.
// 정렬은 여기 없다 — 문단마다 다를 수 있어 문단 노드에 담는다(editor/text-align.ts).

/**
 * 글자 크기(pt). 워드프로세서와 같은 단위다. 10.5pt 는 14px 이고, 디자인 토큰의 원고 본문
 * 크기(font-size-manuscript-body)와 같다.
 */
export const EDITOR_FONT_SIZES = [10, 10.5, 11, 12, 14, 16] as const;
// 기본값은 디자인 토큰(line-height-manuscript-body)과 같다.
export const EDITOR_LINE_HEIGHTS = [1.5, 1.65, 1.78, 2] as const;

export interface DocumentFormat {
  font: EditorFontId;
  fontSize: (typeof EDITOR_FONT_SIZES)[number];
  lineHeight: (typeof EDITOR_LINE_HEIGHTS)[number];
}

export const DOCUMENT_FORMAT_KEYS = [
  "font",
  "fontSize",
  "lineHeight",
] as const satisfies readonly (keyof DocumentFormat)[];

export const DEFAULT_DOCUMENT_FORMAT: DocumentFormat = {
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
const LEGACY_PX_TO_PT: Record<number, DocumentFormat["fontSize"]> = {
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

/** 목록에 없는 값은 `fallback` 으로 돌린다. 고를 수 있는 글꼴·크기는 판마다 달라질 수 있다. */
function normalize(
  raw: Record<string, unknown>,
  fallback: DocumentFormat,
): DocumentFormat {
  return {
    font:
      EDITOR_FONTS.find((font) => font.id === raw.font)?.id ?? fallback.font,
    fontSize:
      EDITOR_FONT_SIZES.find((size) => size === raw.fontSize) ??
      fallback.fontSize,
    lineHeight:
      EDITOR_LINE_HEIGHTS.find((height) => height === raw.lineHeight) ??
      fallback.lineHeight,
  };
}

function readDeviceFormat(): DocumentFormat {
  try {
    const current = window.localStorage.getItem(STORAGE_KEY);
    if (current) return normalize(JSON.parse(current), DEFAULT_DOCUMENT_FORMAT);
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return DEFAULT_DOCUMENT_FORMAT;
    const old = JSON.parse(legacy) as Record<string, unknown>;
    return normalize(
      {
        ...old,
        font: LEGACY_FONTS[String(old.font)] ?? old.font,
        fontSize: LEGACY_PX_TO_PT[Number(old.fontSize)],
      },
      DEFAULT_DOCUMENT_FORMAT,
    );
  } catch {
    return DEFAULT_DOCUMENT_FORMAT;
  }
}

let deviceFormat: DocumentFormat | null = null;

const subscribeNever = () => () => {};

export function useDeviceFormat(): DocumentFormat {
  return useSyncExternalStore(
    subscribeNever,
    () => (deviceFormat ??= readDeviceFormat()),
    () => DEFAULT_DOCUMENT_FORMAT,
  );
}

export function formatOf(
  doc: JSONContent | undefined,
  fallback: DocumentFormat,
): DocumentFormat {
  return normalize(doc?.attrs ?? {}, fallback);
}
