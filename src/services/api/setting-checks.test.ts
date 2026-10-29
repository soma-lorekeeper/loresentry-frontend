import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isServiceError } from "../errors";

import { ApiClient } from "./http";
import { createApiSettingChecks } from "./setting-checks";

const BASE = "https://api.test.invalid";

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

let calls: Call[];
let replies: Array<{ status: number; body?: unknown }>;

beforeEach(() => {
  calls = [];
  replies = [];
  vi.stubGlobal("fetch", (input: string, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      method: init.method ?? "GET",
      headers: (init.headers ?? {}) as Record<string, string>,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    const next = replies.shift();
    if (!next) throw new Error(`unexpected request: ${input}`);
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

const api = () => createApiSettingChecks(new ApiClient(BASE));

const apiRun = {
  id: "run-1",
  project_id: "p-1",
  document_id: "d-12",
  document_title: "12화 · 균열의 밤",
  revision_no: 14,
  status: "DONE",
  stage: null,
  created_at: "2026-10-27T12:40:00Z",
  finished_at: "2026-10-27T12:42:00Z",
  read: {
    manuscripts: 11,
    from_ordinal: 1,
    to_ordinal: 11,
    settings: 21,
    core_facts: 6,
  },
  counts: { open: 3, intended: 1, not_conflict: 0 },
  failure_code: null,
};

const apiFinding = {
  id: "f-1",
  kind: "SETTING",
  core: true,
  confidence: "HIGH",
  summary: "북쪽 문은 낡은 열쇠로만 열리는데, 서윤이 열쇠 없이 문을 밀어요",
  direction: "12화까지 서윤이 낡은 열쇠를 손에 넣는 장면이 없어요.",
  quote: "서윤은 등불을 바닥에 내려놓고 천천히 문을 밀었다.",
  quote_focus: "천천히 문을 밀었다",
  source: {
    document_id: "d-north",
    title: "북쪽 온실",
    doc_type: "place",
    ordinal: null,
    quote: "북쪽 문은 낡은 열쇠 없이는 열리지 않는다.",
    quote_focus: null,
  },
  verdict: null,
  reason: null,
};

describe("setting check adapter", () => {
  it("reads the summary and turns snake_case into the screen's fields", async () => {
    replies.push({
      status: 200,
      body: {
        running: {
          ...apiRun,
          id: "run-2",
          status: "RUNNING",
          stage: "READING",
        },
        chapters: [{ document_id: "d-12", latest: apiRun }],
      },
    });
    const summary = await api().summary("p-1");

    expect(calls[0].url).toBe(`${BASE}/projects/p-1/setting-checks/summary`);
    expect(calls[0].method).toBe("GET");
    expect(calls[0].headers["X-LS-CSRF"]).toBeUndefined();
    expect(summary.running).toMatchObject({ id: "run-2", stage: "READING" });
    expect(summary.chapters[0]).toEqual({
      documentId: "d-12",
      latest: {
        id: "run-1",
        projectId: "p-1",
        documentId: "d-12",
        documentTitle: "12화 · 균열의 밤",
        revisionNo: 14,
        status: "DONE",
        stage: null,
        createdAt: "2026-10-27T12:40:00Z",
        finishedAt: "2026-10-27T12:42:00Z",
        read: {
          manuscripts: 11,
          fromOrdinal: 1,
          toOrdinal: 11,
          settings: 21,
          coreFacts: 6,
        },
        counts: { open: 3, intended: 1, notConflict: 0 },
        failureCode: null,
      },
    });
  });

  it("lists one chapter's runs by document id", async () => {
    replies.push({ status: 200, body: { runs: [apiRun] } });
    const runs = await api().runs("p-1", "d-12");

    expect(calls[0].url).toBe(
      `${BASE}/projects/p-1/setting-checks?document_id=d-12`,
    );
    expect(runs).toHaveLength(1);
    expect(runs[0].counts.notConflict).toBe(0);
  });

  it("reads a run with its findings", async () => {
    replies.push({ status: 200, body: { ...apiRun, findings: [apiFinding] } });
    const run = await api().run("run-1");

    expect(calls[0].url).toBe(`${BASE}/setting-checks/run-1`);
    expect(run.findings[0]).toEqual({
      id: "f-1",
      kind: "SETTING",
      core: true,
      confidence: "HIGH",
      summary: apiFinding.summary,
      direction: apiFinding.direction,
      quote: apiFinding.quote,
      quoteFocus: "천천히 문을 밀었다",
      source: {
        documentId: "d-north",
        title: "북쪽 온실",
        docType: "place",
        ordinal: null,
        quote: apiFinding.source.quote,
        quoteFocus: null,
      },
      verdict: null,
      reason: null,
    });
  });

  it("falls back to the default kind for a document type it does not know", async () => {
    replies.push({
      status: 200,
      body: {
        ...apiRun,
        findings: [
          {
            ...apiFinding,
            source: { ...apiFinding.source, doc_type: "LOCATION" },
          },
        ],
      },
    });
    const run = await api().run("run-1");
    expect(run.findings[0].source.docType).toBe("manuscript");
  });

  it("starts a check with the chapter id and the CSRF header", async () => {
    replies.push({
      status: 202,
      body: {
        ...apiRun,
        status: "RUNNING",
        stage: "READING",
        finished_at: null,
      },
    });
    const run = await api().start("p-1", "d-12");

    expect(calls[0]).toMatchObject({
      url: `${BASE}/projects/p-1/setting-checks`,
      method: "POST",
      body: { document_id: "d-12" },
    });
    expect(calls[0].headers["X-LS-CSRF"]).toBe("1");
    expect(run.status).toBe("RUNNING");
  });

  it("explains that another chapter is being checked", async () => {
    replies.push({
      status: 409,
      body: { code: "SETTING_CHECK_IN_PROGRESS", message: "busy" },
    });
    const error = await api()
      .start("p-1", "d-12")
      .catch((cause: unknown) => cause);

    expect(isServiceError(error) && error.code).toBe("busy");
    expect(isServiceError(error) && error.message).toBe(
      "다른 회차를 점검하고 있어요. 끝난 뒤에 다시 시도해 주세요.",
    );
    expect(isServiceError(error) && error.operation).toBe(
      "settingChecks.start",
    );
  });

  it("treats a vanished chapter as not found", async () => {
    replies.push({
      status: 404,
      body: { code: "SETTING_CHECK_DOCUMENT_NOT_FOUND", message: "gone" },
    });
    const error = await api()
      .start("p-1", "d-12")
      .catch((cause: unknown) => cause);
    expect(isServiceError(error) && error.code).toBe("not-found");
  });

  it("cancels a run", async () => {
    replies.push({ status: 204 });
    await api().cancel("run-1");

    expect(calls[0]).toMatchObject({
      url: `${BASE}/setting-checks/run-1/cancel`,
      method: "POST",
    });
    expect(calls[0].headers["X-LS-CSRF"]).toBe("1");
  });

  it("saves and clears a verdict on a finding", async () => {
    replies.push({
      status: 200,
      body: { ...apiFinding, verdict: "INTENDED", reason: "바퀴 수예요" },
    });
    replies.push({ status: 200, body: apiFinding });

    const decided = await api().setVerdict("f-1", "INTENDED", "바퀴 수예요");
    const cleared = await api().clearVerdict("f-1");

    expect(calls[0]).toMatchObject({
      url: `${BASE}/setting-check-findings/f-1/verdict`,
      method: "PUT",
      body: { verdict: "INTENDED", reason: "바퀴 수예요" },
    });
    expect(calls[1]).toMatchObject({
      url: `${BASE}/setting-check-findings/f-1/verdict`,
      method: "DELETE",
    });
    expect(calls[1].headers["X-LS-CSRF"]).toBe("1");
    expect(decided).toMatchObject({
      verdict: "INTENDED",
      reason: "바퀴 수예요",
    });
    expect(cleared.verdict).toBeNull();
  });
});
