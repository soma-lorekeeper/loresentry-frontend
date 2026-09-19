import { Extension } from "@tiptap/core";
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

function decorate(doc: ProseMirrorNode, matches: FindMatch[], index: number) {
  return DecorationSet.create(
    doc,
    matches.map((match, i) =>
      Decoration.inline(match.from, match.to, {
        class: i === index ? "lk-find-match lk-find-current" : "lk-find-match",
      }),
    ),
  );
}

function build(doc: ProseMirrorNode, query: string, index: number): FindState {
  const matches = collectMatches(doc, query);
  const bounded = matches.length
    ? Math.min(Math.max(index, 0), matches.length - 1)
    : 0;
  return {
    query,
    index: bounded,
    matches,
    decorations: decorate(doc, matches, bounded),
  };
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    findReplace: {
      setFindQuery: (query: string) => ReturnType;
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
              { query?: string; index?: number } | undefined;
            if (meta || tr.docChanged) {
              return build(
                next.doc,
                meta?.query ?? previous.query,
                meta?.index ?? previous.index,
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
        (query) =>
        ({ tr, dispatch }) => {
          dispatch?.(tr.setMeta(findReplaceKey, { query, index: 0 }));
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

export function findStateOf(
  state: Parameters<typeof findReplaceKey.getState>[0],
) {
  return findReplaceKey.getState(state);
}
