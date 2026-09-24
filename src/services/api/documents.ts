import type {
  DocumentContent,
  DocumentVersion,
  VersionKind,
} from "@/domain/models";

import { ServiceError } from "../errors";
import {
  ConflictError,
  type DocumentService,
  type VersionService,
} from "../ports";

import type { ApiClient } from "./http";
import {
  documentTypeOf,
  fromProperties,
  toProperties,
  type ApiRelation,
  type ApiTextProperty,
} from "./mapping";

interface ApiContent {
  id: string;
  project_id: string;
  title: string;
  folder_code: string;
  episode_id: string | null;
  body_md: string;
  properties: ApiTextProperty[];
  relations: ApiRelation[];
  locked: boolean;
  char_count: number;
  revision_no: number;
  updated_at: string;
}

interface ApiSnapshot {
  title: string;
  body_md: string;
  properties: ApiTextProperty[];
  relations: ApiRelation[];
}

interface ApiVersion {
  id: string;
  file_id: string;
  kind: string;
  label: string | null;
  source_revision_no: number;
  created_at: string;
  snapshot: ApiSnapshot;
}

function toContent(api: ApiContent): DocumentContent {
  return {
    fileId: api.id,
    projectId: api.project_id,
    title: api.title,
    docType: documentTypeOf(api.folder_code),
    bodyMd: api.body_md,
    properties: toProperties(api.properties, api.relations),
    locked: api.locked,
    revisionNo: api.revision_no,
    updatedAt: api.updated_at,
  };
}

/**
 * 충돌 응답의 `base` 는 스냅샷이라 `DocumentContent` 가 아니다. 화면의 3-way 병합은 제목·본문·속성만
 * 보므로, 없는 값은 현재 문서에서 가져와 모양만 맞춘다.
 */
function toBaseContent(
  snapshot: ApiSnapshot | null | undefined,
  current: DocumentContent,
): DocumentContent | null {
  if (!snapshot) return null;
  return {
    ...current,
    title: snapshot.title,
    bodyMd: snapshot.body_md,
    properties: toProperties(snapshot.properties, snapshot.relations),
  };
}

const VERSION_KINDS: Record<string, VersionKind> = {
  AUTO: "AUTO",
  NAMED: "NAMED",
  RESTORE: "PRE_RESTORE",
  AI_APPLY: "AI_APPLY",
};

function toVersion(
  api: ApiVersion,
  docType: DocumentContent["docType"],
): DocumentVersion {
  return {
    id: api.id,
    fileId: api.file_id,
    // 서버의 RESTORE 는 "복원 직전 상태"다. 화면 모델의 같은 뜻 이름은 PRE_RESTORE 다.
    kind: VERSION_KINDS[api.kind] ?? "AUTO",
    label: api.label,
    createdAt: api.created_at,
    snapshot: {
      title: api.snapshot.title,
      bodyMd: api.snapshot.body_md,
      properties: toProperties(api.snapshot.properties, api.snapshot.relations),
      docType,
    },
  };
}

export function createApiDocuments(client: ApiClient): DocumentService {
  return {
    get: async (fileId) =>
      toContent(
        await client.request<ApiContent>(`/files/${fileId}/content`, {
          operation: "documents.get",
        }),
      ),

    save: async (fileId, { draft, ifMatchRevision, saveId }) => {
      const { properties, relations } = fromProperties(draft.properties);
      const result = await client.requestAllowing<ApiContent>(
        `/files/${fileId}/content`,
        [409],
        {
          method: "PUT",
          ifMatch: ifMatchRevision,
          saveId,
          body: {
            title: draft.title,
            body_md: draft.bodyMd,
            properties,
            relations,
          },
          operation: "documents.save",
        },
      );

      if (result.ok) return toContent(result.data);

      const body = result.failure.body;
      // 409 는 충돌일 수도, 잠김이나 이름 중복일 수도 있다. 코드로 갈라야 화면이 맞는 안내를 낸다.
      if (body?.code !== "DOCUMENT_CONFLICT" || !body.current) {
        throw toSaveError(body?.code);
      }
      const current = toContent(body.current as ApiContent);
      throw new ConflictError(
        current,
        toBaseContent(body.base as ApiSnapshot | null, current),
      );
    },

    setLocked: async (fileId, locked) =>
      toContent(
        await client.request<ApiContent>(`/files/${fileId}/lock`, {
          method: "PUT",
          body: { locked },
          operation: "documents.lock",
        }),
      ),

    // 서버 내보내기는 아직 없다(§"Not implemented yet"). PDF 는 화면이 인쇄로 만든다.
    export: () =>
      Promise.reject(
        new ServiceError(
          "validation",
          "이 형식의 내보내기는 아직 준비되지 않았어요.",
        ),
      ),
  };
}

function toSaveError(code: string | undefined): ServiceError {
  if (code === "DOCUMENT_LOCKED") {
    return new ServiceError(
      "locked",
      "잠긴 문서는 편집할 수 없어요.",
      "documents.save",
    );
  }
  if (code === "FILE_TITLE_TAKEN") {
    return new ServiceError(
      "duplicate",
      "같은 위치에 같은 이름이 이미 있어요.",
      "documents.save",
    );
  }
  return new ServiceError("unknown", "저장하지 못했어요.", "documents.save");
}

export function createApiVersions(
  client: ApiClient,
  documents: DocumentService,
): VersionService {
  const docTypeOf = async (fileId: string) =>
    (await documents.get(fileId)).docType;

  return {
    list: async (fileId) => {
      const docType = await docTypeOf(fileId);
      const body = await client.request<{ versions: ApiVersion[] }>(
        `/files/${fileId}/versions`,
        { operation: "versions.list" },
      );
      return body.versions.map((version) => toVersion(version, docType));
    },

    saveNamed: async (fileId) => {
      const docType = await docTypeOf(fileId);
      const version = await client.request<ApiVersion>(
        `/files/${fileId}/versions`,
        {
          method: "POST",
          body: { label: null },
          operation: "versions.saveNamed",
        },
      );
      return toVersion(version, docType);
    },

    restore: async (fileId, versionId, ifMatchRevision) => {
      const result = await client.requestAllowing<ApiContent>(
        `/files/${fileId}/versions/${versionId}/restore`,
        [409],
        {
          method: "POST",
          ifMatch: ifMatchRevision,
          operation: "versions.restore",
        },
      );
      if (result.ok) return toContent(result.data);

      const body = result.failure.body;
      if (body?.code !== "DOCUMENT_CONFLICT" || !body.current)
        throw toSaveError(body?.code);
      const current = toContent(body.current as ApiContent);
      throw new ConflictError(
        current,
        toBaseContent(body.base as ApiSnapshot | null, current),
      );
    },

    remove: (fileId, versionId) =>
      client.request<void>(`/files/${fileId}/versions/${versionId}`, {
        method: "DELETE",
        operation: "versions.remove",
      }),
  };
}
