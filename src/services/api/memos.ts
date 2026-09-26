import type { Memo, MemoScope } from "@/domain/models";

import type { MemoService } from "../ports";

import type { ApiClient } from "./http";
import { query } from "./http";

interface ApiMemo {
  id: string;
  project_id: string;
  scope: "project" | "file";
  document_id: string | null;
  title: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

/** 서버는 제목을 비워 둘 수 있다. 화면 모델은 문자열이므로 여기서 메운다. */
function toMemo(api: ApiMemo): Memo {
  return {
    id: api.id,
    projectId: api.project_id,
    scope: api.scope,
    fileId: api.document_id,
    title: api.title ?? "",
    body: api.body,
    updatedAt: api.updated_at,
  };
}

export function createApiMemos(client: ApiClient): MemoService {
  return {
    list: async (projectId, scope: MemoScope, fileId) => {
      // scope=file 이면 서버가 document_id 를 요구한다. 없으면 무엇을 달라는지 알 수 없다.
      const body = await client.request<{ memos: ApiMemo[] }>(
        `/projects/${projectId}/memos${query({
          scope,
          document_id: scope === "file" ? (fileId ?? undefined) : undefined,
        })}`,
        { operation: "memos.list" },
      );
      return body.memos.map(toMemo);
    },

    create: async ({ projectId, scope, fileId, body }) =>
      toMemo(
        await client.request<ApiMemo>(`/projects/${projectId}/memos`, {
          method: "POST",
          body: {
            scope,
            document_id: scope === "file" ? fileId : null,
            body,
          },
          operation: "memos.create",
        }),
      ),

    update: async (memoId, body) =>
      toMemo(
        await client.request<ApiMemo>(`/memos/${memoId}`, {
          method: "PATCH",
          body: { body },
          operation: "memos.update",
        }),
      ),

    remove: (memoId) =>
      client.request<void>(`/memos/${memoId}`, {
        method: "DELETE",
        operation: "memos.remove",
      }),
  };
}
