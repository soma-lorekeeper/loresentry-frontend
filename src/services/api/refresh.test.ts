import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { bodyToPlainText } from "@/domain/document-body";

import { isServiceError } from "../errors";
import { RefreshConfirmError, RefreshDraftConflict } from "../ports";

import { ApiClient } from "./http";
import { createApiRefresh } from "./refresh";

const BASE = "https://api.test";

interface Call {
  url: string;
  method: string;
  body: unknown;
}

let calls: Call[];
let responses: Array<{ status: number; body?: unknown }>;

function reply(status: number, body?: unknown) {
  responses.push({ status, body });
}

function failure(status: number, code: string, extra: object = {}) {
  reply(status, { code, message: "diagnostic", next_action: "NONE", ...extra });
}

beforeEach(() => {
  calls = [];
  responses = [];
  vi.stubGlobal("fetch", (input: string, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      method: init.method ?? "GET",
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    const next = responses.shift();
    if (!next)
      throw new Error(`unexpected request: ${init.method ?? "GET"} ${input}`);
    return Promise.resolve(
      new Response(next.body === undefined ? null : JSON.stringify(next.body), {
        status: next.status,
        headers:
          next.body === undefined ? {} : { "Content-Type": "application/json" },
      }),
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const refresh = () => createApiRefresh(new ApiClient(BASE));

const summary = {
  request_id: "run-1",
  status: "GENERATING",
  started_at: "2026-10-24T00:00:00Z",
  ready_at: null,
  completed_at: null,
  error: null,
  draft_counts: { total: 0, matched: 0, new: 0 },
};

const body = (text: string) => ({
  schema_version: 1,
  doc: {
    type: "doc",
    content: [{ type: "paragraph", content: [{ type: "text", text }] }],
  },
});

const harinLeft = {
  title: "하린",
  body: body("온실지기"),
  legacy_body_md: null,
  properties: [{ key: "description", value: "온실지기" }],
  relations: [],
};

const harinRight = {
  ...harinLeft,
  properties: [{ key: "description", value: "북쪽 문을 연 온실지기" }],
  relations: [
    {
      relation_key: "related_place",
      target_document_id: null,
      target_candidate_id: "new:place:ash-lighthouse",
      description: "",
    },
  ],
};

const lighthouse = {
  title: "잿빛 등대",
  body: body("해안의 등대"),
  legacy_body_md: null,
  properties: [],
  relations: [],
};

const detail = {
  ...summary,
  status: "READY",
  ready_at: "2026-10-24T00:10:00Z",
  draft_counts: { total: 2, matched: 0, new: 1 },
  drafts: [
    {
      id: "draft-harin",
      kind: "EDIT",
      draft_revision: 3,
      matched: false,
      updated_at: "2026-10-24T00:10:00Z",
      document: {
        id: "doc-harin",
        title: "하린",
        folder_code: "CHARACTER",
        revision_no: 7,
      },
      candidate: null,
      base_version_id: null,
      base_revision_no: null,
      base_snapshot: null,
      base_mismatch: true,
      left_revision_no: 7,
      left_snapshot: harinLeft,
      right_snapshot: harinRight,
    },
    {
      id: "draft-lighthouse",
      kind: "NEW",
      draft_revision: 1,
      matched: false,
      updated_at: "2026-10-24T00:10:00Z",
      document: null,
      candidate: {
        candidate_id: "new:place:ash-lighthouse",
        folder_code: "LOCATION",
        name: "잿빛 등대",
      },
      base_version_id: null,
      base_revision_no: null,
      base_snapshot: null,
      base_mismatch: false,
      left_revision_no: null,
      left_snapshot: null,
      right_snapshot: lighthouse,
    },
  ],
};

describe("graph refresh over the BFF", () => {
  it("reads the latest run and maps GENERATING to RUNNING", async () => {
    reply(200, { ...summary, draft_counts: { total: 2, matched: 1, new: 1 } });

    const run = await refresh().latest("p-1");

    expect(calls[0]).toMatchObject({
      url: `${BASE}/projects/p-1/graph-refresh`,
      method: "GET",
    });
    expect(run).toMatchObject({
      id: "run-1",
      projectId: "p-1",
      status: "RUNNING",
      counts: { total: 2, matched: 1, created: 1 },
    });
  });

  it("treats a project that never refreshed as idle", async () => {
    failure(404, "REFRESH_NOT_FOUND");
    expect(await refresh().latest("p-1")).toMatchObject({ status: "IDLE" });
  });

  it("shows refresh as not ready yet while the server lacks the route", async () => {
    failure(404, "NOT_FOUND");
    const error = await refresh()
      .latest("p-1")
      .catch((e: unknown) => e);
    expect(isServiceError(error) && error.code).toBe("unavailable");
  });

  it("starts a refresh and reports the documents it locked", async () => {
    reply(202, {
      request_id: "run-2",
      status: "GENERATING",
      files: [
        { file_id: "doc-a", revision_no: 3 },
        { file_id: "doc-b", revision_no: 1 },
      ],
    });

    const started = await refresh().start("p-1");

    expect(calls[0]).toMatchObject({
      url: `${BASE}/projects/p-1/graph-refresh`,
      method: "POST",
    });
    expect(started.run).toMatchObject({ id: "run-2", status: "RUNNING" });
    expect(started.lockedFileIds).toEqual(["doc-a", "doc-b"]);
  });

  it("starts nothing when no document changed", async () => {
    reply(200, { request_id: null, status: "NO_CHANGES", files: [] });
    expect(await refresh().start("p-1")).toEqual({
      run: null,
      lockedFileIds: [],
    });
  });

  it("maps review drafts, including proposed new documents", async () => {
    reply(200, detail);

    const review = await refresh().review("p-1", "run-1");

    expect(review.status).toBe("READY");
    const [harin, created] = review.proposals;
    expect(harin).toMatchObject({
      id: "draft-harin",
      kind: "modified",
      fileId: "doc-harin",
      docType: "character",
      draftRevision: 3,
      baseMismatch: true,
    });
    // 새 문서를 가리키는 관계는 후보 id 로 대상 칩이 된다.
    expect(harin.proposed?.properties).toContainEqual(
      expect.objectContaining({
        kind: "relation",
        targetIds: ["new:place:ash-lighthouse"],
      }),
    );
    expect(created).toMatchObject({
      kind: "added",
      fileId: "new:place:ash-lighthouse",
      title: "잿빛 등대",
      docType: "place",
      current: null,
    });
    expect(bodyToPlainText(created.proposed!.body)).toBe("해안의 등대");
  });

  it("saves untouched sides as the server sent them and splits candidate targets back out", async () => {
    const api = refresh();
    reply(200, detail);
    const [harin] = (await api.review("p-1", "run-1")).proposals;
    reply(200, {
      id: "draft-harin",
      draft_revision: 4,
      matched: true,
      updated_at: "2026-10-24T00:11:00Z",
      left_snapshot: harinRight,
      right_snapshot: harinRight,
    });

    const saved = await api.saveDraft("p-1", "run-1", "draft-harin", {
      draftRevision: 3,
      current: { ...harin.proposed!, title: "하린" },
      proposed: harin.proposed,
    });

    const sent = calls[1];
    expect(sent).toMatchObject({
      url: `${BASE}/projects/p-1/graph-refresh/run-1/drafts/draft-harin`,
      method: "PATCH",
    });
    expect(sent.body).toEqual({
      draft_revision: 3,
      left_snapshot: harinRight,
      right_snapshot: harinRight,
    });
    expect(saved).toMatchObject({ draftRevision: 4, matched: true });
  });

  it("serializes an edited side with candidate relations as candidate targets", async () => {
    const api = refresh();
    reply(200, detail);
    const [harin] = (await api.review("p-1", "run-1")).proposals;
    reply(200, {
      id: "draft-harin",
      draft_revision: 4,
      matched: false,
      updated_at: "2026-10-24T00:11:00Z",
      left_snapshot: harinLeft,
      right_snapshot: harinRight,
    });

    await api.saveDraft("p-1", "run-1", "draft-harin", {
      draftRevision: 3,
      current: harin.current,
      proposed: { ...harin.proposed!, title: "하린 (고침)" },
    });

    const right = (calls[1].body as { right_snapshot: typeof harinRight })
      .right_snapshot;
    expect(right.title).toBe("하린 (고침)");
    expect(right.legacy_body_md).toBeNull();
    expect(right.relations).toEqual([
      {
        relation_key: "related_place",
        target_document_id: null,
        target_candidate_id: "new:place:ash-lighthouse",
        description: "",
      },
    ]);
  });

  it("throws the saved draft when another tab saved first", async () => {
    failure(409, "REFRESH_DRAFT_CONFLICT", {
      current: {
        draft_revision: 5,
        matched: false,
        left_snapshot: harinLeft,
        right_snapshot: harinRight,
      },
    });

    const error = await refresh()
      .saveDraft("p-1", "run-1", "draft-harin", {
        draftRevision: 3,
        current: null,
        proposed: null,
      })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RefreshDraftConflict);
    expect((error as RefreshDraftConflict).current.draftRevision).toBe(5);
  });

  it("confirms with no body", async () => {
    reply(200, {
      request_id: "run-1",
      status: "APPLIED",
      created: [],
      updated: [],
      unchanged: [],
    });

    await refresh().confirm("p-1", "run-1");

    expect(calls[0]).toMatchObject({
      url: `${BASE}/projects/p-1/graph-refresh/run-1/confirm`,
      method: "POST",
      body: undefined,
    });
  });

  it("explains why a confirm was refused", async () => {
    failure(409, "REFRESH_DRAFTS_INVALID", {
      problems: [
        { code: "REJECTED_CANDIDATE", target: "new:place:ash-lighthouse" },
        { code: "BODY_REQUIRED", draft_id: "draft-harin" },
      ],
    });

    const error = await refresh()
      .confirm("p-1", "run-1")
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(RefreshConfirmError);
    expect((error as RefreshConfirmError).problems).toEqual([
      {
        code: "REJECTED_CANDIDATE",
        target: "new:place:ash-lighthouse",
        draftId: undefined,
        one: undefined,
        other: undefined,
      },
      {
        code: "BODY_REQUIRED",
        target: undefined,
        draftId: "draft-harin",
        one: undefined,
        other: undefined,
      },
    ]);
  });

  it("reports a review that already ended as not found", async () => {
    failure(409, "REFRESH_NOT_READY");
    const error = await refresh()
      .confirm("p-1", "run-1")
      .catch((e: unknown) => e);
    expect(isServiceError(error) && error.code).toBe("not-found");
  });
});
