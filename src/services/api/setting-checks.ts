import { isDocumentType, type DocumentType } from "@/domain/document-types";
import type {
  SettingCheckFinding,
  SettingCheckRun,
  SettingCheckRunDetail,
  SettingCheckStage,
  SettingCheckStatus,
  SettingCheckVerdict,
} from "@/domain/setting-check";

import type { SettingCheckService } from "../ports";

import type { ApiClient } from "./http";
import { query } from "./http";

interface ApiRun {
  id: string;
  project_id: string;
  document_id: string;
  document_title: string;
  revision_no: number;
  status: SettingCheckStatus;
  stage: SettingCheckStage | null;
  created_at: string;
  finished_at: string | null;
  read: {
    manuscripts: number;
    from_ordinal: number | null;
    to_ordinal: number | null;
    settings: number;
    core_facts: number;
  };
  counts: { open: number; intended: number; not_conflict: number };
  failure_code: string | null;
}

interface ApiFinding {
  id: string;
  kind: SettingCheckFinding["kind"];
  core: boolean;
  confidence: SettingCheckFinding["confidence"];
  summary: string;
  direction: string;
  quote: string;
  source: {
    document_id: string;
    title: string;
    doc_type: string;
    ordinal: number | null;
    quote: string;
  };
  verdict: SettingCheckVerdict | null;
  reason: string | null;
}

interface ApiRunDetail extends ApiRun {
  findings: ApiFinding[];
}

function toRun(api: ApiRun): SettingCheckRun {
  return {
    id: api.id,
    projectId: api.project_id,
    documentId: api.document_id,
    documentTitle: api.document_title,
    revisionNo: api.revision_no,
    status: api.status,
    stage: api.stage ?? null,
    createdAt: api.created_at,
    finishedAt: api.finished_at,
    read: {
      manuscripts: api.read.manuscripts,
      fromOrdinal: api.read.from_ordinal,
      toOrdinal: api.read.to_ordinal,
      settings: api.read.settings,
      coreFacts: api.read.core_facts,
    },
    counts: {
      open: api.counts.open,
      intended: api.counts.intended,
      notConflict: api.counts.not_conflict,
    },
    failureCode: api.failure_code,
  };
}

function sourceType(api: ApiFinding): DocumentType {
  return isDocumentType(api.source.doc_type)
    ? api.source.doc_type
    : "manuscript";
}

function toFinding(api: ApiFinding): SettingCheckFinding {
  return {
    id: api.id,
    kind: api.kind,
    core: api.core,
    confidence: api.confidence,
    summary: api.summary,
    direction: api.direction,
    quote: api.quote,
    source: {
      documentId: api.source.document_id,
      title: api.source.title,
      docType: sourceType(api),
      ordinal: api.source.ordinal,
      quote: api.source.quote,
    },
    verdict: api.verdict,
    reason: api.reason,
  };
}

function toDetail(api: ApiRunDetail): SettingCheckRunDetail {
  return { ...toRun(api), findings: (api.findings ?? []).map(toFinding) };
}

export function createApiSettingChecks(client: ApiClient): SettingCheckService {
  return {
    summary: async (projectId) => {
      const body = await client.request<{
        running: ApiRun | null;
        chapters: Array<{ document_id: string; latest: ApiRun }>;
      }>(`/projects/${projectId}/setting-checks/summary`, {
        operation: "settingChecks.summary",
      });
      return {
        running: body.running ? toRun(body.running) : null,
        chapters: body.chapters.map((chapter) => ({
          documentId: chapter.document_id,
          latest: toRun(chapter.latest),
        })),
      };
    },

    runs: async (projectId, documentId) =>
      (
        await client.request<{ runs: ApiRun[] }>(
          `/projects/${projectId}/setting-checks${query({ document_id: documentId })}`,
          { operation: "settingChecks.runs" },
        )
      ).runs.map(toRun),

    run: async (runId) =>
      toDetail(
        await client.request<ApiRunDetail>(`/setting-checks/${runId}`, {
          operation: "settingChecks.run",
        }),
      ),

    start: async (projectId, documentId) =>
      toRun(
        await client.request<ApiRun>(`/projects/${projectId}/setting-checks`, {
          method: "POST",
          body: { document_id: documentId },
          operation: "settingChecks.start",
        }),
      ),

    cancel: (runId) =>
      client.request<void>(`/setting-checks/${runId}/cancel`, {
        method: "POST",
        operation: "settingChecks.cancel",
      }),

    setVerdict: async (findingId, verdict, reason) =>
      toFinding(
        await client.request<ApiFinding>(
          `/setting-check-findings/${findingId}/verdict`,
          {
            method: "PUT",
            body: { verdict, reason },
            operation: "settingChecks.setVerdict",
          },
        ),
      ),

    clearVerdict: async (findingId) =>
      toFinding(
        await client.request<ApiFinding>(
          `/setting-check-findings/${findingId}/verdict`,
          { method: "DELETE", operation: "settingChecks.clearVerdict" },
        ),
      ),
  };
}
