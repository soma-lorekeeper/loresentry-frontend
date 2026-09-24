import type { Project, ProjectSettings } from "@/domain/models";

import type { ProjectService } from "../ports";

import type { ApiClient } from "./http";
import { projectIconOf } from "./mapping";

/** 서버 표현. 필드 이름은 snake case 다(authentication 서비스와 같은 규약). */
interface ApiProject {
  id: string;
  name: string;
  description: string;
  last_worked_at: string;
  trashed_at: string | null;
  created_at: string;
  last_file: { id: string; title: string } | null;
}

/**
 * 서버는 `name`, 화면 모델은 `title` 이다. 용어가 갈리는 지점은 이 파일 한 곳이고
 * (`CONTENT_PROJECT_API.md` §9-1), 화면 코드는 서버 이름을 모른다.
 */
function toProject(api: ApiProject): Project {
  return {
    id: api.id,
    title: api.name,
    description: api.description,
    icon: projectIconOf(api.id),
    createdAt: api.created_at,
    lastWorkedAt: api.last_worked_at,
    // 서버가 아직 채우지 않는다. 문서 CRUD 가 붙으면 값이 오고 이 어댑터는 바뀌지 않는다.
    lastFile: api.last_file,
    trashedAt: api.trashed_at,
  };
}

export function createApiProjects(client: ApiClient): ProjectService {
  const list = async (path: string, operation: string) => {
    const body = await client.request<{ projects: ApiProject[] }>(path, {
      operation,
    });
    return body.projects.map(toProject);
  };

  return {
    list: () => list("/projects", "projects.list"),
    listTrash: () => list("/projects/trash", "projects.listTrash"),

    get: async (projectId) =>
      toProject(
        await client.request<ApiProject>(`/projects/${projectId}`, {
          operation: "projects.get",
        }),
      ),

    create: async ({ title, description }) =>
      toProject(
        await client.request<ApiProject>("/projects", {
          method: "POST",
          body: { name: title, description },
          operation: "projects.create",
        }),
      ),

    rename: async (projectId, title) =>
      toProject(
        await client.request<ApiProject>(`/projects/${projectId}`, {
          method: "PATCH",
          body: { name: title },
          operation: "projects.rename",
        }),
      ),

    moveToTrash: (projectId) =>
      client.request<void>(`/projects/${projectId}/trash`, {
        method: "POST",
        operation: "projects.trash",
      }),

    restore: async (projectId) =>
      toProject(
        await client.request<ApiProject>(`/projects/${projectId}/restore`, {
          method: "POST",
          operation: "projects.restore",
        }),
      ),

    deletePermanently: (projectId) =>
      client.request<void>(`/projects/${projectId}`, {
        method: "DELETE",
        operation: "projects.delete",
      }),

    // 설정은 프로젝트의 부분집합이라 전용 엔드포인트가 없다. 같은 데이터에 원천이 둘이 되지 않는다.
    getSettings: async (projectId): Promise<ProjectSettings> => {
      const project = await client.request<ApiProject>(
        `/projects/${projectId}`,
        {
          operation: "projects.settings",
        },
      );
      return { title: project.name, description: project.description };
    },

    saveSettings: async (projectId, settings) =>
      toProject(
        await client.request<ApiProject>(`/projects/${projectId}`, {
          method: "PATCH",
          body: { name: settings.title, description: settings.description },
          operation: "projects.saveSettings",
        }),
      ),
  };
}
