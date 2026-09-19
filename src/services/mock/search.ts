import type { SearchHit } from "@/domain/models";

import type { SearchService } from "../ports";

import { simulate } from "./control";
import { getDb, isDocumentNode } from "./db";
import { activeFiles, pathOf } from "./tree";

const SNIPPET_RADIUS = 18;

function snippetOf(text: string, index: number, length: number) {
  const flat = text.replace(/\s+/g, " ");
  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(flat.length, index + length + SNIPPET_RADIUS * 2);
  return {
    before: `${start > 0 ? "…" : ""}${flat.slice(start, index)}`,
    match: flat.slice(index, index + length),
    after: `${flat.slice(index + length, end)}${end < flat.length ? "…" : ""}`,
  };
}

export const mockSearch: SearchService = {
  search: (projectId, query) =>
    simulate("search.query", () => {
      const needle = query.trim().toLocaleLowerCase();
      if (!needle) return [];
      const db = getDb();
      const hits: Array<SearchHit & { score: number }> = [];
      for (const node of activeFiles(db, projectId)) {
        if (!isDocumentNode(node)) continue;
        const body = (db.documents[node.id]?.bodyMd ?? "").replace(/\s+/g, " ");
        const titleIndex = node.title.toLocaleLowerCase().indexOf(needle);
        const bodyIndex = body.toLocaleLowerCase().indexOf(needle);
        if (titleIndex < 0 && bodyIndex < 0) continue;
        hits.push({
          fileId: node.id,
          title: node.title,
          docType: node.docType,
          path: pathOf(db, node),
          snippet:
            bodyIndex >= 0 ? snippetOf(body, bodyIndex, needle.length) : null,
          updatedAt: node.updatedAt,
          score: (titleIndex >= 0 ? 2 : 0) + (bodyIndex >= 0 ? 1 : 0),
        });
      }
      return hits
        .sort(
          (a, b) => b.score - a.score || b.updatedAt.localeCompare(a.updatedAt),
        )
        .map(({ score, ...hit }) => {
          void score;
          return hit;
        });
    }),
};
