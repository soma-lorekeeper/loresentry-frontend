export const APP_ROUTES = {
  login: "/login",
  projectGuide: "/projects/guide",
  projectList: "/projects",
  projectTrash: "/projects/trash",
  serviceEntry: "/",
  workspace: "/workspace",
} as const;

export function resolveWorkspaceProjectId(projectId: string | null) {
  const normalized = projectId?.trim();
  return normalized ? normalized : null;
}

export function createWorkspaceRoute(projectId: string) {
  const verifiedProjectId = resolveWorkspaceProjectId(projectId);
  if (!verifiedProjectId) {
    throw new Error("검증된 프로젝트 ID가 필요합니다.");
  }
  const params = new URLSearchParams({ projectId: verifiedProjectId });
  return `${APP_ROUTES.workspace}?${params.toString()}`;
}
