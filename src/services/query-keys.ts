import type { QueryClient } from "@tanstack/react-query";

import type { MemoScope } from "@/domain/models";

export const queryKeys = {
  session: ["session"] as const,
  account: ["account"] as const,
  projects: ["projects"] as const,
  projectTrash: ["projects", "trash"] as const,
  project: (projectId: string) => ["project", projectId] as const,
  projectSettings: (projectId: string) =>
    ["project", projectId, "settings"] as const,
  files: (projectId: string) => ["files", projectId] as const,
  tree: (projectId: string) => ["files", projectId, "tree"] as const,
  favorites: (projectId: string) => ["files", projectId, "favorites"] as const,
  sections: (projectId: string) => ["files", projectId, "sections"] as const,
  trash: (projectId: string) => ["files", projectId, "trash"] as const,
  document: (fileId: string) => ["document", fileId] as const,
  versions: (fileId: string) => ["versions", fileId] as const,
  memos: (projectId: string, scope: MemoScope, fileId: string | null) =>
    ["memos", projectId, scope, fileId] as const,
  search: (projectId: string, query: string) =>
    ["search", projectId, query] as const,
  graph: (projectId: string) => ["graph", projectId] as const,
  refresh: (projectId: string) => ["refresh", projectId] as const,
  chatSessions: (projectId: string) => ["chat", projectId] as const,
  guides: ["help", "guides"] as const,
  chatMessages: (sessionId: string) => ["chat", "messages", sessionId] as const,
};

export async function invalidateProjectContent(
  queryClient: QueryClient,
  projectId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.files(projectId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.graph(projectId) }),
    queryClient.invalidateQueries({ queryKey: ["search", projectId] }),
    queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
  ]);
}
