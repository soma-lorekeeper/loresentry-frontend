import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { SearchHit } from "@/domain/models";

import type { SearchService } from "../ports";

import type { ApiClient } from "./http";
import { documentTypeOf } from "./mapping";
import { query } from "./http";

interface ApiHit {
  file_id: string;
  title: string;
  folder_code: string;
  episode_name: string | null;
  snippet: { before: string; match: string; after: string } | null;
  updated_at: string;
}

export function createApiSearch(client: ApiClient): SearchService {
  return {
    search: async (projectId, text): Promise<SearchHit[]> => {
      const body = await client.request<{ hits: ApiHit[] }>(
        `/projects/${projectId}/search${query({ q: text })}`,
        { operation: "search.query" },
      );

      return body.hits.map((hit) => {
        const docType = documentTypeOf(hit.folder_code);
        const path = [DOCUMENT_TYPE_META[docType].label];
        if (hit.episode_name) path.push(hit.episode_name);
        return {
          fileId: hit.file_id,
          title: hit.title,
          docType,
          path,
          snippet: hit.snippet,
          updatedAt: hit.updated_at,
        };
      });
    },
  };
}
