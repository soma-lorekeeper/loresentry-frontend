import type { WorkspaceLayout } from "@/features/workspace/model/layout";

import type { WorkspaceStateService } from "../ports";

import type { ApiClient } from "./http";

/**
 * 서버는 이 JSON 을 해석하지 않고 그대로 보관한다. 처음 여는 프로젝트는 404 가 아니라
 * `layout: null` 로 답하므로, 복원할 것이 없는 상태가 오류로 보이지 않는다.
 */
export function createApiWorkspaceState(
  client: ApiClient,
): WorkspaceStateService {
  return {
    load: async (projectId) => {
      const body = await client.request<{ layout: WorkspaceLayout | null }>(
        `/projects/${projectId}/workspace-state`,
        { operation: "workspaceState.load" },
      );
      return body.layout ?? null;
    },

    save: (projectId, layout) =>
      client.request<void>(`/projects/${projectId}/workspace-state`, {
        method: "PUT",
        body: { layout },
        operation: "workspaceState.save",
      }),
  };
}
