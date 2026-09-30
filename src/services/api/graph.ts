import type { ProjectGraph } from "@/domain/models";

import type { GraphService } from "../ports";

import type { ApiClient } from "./http";
import { documentTypeOf } from "./mapping";

interface ApiNode {
  id: string;
  title: string;
  folder_code: string;
  description: string;
}

interface ApiEdge {
  id: string;
  source: string;
  target: string;
  relation_key: string;
  description: string;
}

interface ApiEpisode {
  id: string;
  name: string;
  document_ids: string[];
}

interface ApiGraph {
  nodes: ApiNode[];
  edges: ApiEdge[];
  episodes: ApiEpisode[];
}

/**
 * 관계도와 타임라인이 쓰는 투영본.
 *
 * <p>graph-rag 가 아니라 **content 의 RDB** 에서 온다. 사용자가 직접 이어 놓은 관계는 문서·속성·
 * 관계 세 표에 이미 있고 한 홉이라, AI 관계를 기다릴 이유가 없었다. 실제로 기다리는 동안 타임라인이
 * 전혀 열리지 않았다(`CONTENT_PROJECT_API.md` §0.17).
 */
export function createApiGraph(client: ApiClient): GraphService {
  return {
    getProjectGraph: async (projectId): Promise<ProjectGraph> => {
      const body = await client.request<ApiGraph>(
        `/projects/${projectId}/graph`,
        { operation: "graph.get" },
      );
      return {
        nodes: body.nodes.map((node) => ({
          id: node.id,
          title: node.title,
          docType: documentTypeOf(node.folder_code),
          description: node.description,
        })),
        edges: body.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          key: edge.relation_key,
        })),
        episodes: body.episodes.map((episode) => ({
          id: episode.id,
          title: episode.name,
          chapterIds: episode.document_ids,
        })),
      };
    },
  };
}
