import { Extension, type Editor } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export interface FindMatch {
  from: number;
  to: number;
}

interface FindState {
  query: string;
  index: number;
  matches: FindMatch[];
  decorations: DecorationSet;
  /** 다른 화면이 문장 하나를 짚어 달라고 했다. 일치를 모두 같은 모양으로 칠하고, 글을 고치면 지운다 */
  reveal: boolean;
}

export const findReplaceKey = new PluginKey<FindState>("findReplace");

function collectMatches(doc: ProseMirrorNode, query: string): FindMatch[] {
  if (!query) return [];
  const needle = query.toLocaleLowerCase();
  const matches: FindMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    const haystack = node.text.toLocaleLowerCase();
    let start = haystack.indexOf(needle);
    while (start >= 0) {
      matches.push({ from: pos + start, to: pos + start + needle.length });
      start = haystack.indexOf(needle, start + needle.length);
    }
  });
  return matches;
}

function decorate(
  doc: ProseMirrorNode,
  matches: FindMatch[],
  index: number,
  reveal: boolean,
) {
  return DecorationSet.create(
    doc,
    matches.map((match, i) =>
      Decoration.inline(match.from, match.to, {
        class:
          i === index && !reveal
            ? "lk-find-match lk-find-current"
            : "lk-find-match",
      }),
    ),
  );
}

function build(
  doc: ProseMirrorNode,
  query: string,
  index: number,
  reveal = false,
): FindState {
  const matches = collectMatches(doc, query);
  const bounded = matches.length
    ? Math.min(Math.max(index, 0), matches.length - 1)
    : 0;
  return {
    query,
    index: bounded,
    matches,
    decorations: decorate(doc, matches, bounded, reveal),
    reveal,
  };
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    findReplace: {
      setFindQuery: (
        query: string,
        options?: { reveal?: boolean },
      ) => ReturnType;
      findStep: (direction: 1 | -1) => ReturnType;
      replaceCurrent: (replacement: string) => ReturnType;
      replaceAll: (replacement: string) => ReturnType;
    };
  }
}

export const FindReplace = Extension.create({
  name: "findReplace",

  addProseMirrorPlugins() {
    return [
      new Plugin<FindState>({
        key: findReplaceKey,
        state: {
          init: (_, state) => build(state.doc, "", 0),
          apply: (tr, previous, _, next) => {
            const meta = tr.getMeta(findReplaceKey) as
              { query?: string; index?: number; reveal?: boolean } | undefined;
            if (!meta && tr.docChanged && previous.reveal)
              return build(next.doc, "", 0);
            if (meta || tr.docChanged) {
              return build(
                next.doc,
                meta?.query ?? previous.query,
                meta?.index ?? previous.index,
                meta ? meta.reveal === true : previous.reveal,
              );
            }
            return previous;
          },
        },
        props: {
          decorations: (state) => findReplaceKey.getState(state)?.decorations,
        },
      }),
    ];
  },

  addCommands() {
    return {
      setFindQuery:
        (query, options) =>
        ({ tr, dispatch }) => {
          dispatch?.(
            tr.setMeta(findReplaceKey, {
              query,
              index: 0,
              reveal: options?.reveal === true,
            }),
          );
          return true;
        },
      findStep:
        (direction) =>
        ({ state, tr, dispatch }) => {
          const current = findReplaceKey.getState(state);
          if (!current?.matches.length) return false;
          const count = current.matches.length;
          const index = (current.index + direction + count) % count;
          dispatch?.(tr.setMeta(findReplaceKey, { index }).scrollIntoView());
          return true;
        },
      replaceCurrent:
        (replacement) =>
        ({ state, tr, dispatch }) => {
          const current = findReplaceKey.getState(state);
          const match = current?.matches[current.index];
          if (!match) return false;
          dispatch?.(tr.insertText(replacement, match.from, match.to));
          return true;
        },
      replaceAll:
        (replacement) =>
        ({ state, tr, dispatch }) => {
          const current = findReplaceKey.getState(state);
          if (!current?.matches.length) return false;
          for (const match of [...current.matches].reverse()) {
            tr.insertText(replacement, match.from, match.to);
          }
          dispatch?.(tr);
          return true;
        },
    };
  },
});

/**
 * 문장 하나를 짚는다. 찾기 막대를 열지 않고 일치를 칠한 뒤 첫 일치를 창 가운데로 가져온다.
 * 찾지 못하면 false 다.
 */
export function revealText(editor: Editor, text: string): boolean {
  const query = revealCandidates(text).find((candidate) => {
    editor.commands.setFindQuery(candidate, { reveal: true });
    return (findReplaceKey.getState(editor.state)?.matches.length ?? 0) > 0;
  });
  if (!query) {
    editor.commands.setFindQuery("");
    return false;
  }
  const mark = editor.view.dom.querySelector(".lk-find-match");
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  mark?.scrollIntoView?.({
    block: "center",
    behavior: reduce ? "auto" : "smooth",
  });
  return true;
}

/** 인용은 앞뒤 따옴표·문장부호나 서식 경계에서 원문과 조금 다를 수 있다. 차례로 줄여 찾는다 */
function revealCandidates(text: string): string[] {
  const whole = text.replace(/\s+/g, " ").trim();
  const bare = whole
    .replace(/^["'“”‘’「」『』\s]+/, "")
    .replace(/["'“”‘’「」『』.,!?…\s]+$/, "");
  const head = bare.length > 24 ? bare.slice(0, 24) : "";
  return [...new Set([whole, bare, head].filter((value) => value.length > 1))];
}

export function findStateOf(
  state: Parameters<typeof findReplaceKey.getState>[0],
) {
  return findReplaceKey.getState(state);
}
