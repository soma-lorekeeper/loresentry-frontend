import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isServiceError } from "../errors";

import { applyMockParam, clearMockRules, setMockLatency } from "./control";
import { GLASS_GARDEN_ID, resetDb } from "./db";
import { mockSettingChecks as checks } from "./setting-checks";
import { SETTING_CHECK_TIMELINE_MS } from "./setting-checks";

const doc = (key: string) => `${GLASS_GARDEN_ID}:${key}`;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(Date.parse("2026-10-27T12:40:00Z"));
  resetDb();
  clearMockRules();
  setMockLatency(0);
});

afterEach(() => {
  vi.useRealTimers();
});

function later(ms: number) {
  vi.setSystemTime(Date.now() + ms);
}

describe("mock setting checks", () => {
  it("seeds the example chapters the screen was designed with", async () => {
    const summary = await checks.summary(GLASS_GARDEN_ID);
    const latest = (key: string) =>
      summary.chapters.find((chapter) => chapter.documentId === doc(key))
        ?.latest;

    expect(summary.running).toBeNull();
    expect(latest("ch-12")?.counts).toEqual({
      open: 6,
      intended: 1,
      notConflict: 0,
    });
    expect(latest("ch-11")?.counts.open).toBe(0);
    expect(latest("ch-9")?.counts).toMatchObject({ open: 0, intended: 1 });
    expect(latest("ch-10")?.counts).toMatchObject({ open: 0, notConflict: 1 });
    expect(latest("ch-13")).toBeUndefined();

    const runs = await checks.runs(GLASS_GARDEN_ID, doc("ch-12"));
    expect(runs).toHaveLength(3);
    expect(runs[0].createdAt > runs[1].createdAt).toBe(true);

    const detail = await checks.run(runs[0].id);
    expect(detail.findings.map((finding) => finding.kind)).toEqual([
      "SETTING",
      "MANUSCRIPT",
      "SETTING",
      "MANUSCRIPT",
      "SETTING",
      "SETTING",
      "SETTING",
    ]);
    expect(detail.findings[0]).toMatchObject({
      core: true,
      source: { title: "북쪽 온실", docType: "place" },
    });
    expect(detail.findings[1].source).toMatchObject({
      docType: "manuscript",
      ordinal: 9,
    });
    expect(detail.findings[2].confidence).toBe("LOW");
    expect(detail.findings[3]).toMatchObject({
      verdict: "INTENDED",
      reason: expect.any(String),
    });
    expect(detail.read).toMatchObject({
      manuscripts: 11,
      fromOrdinal: 1,
      toOrdinal: 11,
      coreFacts: 4,
    });
  });

  it("moves a new run through the stages and finishes with what still applies", async () => {
    const started = await checks.start(GLASS_GARDEN_ID, doc("ch-12"));
    expect(started).toMatchObject({ status: "RUNNING", stage: "READING" });
    expect((await checks.summary(GLASS_GARDEN_ID)).running?.id).toBe(
      started.id,
    );

    later(SETTING_CHECK_TIMELINE_MS.finding);
    expect((await checks.run(started.id)).stage).toBe("FINDING");
    later(
      SETTING_CHECK_TIMELINE_MS.judging - SETTING_CHECK_TIMELINE_MS.finding,
    );
    expect((await checks.run(started.id)).stage).toBe("JUDGING");

    later(SETTING_CHECK_TIMELINE_MS.done);
    const done = await checks.run(started.id);
    expect(done.status).toBe("DONE");
    expect(done.finishedAt).not.toBeNull();
    expect(done.findings).toHaveLength(7);
    // 판정은 근거 문장에 붙어 있어 새 점검에서도 그대로다.
    expect(done.counts).toEqual({ open: 6, intended: 1, notConflict: 0 });
    expect((await checks.summary(GLASS_GARDEN_ID)).running).toBeNull();
  });

  it("finds nothing in a chapter without seeded conflicts", async () => {
    const started = await checks.start(GLASS_GARDEN_ID, doc("ch-13"));
    later(SETTING_CHECK_TIMELINE_MS.done);
    const done = await checks.run(started.id);
    expect(done).toMatchObject({ status: "DONE", findings: [] });
    expect(done.read.manuscripts).toBe(12);
  });

  it("allows one running check per project", async () => {
    await checks.start(GLASS_GARDEN_ID, doc("ch-13"));
    const error = await checks
      .start(GLASS_GARDEN_ID, doc("ch-14"))
      .catch((cause: unknown) => cause);
    expect(isServiceError(error) && error.code).toBe("busy");
  });

  it("refuses to check a setting document", async () => {
    const error = await checks
      .start(GLASS_GARDEN_ID, doc("p-north"))
      .catch((cause: unknown) => cause);
    expect(isServiceError(error) && error.code).toBe("not-found");
  });

  it("can be told to fail through the mock parameter", async () => {
    applyMockParam("settingChecks.start:fail");
    await expect(
      checks.start(GLASS_GARDEN_ID, doc("ch-13")),
    ).rejects.toMatchObject({ code: "network" });

    clearMockRules();
    applyMockParam("settingChecks.job:once");
    const started = await checks.start(GLASS_GARDEN_ID, doc("ch-13"));
    later(SETTING_CHECK_TIMELINE_MS.done);
    expect(await checks.run(started.id)).toMatchObject({
      status: "FAILED",
      failureCode: "CHAT_MODEL_UNAVAILABLE",
    });
  });

  it("cancels a running check and keeps nothing from it", async () => {
    const started = await checks.start(GLASS_GARDEN_ID, doc("ch-12"));
    await checks.cancel(started.id);
    later(SETTING_CHECK_TIMELINE_MS.done);
    expect(await checks.run(started.id)).toMatchObject({
      status: "CANCELLED",
      findings: [],
    });
  });

  it("keeps a verdict across runs and can take it back", async () => {
    const [latest, earlier] = await checks.runs(GLASS_GARDEN_ID, doc("ch-12"));
    const door = (await checks.run(latest.id)).findings[0];

    const decided = await checks.setVerdict(
      door.id,
      "NOT_CONFLICT",
      "  열쇠는 9화에서 받아요  ",
    );
    expect(decided).toMatchObject({
      verdict: "NOT_CONFLICT",
      reason: "열쇠는 9화에서 받아요",
    });
    const sameInEarlier = (await checks.run(earlier.id)).findings.find(
      (finding) => finding.explanation === door.explanation,
    );
    expect(sameInEarlier?.verdict).toBe("NOT_CONFLICT");
    expect(
      (await checks.summary(GLASS_GARDEN_ID)).chapters.find(
        (chapter) => chapter.documentId === doc("ch-12"),
      )?.latest.counts,
    ).toEqual({ open: 5, intended: 1, notConflict: 1 });

    const cleared = await checks.clearVerdict(door.id);
    expect(cleared).toMatchObject({ verdict: null, reason: null });
  });

  it("keeps a ledger of verdicts with the newest finding of each", async () => {
    const seeded = await checks.verdicts(GLASS_GARDEN_ID);
    expect(seeded.map((decision) => decision.documentId)).toEqual([
      doc("ch-12"),
      doc("ch-10"),
      doc("ch-9"),
    ]);
    const [latest] = await checks.runs(GLASS_GARDEN_ID, doc("ch-12"));
    const { findings } = await checks.run(latest.id);
    expect(seeded[0].finding).toEqual(
      findings.find((finding) => finding.verdict === "INTENDED"),
    );

    later(60_000);
    const door = findings[0];
    await checks.setVerdict(door.id, "NOT_CONFLICT", null);
    const ledger = await checks.verdicts(GLASS_GARDEN_ID);
    expect(ledger).toHaveLength(4);
    expect(ledger[0]).toMatchObject({
      documentId: doc("ch-12"),
      documentTitle: latest.documentTitle,
      decidedAt: new Date(Date.now()).toISOString(),
      finding: { id: door.id, verdict: "NOT_CONFLICT", reason: null },
    });

    await checks.clearVerdict(door.id);
    expect(await checks.verdicts(GLASS_GARDEN_ID)).toEqual(seeded);
    expect(await checks.verdicts("other-project")).toEqual([]);
  });

  it("rejects a reason longer than the server allows", async () => {
    const [latest] = await checks.runs(GLASS_GARDEN_ID, doc("ch-12"));
    const door = (await checks.run(latest.id)).findings[0];
    await expect(
      checks.setVerdict(door.id, "INTENDED", "가".repeat(501)),
    ).rejects.toMatchObject({ code: "validation" });
  });
});
