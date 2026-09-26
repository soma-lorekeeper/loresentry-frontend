import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import type { FileNode, TrashEntry } from "@/domain/models";

import { ServiceError } from "../errors";
import type { CreateFileInput, FileService } from "../ports";

import type { FavoriteStore } from "./favorites";
import type { ApiClient } from "./http";
import {
  categoryNodeId,
  documentTypeOf,
  folderCodeOf,
  folderCodeOfNodeId,
} from "./mapping";

interface ApiFolder {
  code: string;
  name: string;
  position: number;
}

interface ApiEpisode {
  id: string;
  name: string;
  rank: string;
}

interface ApiDocument {
  id: string;
  title: string;
  folder_code: string;
  episode_id: string | null;
  rank: string;
  locked: boolean;
  char_count: number;
  revision_no: number;
  trashed_at: string | null;
  updated_at: string;
}

interface ApiTree {
  folders: ApiFolder[];
  episodes: ApiEpisode[];
  documents: ApiDocument[];
}

interface ApiTrashEntry {
  id: string;
  title: string;
  folder_code: string;
  episode_name: string | null;
  trashed_at: string;
}

/**
 * 서버는 정규화된 세 목록을 주고, **트리는 여기서 조립한다**(`CONTENT_PROJECT_API.md` §3.2).
 * 분류 폴더는 서버에 행이 없으므로 그 노드 id 는 이 함수가 만든 값이고, 요청으로 돌아갈 때
 * `folderCodeOfNodeId` 가 다시 코드로 바꾼다.
 */
function toFileNodes(projectId: string, tree: ApiTree): FileNode[] {
  const nodes: FileNode[] = [];

  for (const folder of tree.folders) {
    const category = documentTypeOf(folder.code);
    nodes.push({
      kind: "folder",
      id: categoryNodeId(folder.code),
      projectId,
      parentId: null,
      title: DOCUMENT_TYPE_META[category].label,
      role: "category",
      category,
      rank: String(folder.position).padStart(6, "0"),
      trashedAt: null,
    });
  }

  for (const episode of tree.episodes) {
    nodes.push({
      kind: "folder",
      id: episode.id,
      projectId,
      parentId: categoryNodeId("MANUSCRIPT"),
      title: episode.name,
      role: "episode",
      category: "manuscript",
      rank: episode.rank,
      trashedAt: null,
    });
  }

  for (const document of tree.documents) {
    nodes.push(toDocumentNode(projectId, document));
  }

  return nodes;
}

function toDocumentNode(projectId: string, document: ApiDocument): FileNode {
  return {
    kind: "document",
    id: document.id,
    projectId,
    parentId: document.episode_id ?? categoryNodeId(document.folder_code),
    title: document.title,
    docType: documentTypeOf(document.folder_code),
    rank: document.rank,
    trashedAt: document.trashed_at,
    locked: document.locked,
    revisionNo: document.revision_no,
    updatedAt: document.updated_at,
  };
}

function toEpisodeNode(projectId: string, episode: ApiEpisode): FileNode {
  return {
    kind: "folder",
    id: episode.id,
    projectId,
    parentId: categoryNodeId("MANUSCRIPT"),
    title: episode.name,
    role: "episode",
    category: "manuscript",
    rank: episode.rank,
    trashedAt: null,
  };
}

/**
 * 서버에 테이블이 없다. mock 으로 조용히 되돌리면 새로 고침에 사라지는 자료가 생긴다.
 *
 * <p>포트는 거부된 프로미스를 약속한다. 동기로 던지면 화면이 `catch` 로 받지 못해 그대로 깨진다.
 * 그래서 async 함수 안에서만 이 함수를 쓰고, 아닌 곳에서는 {@link unsupportedPromise} 를 쓴다.
 */
function unsupported(what: string): never {
  throw unsupportedError(what);
}

function unsupportedError(what: string): ServiceError {
  return new ServiceError(
    "validation",
    `${what}는 아직 서버에 저장할 수 없어요.`,
  );
}

function unsupportedPromise<T>(what: string): Promise<T> {
  return Promise.reject(unsupportedError(what));
}

/**
 * 어느 프로젝트의 노드인지 알아야 응답을 트리 노드로 만들 수 있다. 서버 응답에는 project_id 가
 * 없는 엔드포인트도 있으므로, 화면이 이미 아는 값을 캐시해 둔다.
 */
export function createApiFiles(
  client: ApiClient,
  favorites: FavoriteStore,
): FileService {
  const projectOfFile = new Map<string, string>();
  // 에피소드와 문서는 경로가 다르다(`/episodes/{id}` 대 `/files/{id}`). 트리를 읽을 때 구분해 둔다.
  const episodeIds = new Set<string>();

  const remember = (projectId: string, nodes: FileNode[]) => {
    for (const node of nodes) {
      projectOfFile.set(node.id, projectId);
      if (node.kind === "folder" && node.role === "episode")
        episodeIds.add(node.id);
    }
    return nodes;
  };

  const projectOf = (fileId: string) => {
    const projectId = projectOfFile.get(fileId);
    if (!projectId) {
      // 트리를 한 번도 읽지 않은 파일이다. 화면 흐름상 일어나지 않지만, 조용히 틀린 트리를
      // 만드는 것보다 실패하는 편이 낫다.
      throw new ServiceError("not-found", "파일을 찾을 수 없어요.");
    }
    return projectId;
  };

  return {
    tree: async (projectId) => {
      const tree = await client.request<ApiTree>(
        `/projects/${projectId}/files`,
        {
          operation: "files.tree",
        },
      );
      return remember(projectId, toFileNodes(projectId, tree));
    },

    listTrash: async (projectId): Promise<TrashEntry[]> => {
      const body = await client.request<{ files: ApiTrashEntry[] }>(
        `/projects/${projectId}/files/trash`,
        { operation: "files.listTrash" },
      );
      return body.files.map((entry) => {
        const docType = documentTypeOf(entry.folder_code);
        const path = [DOCUMENT_TYPE_META[docType].label];
        if (entry.episode_name) path.push(entry.episode_name);
        return {
          node: {
            kind: "document",
            id: entry.id,
            projectId,
            parentId: null,
            title: entry.title,
            docType,
            rank: "",
            trashedAt: entry.trashed_at,
            locked: false,
            revisionNo: 0,
            updatedAt: entry.trashed_at,
          },
          originalPath: path,
          // 문서는 자식을 갖지 않는다. 폴더를 휴지통에 넣을 수 없으므로 언제나 0 이다.
          childCount: 0,
        };
      });
    },

    create: async (input: CreateFileInput) => {
      const { projectId, parentId, kind, title, docType } = input;

      if (kind === "folder") {
        // 사용자가 만들 수 있는 폴더는 에피소드뿐이다(요구사항 §4.1). 원고 분류 아래가 아니면 거절한다.
        if (folderCodeOfNodeId(parentId) !== "MANUSCRIPT") {
          unsupported("이 위치의 폴더");
        }
        const episode = await client.request<ApiEpisode>(
          `/projects/${projectId}/files`,
          {
            method: "POST",
            body: { kind: "episode", title },
            operation: "files.create",
          },
        );
        projectOfFile.set(episode.id, projectId);
        episodeIds.add(episode.id);
        return toEpisodeNode(projectId, episode);
      }

      const target = resolveTarget(parentId, docType);
      const document = await client.request<ApiDocument>(
        `/projects/${projectId}/files`,
        {
          method: "POST",
          body: { kind: "document", title, ...target },
          operation: "files.create",
        },
      );
      projectOfFile.set(document.id, projectId);
      return toDocumentNode(projectId, document);
    },

    rename: async (fileId, title) => {
      const projectId = projectOf(fileId);
      if (episodeIds.has(fileId)) {
        const episode = await client.request<ApiEpisode>(
          `/episodes/${fileId}`,
          {
            method: "PATCH",
            body: { title },
            operation: "files.rename",
          },
        );
        return toEpisodeNode(projectId, episode);
      }
      const document = await client.request<ApiDocument>(`/files/${fileId}`, {
        method: "PATCH",
        body: { title },
        operation: "files.rename",
      });
      return toDocumentNode(projectId, document);
    },

    move: async (fileId, parentId, beforeId) => {
      const projectId = projectOf(fileId);
      if (episodeIds.has(fileId)) unsupported("에피소드 순서 바꾸기");

      const document = await client.request<ApiDocument>(
        `/files/${fileId}/position`,
        {
          method: "PATCH",
          body: {
            ...resolveTarget(parentId, undefined),
            before_file_id: beforeId,
          },
          operation: "files.move",
        },
      );
      return toDocumentNode(projectId, document);
    },

    moveToTrash: (fileId) =>
      client.request<void>(`/files/${fileId}/trash`, {
        method: "POST",
        operation: "files.trash",
      }),

    restore: async (fileId) => {
      const projectId = projectOf(fileId);
      const document = await client.request<ApiDocument>(
        `/files/${fileId}/restore`,
        {
          method: "POST",
          operation: "files.restore",
        },
      );
      return toDocumentNode(projectId, document);
    },

    deletePermanently: (fileId) =>
      client.request<void>(`/files/${fileId}`, {
        method: "DELETE",
        operation: "files.delete",
      }),

    favorites: (projectId) => favorites.read(projectId),
    setFavorite: (projectId, fileId, favorite) =>
      favorites.write(projectId, fileId, favorite),

    // 사용자 섹션은 폴더 모델 결정이 끝나지 않아 서버에 없다(§9-1).
    createSection: () => unsupportedPromise("사용자 섹션"),
    deleteSection: () => unsupportedPromise("사용자 섹션"),

    deleteEpisode: async (episodeId) => {
      await client.request<void>(`/episodes/${episodeId}`, {
        method: "DELETE",
        operation: "files.deleteEpisode",
      });
      episodeIds.delete(episodeId);
    },
  };

  function resolveTarget(
    parentId: string | null,
    docType: DocumentType | undefined,
  ) {
    const folderCode = folderCodeOfNodeId(parentId);
    if (folderCode) return { folder_code: folderCode, episode_id: null };

    // 분류 노드가 아니면 에피소드 안이다. 에피소드는 원고에만 있다.
    if (parentId && episodeIds.has(parentId)) {
      return { folder_code: "MANUSCRIPT", episode_id: parentId };
    }
    if (docType)
      return { folder_code: folderCodeOf(docType), episode_id: null };
    unsupported("이 위치");
  }
}
