import { BODY_SCHEMA_VERSION } from "@/domain/document-body";
import type {
  DocumentDraft,
  RefreshProposal,
  RefreshRun,
  RefreshRunStatus,
} from "@/domain/models";
import { t } from "@/i18n";

import { ServiceError } from "../errors";
import {
  RefreshConfirmError,
  RefreshDraftConflict,
  type RefreshService,
  type SavedRefreshDraft,
} from "../ports";

import { toBody, type ApiBody } from "./documents";
import { toServiceError } from "./errors";
import type { ApiClient } from "./http";
import {
  documentTypeOf,
  fromProperties,
  toProperties,
  type ApiTextProperty,
} from "./mapping";

/**
 * 그래프 최신화 API(content 가 갖고 BFF 가 그대로 중계한다).
 *
 * <p>흐름은 요청 → 결과 기다리기(폴링) → 검토 작업본 자동 저장 → 확정이다. 상태는 모두 서버에 있어서
 * 다른 브라우저나 새로 로그인한 곳에서도 이어서 볼 수 있다.
 */

interface ApiRunSummary {
  request_id: string;
  /** GENERATING(결과 대기) · READY(검토 중) · NO_CHANGE · FAILED · APPLIED */
  status: string;
  started_at: string;
  ready_at: string | null;
  completed_at: string | null;
  error: { code: string; message: string | null } | null;
  draft_counts: { total: number; matched: number; new: number };
}

/** 작업본 한 쪽의 관계. 대상은 기존 문서이거나 이번 최신화가 제안한 새 문서(후보) 둘 중 하나다 */
interface ApiDraftRelation {
  relation_key: string;
  target_document_id: string | null;
  target_candidate_id: string | null;
  description: string;
}

interface ApiDraftSnapshot {
  title: string;
  body: ApiBody | null;
  legacy_body_md: string | null;
  properties: ApiTextProperty[];
  relations: ApiDraftRelation[];
}

interface ApiDraft {
  id: string;
  kind: "EDIT" | "NEW";
  draft_revision: number;
  matched: boolean;
  document: { id: string; title: string; folder_code: string } | null;
  candidate: { candidate_id: string; folder_code: string; name: string } | null;
  base_mismatch: boolean;
  left_snapshot: ApiDraftSnapshot | null;
  right_snapshot: ApiDraftSnapshot | null;
}

interface ApiRunDetail extends ApiRunSummary {
  drafts: ApiDraft[];
}

interface ApiStarted {
  request_id: string | null;
  status: "GENERATING" | "NO_CHANGES";
  files: { file_id: string; revision_no: number }[];
}

interface ApiSavedDraft {
  draft_revision: number;
  matched: boolean;
  left_snapshot: ApiDraftSnapshot | null;
  right_snapshot: ApiDraftSnapshot | null;
}

/** 서버의 새 문서 후보 id 는 이렇게 시작한다. 화면은 이 id 를 그대로 관계 대상으로 쓴다 */
const CANDIDATE_PREFIX = "new:";

const NO_DRAFTS = { total: 0, matched: 0, created: 0 };

function idle(projectId: string): RefreshRun {
  return {
    id: `run-idle-${projectId}`,
    projectId,
    status: "IDLE",
    startedAt: null,
    readyAt: null,
    completedAt: null,
    error: null,
    counts: NO_DRAFTS,
  };
}

/** 서버의 GENERATING 이 화면의 RUNNING 이다. 나머지 이름은 같다 */
function statusOf(status: string): RefreshRunStatus {
  if (
    status === "READY" ||
    status === "NO_CHANGE" ||
    status === "FAILED" ||
    status === "APPLIED"
  )
    return status;
  return "RUNNING";
}

function toRun(projectId: string, api: ApiRunSummary): RefreshRun {
  return {
    id: api.request_id,
    projectId,
    status: statusOf(api.status),
    startedAt: api.started_at,
    readyAt: api.ready_at,
    completedAt: api.completed_at,
    error: api.error,
    counts: {
      total: api.draft_counts.total,
      matched: api.draft_counts.matched,
      created: api.draft_counts.new,
    },
  };
}

export function createApiRefresh(client: ApiClient): RefreshService {
  /**
   * 화면 모델 → 서버가 준 원래 스냅샷. 화면 모델로 바꿨다가 되돌리면 본문 JSON 의 사소한 모양이 달라질
   * 수 있다. 그러면 사용자가 손대지 않은 쪽도 "바뀐 문서"가 되어 확정 때 새 revision 이 생긴다. 그래서
   * 읽은 그대로인 쪽은 원래 스냅샷을 돌려보낸다. 검토를 다시 읽을 때마다 새로 채운다.
   */
  const originals = new Map<string, ApiDraftSnapshot>();

  const toDraft = (snapshot: ApiDraftSnapshot | null): DocumentDraft | null => {
    if (!snapshot) return null;
    const draft: DocumentDraft = {
      title: snapshot.title,
      body: toBody(snapshot.body, snapshot.legacy_body_md),
      // 후보를 가리키는 관계도 화면에서는 다른 관계와 같다 — 대상 id 자리에 후보 id 를 둔다.
      properties: toProperties(
        snapshot.properties,
        snapshot.relations.map((relation) => ({
          relation_key: relation.relation_key,
          target_document_id:
            relation.target_document_id ?? relation.target_candidate_id ?? "",
          description: relation.description,
        })),
      ),
    };
    originals.set(JSON.stringify(draft), snapshot);
    return draft;
  };

  const toSnapshot = (draft: DocumentDraft | null): ApiDraftSnapshot | null => {
    if (!draft) return null;
    const original = originals.get(JSON.stringify(draft));
    if (original) return original;
    const { properties, relations } = fromProperties(draft.properties);
    return {
      title: draft.title,
      body: { schema_version: BODY_SCHEMA_VERSION, doc: draft.body.doc },
      legacy_body_md: null,
      properties,
      relations: relations.map((relation) => {
        const candidate =
          relation.target_document_id.startsWith(CANDIDATE_PREFIX);
        return {
          relation_key: relation.relation_key,
          target_document_id: candidate ? null : relation.target_document_id,
          target_candidate_id: candidate ? relation.target_document_id : null,
          description: relation.description ?? "",
        };
      }),
    };
  };

  const toSaved = (api: ApiSavedDraft): SavedRefreshDraft => ({
    draftRevision: api.draft_revision,
    matched: api.matched,
    current: toDraft(api.left_snapshot),
    proposed: toDraft(api.right_snapshot),
  });

  const toProposal = (draft: ApiDraft): RefreshProposal => {
    const folderCode =
      draft.document?.folder_code ?? draft.candidate?.folder_code ?? "";
    return {
      id: draft.id,
      kind: draft.kind === "NEW" ? "added" : "modified",
      fileId: draft.document?.id ?? draft.candidate?.candidate_id ?? draft.id,
      title:
        draft.document?.title ??
        draft.right_snapshot?.title ??
        draft.candidate?.name ??
        "",
      docType: documentTypeOf(folderCode),
      draftRevision: draft.draft_revision,
      matched: draft.matched,
      baseMismatch: draft.base_mismatch,
      current: toDraft(draft.left_snapshot),
      proposed: toDraft(draft.right_snapshot),
    };
  };

  return {
    latest: async (projectId) => {
      const result = await client.requestAllowing<ApiRunSummary>(
        `/projects/${projectId}/graph-refresh`,
        [404],
        { operation: "refresh.latest" },
      );
      if (result.ok) return toRun(projectId, result.data);
      const code = result.failure.body?.code;
      if (code === "REFRESH_NOT_FOUND") return idle(projectId);
      if (code === "PROJECT_NOT_FOUND")
        throw toServiceError(result.failure.body, 404, "refresh.latest");
      // 경로가 없다 — 서버가 아직 최신화를 모른다. 누르면 실패할 버튼 대신 "준비 중"을 보인다.
      throw new ServiceError(
        "unavailable",
        t("이 기능은 아직 준비되지 않았어요."),
        "refresh.latest",
      );
    },

    start: async (projectId) => {
      const started = await client.request<ApiStarted>(
        `/projects/${projectId}/graph-refresh`,
        { method: "POST", operation: "refresh.start" },
      );
      if (started.status !== "GENERATING" || !started.request_id)
        return { run: null, lockedFileIds: [] };
      return {
        run: {
          ...idle(projectId),
          id: started.request_id,
          status: "RUNNING",
          startedAt: new Date().toISOString(),
        },
        lockedFileIds: started.files.map((file) => file.file_id),
      };
    },

    review: async (projectId, runId) => {
      const detail = await client.request<ApiRunDetail>(
        `/projects/${projectId}/graph-refresh/${runId}`,
        { operation: "refresh.review" },
      );
      originals.clear();
      return {
        ...toRun(projectId, detail),
        proposals: detail.drafts.map(toProposal),
      };
    },

    saveDraft: async (projectId, runId, draftId, input) => {
      const result = await client.requestAllowing<ApiSavedDraft>(
        `/projects/${projectId}/graph-refresh/${runId}/drafts/${draftId}`,
        [409],
        {
          method: "PATCH",
          body: {
            draft_revision: input.draftRevision,
            left_snapshot: toSnapshot(input.current),
            right_snapshot: toSnapshot(input.proposed),
          },
          operation: "refresh.saveDraft",
        },
      );
      if (result.ok) return toSaved(result.data);
      const body = result.failure.body;
      if (body?.code === "REFRESH_DRAFT_CONFLICT" && body.current)
        throw new RefreshDraftConflict(toSaved(body.current as ApiSavedDraft));
      throw toServiceError(body, 409, "refresh.saveDraft");
    },

    confirm: async (projectId, runId) => {
      const result = await client.requestAllowing<unknown>(
        `/projects/${projectId}/graph-refresh/${runId}/confirm`,
        [409],
        { method: "POST", operation: "refresh.confirm" },
      );
      if (result.ok) return;
      const body = result.failure.body;
      switch (body?.code) {
        case "REFRESH_DRAFTS_UNMATCHED":
          throw new RefreshConfirmError(body.code, body.drafts ?? [], []);
        case "REFRESH_DOCUMENTS_CHANGED":
          throw new RefreshConfirmError(
            body.code,
            (body.documents ?? []).map((document) => document.draft_id),
            [],
          );
        case "REFRESH_DRAFTS_INVALID":
          throw new RefreshConfirmError(
            body.code,
            [],
            (body.problems ?? []).map((problem) => ({
              code: problem.code,
              target: problem.target,
              draftId: problem.draft_id,
              one: problem.one,
              other: problem.other,
            })),
          );
        default:
          throw toServiceError(body, 409, "refresh.confirm");
      }
    },
  };
}
