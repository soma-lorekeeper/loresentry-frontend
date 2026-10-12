import { bodyToPlainText } from "@/domain/document-body";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { DocumentNode, SearchHit } from "@/domain/models";

import type { SearchService } from "../ports";

import { simulate } from "./control";
import { getDb, isDocumentNode, type MockDb } from "./db";
import { activeFiles } from "./tree";

const LIMIT = 50;
const CONTEXT = 40;

function snippetOf(body: string, needle: string) {
  const at = body.toLocaleLowerCase().indexOf(needle);
  if (at < 0) return null;
  const end = at + needle.length;
  return {
    before: body.slice(Math.max(0, at - CONTEXT), at),
    match: body.slice(at, end),
    after: body.slice(end, Math.min(body.length, end + CONTEXT)),
  };
}

function pathOf(db: MockDb, node: DocumentNode) {
  const path = [DOCUMENT_TYPE_META[node.docType].label];
  const parent = db.files.find((candidate) => candidate.id === node.parentId);
  if (parent?.kind === "folder" && parent.role === "episode") {
    path.push(parent.title);
  }
  return path;
}

export const mockSearch: SearchService = {
  search: (projectId, query) =>
    simulate("search.query", () => {
      const needle = query.trim().toLocaleLowerCase();
      if (!needle) return [];
      const db = getDb();
      const hits: Array<SearchHit & { bucket: number }> = [];
      for (const node of activeFiles(db, projectId)) {
        if (!isDocumentNode(node)) continue;
        const stored = db.documents[node.id];
        const body = stored ? bodyToPlainText(stored.body) : "";
        const title = node.title.toLocaleLowerCase();
        const snippet = snippetOf(body, needle);
        const bucket =
          title === needle ? 0 : title.includes(needle) ? 1 : snippet ? 2 : -1;
        if (bucket < 0) continue;
        hits.push({
          fileId: node.id,
          title: node.title,
          docType: node.docType,
          path: pathOf(db, node),
          snippet,
          updatedAt: node.updatedAt,
          bucket,
        });
      }
      return hits
        .sort(
          (a, b) =>
            a.bucket - b.bucket || b.updatedAt.localeCompare(a.updatedAt),
        )
        .slice(0, LIMIT)
        .map(({ bucket, ...hit }) => {
          void bucket;
          return hit;
        });
    }),
};
