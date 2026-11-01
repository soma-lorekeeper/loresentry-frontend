import { bodyToPlainText } from "@/domain/document-body";
import type { DocumentNode } from "@/domain/models";
import {
  SETTING_CHECK_REASON_MAX,
  type SettingCheckCounts,
  type SettingCheckDecision,
  type SettingCheckFinding,
  type SettingCheckRun,
  type SettingCheckRunDetail,
} from "@/domain/setting-check";
import { t } from "@/i18n";

import { ServiceError } from "../errors";
import type { SettingCheckService } from "../ports";

import { getMockControl, setMockRule, simulate } from "./control";
import { getDb, nextId, persistDb, type MockDb } from "./db";
import { SEED } from "./seed-world";
import {
  checkVersion,
  normalizeQuote,
  readScope,
  storedFinding,
  type StoredSettingCheckRun,
  type StoredSettingFinding,
} from "./setting-checks-seed";
import { activeFiles } from "./tree";

/** 단계가 바뀌는 시각(시작한 뒤 ms). 서버는 1–3분 걸리지만 화면을 보기 위해 몇 초로 줄였다 */
export const SETTING_CHECK_TIMELINE_MS = {
  finding: 1500,
  judging: 3000,
  done: 4500,
};

function counts(stored: StoredSettingCheckRun): SettingCheckCounts {
  const result = { open: 0, intended: 0, notConflict: 0 };
  for (const finding of stored.findings) {
    if (finding.verdict === "INTENDED") result.intended += 1;
    else if (finding.verdict === "NOT_CONFLICT") result.notConflict += 1;
    else result.open += 1;
  }
  return result;
}

function toRun(stored: StoredSettingCheckRun): SettingCheckRun {
  return { ...stored.run, counts: counts(stored) };
}

function toFinding(stored: StoredSettingFinding): SettingCheckFinding {
  const { id, kind, core, confidence, explanation, quote, quoteFocus } = stored;
  const { source, verdict, reason } = stored;
  return {
    id,
    kind,
    core,
    confidence,
    explanation,
    quote,
    quoteFocus,
    source,
    verdict,
    reason,
  };
}

function toDetail(stored: StoredSettingCheckRun): SettingCheckRunDetail {
  return { ...toRun(stored), findings: stored.findings.map(toFinding) };
}

function newest(a: StoredSettingCheckRun, b: StoredSettingCheckRun) {
  return b.run.createdAt.localeCompare(a.run.createdAt);
}

/** 회차의 설정 충돌마다, 그것이 나온 가장 최근 점검의 상태. 판정을 지운 것도 그대로다 */
function latestStates(db: MockDb, documentId: string, except?: string) {
  const states = new Map<
    string,
    { stored: StoredSettingCheckRun; finding: StoredSettingFinding }
  >();
  const runs = db.settingChecks.runs
    .filter(
      (stored) =>
        stored.run.documentId === documentId &&
        stored.run.status === "DONE" &&
        stored.run.id !== except,
    )
    .sort(newest);
  for (const stored of runs)
    for (const finding of stored.findings)
      if (!states.has(finding.fingerprint))
        states.set(finding.fingerprint, { stored, finding });
  return states;
}

/** 서버의 인용 확인처럼, 인용이 지금 원고에 그대로 있는 설정 충돌만 낸다 */
function detect(db: MockDb, stored: StoredSettingCheckRun) {
  const { projectId, documentId, id } = stored.run;
  const plan = SEED.settingCheck;
  if (documentId !== `${projectId}:${plan.chapter}`) return [];
  const body = db.documents[documentId]?.body;
  const text = normalizeQuote(body ? bodyToPlainText(body) : "");
  const states = latestStates(db, documentId, id);
  return plan.findings.flatMap((seed) => {
    if (!text.includes(normalizeQuote(seed.quote))) return [];
    const finding = storedFinding(db, projectId, id, seed);
    if (!finding) return [];
    const previous = states.get(finding.fingerprint)?.finding;
    return previous?.verdict
      ? {
          ...finding,
          verdict: previous.verdict,
          reason: previous.reason,
          decidedAt: previous.decidedAt,
        }
      : finding;
  });
}

function advance(db: MockDb, now = Date.now()) {
  for (const stored of db.settingChecks.runs) {
    if (stored.run.status !== "RUNNING") continue;
    const elapsed = now - stored.startedAtMs;
    if (elapsed >= SETTING_CHECK_TIMELINE_MS.finding && !stored.run.versionId) {
      stored.run.read = readScope(
        db,
        stored.run.projectId,
        stored.run.documentId,
      );
      const node = db.files.find(
        (candidate): candidate is DocumentNode =>
          candidate.id === stored.run.documentId &&
          candidate.kind === "document",
      );
      if (node) {
        stored.run.revisionNo = node.revisionNo;
        stored.run.versionId = checkVersion(
          db,
          node,
          new Date(
            stored.startedAtMs + SETTING_CHECK_TIMELINE_MS.finding,
          ).toISOString(),
        );
      }
    }
    if (elapsed < SETTING_CHECK_TIMELINE_MS.done || stored.outcome === "hang") {
      stored.run.stage =
        elapsed < SETTING_CHECK_TIMELINE_MS.finding
          ? "READING"
          : elapsed < SETTING_CHECK_TIMELINE_MS.judging
            ? "FINDING"
            : "JUDGING";
      continue;
    }
    stored.run.stage = null;
    stored.run.finishedAt = new Date(
      stored.startedAtMs + SETTING_CHECK_TIMELINE_MS.done,
    ).toISOString();
    if (stored.outcome === "fail") {
      stored.run.status = "FAILED";
      stored.run.failureCode = "CHAT_MODEL_UNAVAILABLE";
    } else {
      stored.run.status = "DONE";
      stored.findings = detect(db, stored);
    }
    persistDb();
  }
}

function notFound(message: string, operation: string): never {
  throw new ServiceError("not-found", message, operation);
}

function requireRun(db: MockDb, runId: string, operation: string) {
  return (
    db.settingChecks.runs.find((stored) => stored.run.id === runId) ??
    notFound(t("점검 기록을 찾을 수 없어요."), operation)
  );
}

function requireFinding(db: MockDb, findingId: string, operation: string) {
  for (const stored of db.settingChecks.runs) {
    const finding = stored.findings.find((item) => item.id === findingId);
    if (finding) return { stored, finding };
  }
  return notFound(
    t("이 설정 충돌을 찾을 수 없어요. 다시 불러와 주세요."),
    operation,
  );
}

/** `?mock=settingChecks.job:fail|once|hang` 은 다음 점검이 끝나는 모습을 정한다 */
function outcomeOfNextJob(): StoredSettingCheckRun["outcome"] {
  const rule = getMockControl().rules["settingChecks.job"];
  if (rule === "once") setMockRule("settingChecks.job", null);
  if (rule === "hang") return "hang";
  return rule ? "fail" : "done";
}

export const mockSettingChecks: SettingCheckService = {
  summary: (projectId) =>
    simulate("settingChecks.summary", () => {
      const db = getDb();
      advance(db);
      const runs = db.settingChecks.runs
        .filter((stored) => stored.run.projectId === projectId)
        .sort(newest);
      const running = runs.find((stored) => stored.run.status === "RUNNING");
      const latest = new Map<string, StoredSettingCheckRun>();
      for (const stored of runs)
        if (!latest.has(stored.run.documentId))
          latest.set(stored.run.documentId, stored);
      return {
        running: running ? toRun(running) : null,
        chapters: [...latest.values()].map((stored) => ({
          documentId: stored.run.documentId,
          latest: toRun(stored),
        })),
      };
    }),

  runs: (projectId, documentId) =>
    simulate("settingChecks.runs", () => {
      const db = getDb();
      advance(db);
      return db.settingChecks.runs
        .filter(
          (stored) =>
            stored.run.projectId === projectId &&
            stored.run.documentId === documentId,
        )
        .sort(newest)
        .map((stored) => toRun(stored));
    }),

  run: (runId) =>
    simulate("settingChecks.run", () => {
      const db = getDb();
      advance(db);
      return toDetail(requireRun(db, runId, "settingChecks.run"));
    }),

  verdicts: (projectId) =>
    simulate("settingChecks.verdicts", () => {
      const db = getDb();
      advance(db);
      const chapters = new Set(
        db.settingChecks.runs
          .filter((stored) => stored.run.projectId === projectId)
          .map((stored) => stored.run.documentId),
      );
      const decisions: SettingCheckDecision[] = [];
      for (const documentId of chapters)
        for (const { stored, finding } of latestStates(db, documentId).values())
          if (finding.verdict && finding.decidedAt)
            decisions.push({
              documentId,
              documentTitle: stored.run.documentTitle,
              decidedAt: finding.decidedAt,
              finding: toFinding(finding),
            });
      return decisions.sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
    }),

  start: (projectId, documentId) =>
    simulate("settingChecks.start", () => {
      const db = getDb();
      advance(db);
      const node = activeFiles(db, projectId).find(
        (candidate): candidate is DocumentNode =>
          candidate.id === documentId &&
          candidate.kind === "document" &&
          candidate.docType === "manuscript",
      );
      if (!node)
        notFound(t("점검할 원고를 찾을 수 없어요."), "settingChecks.start");
      if (
        db.settingChecks.runs.some(
          (stored) =>
            stored.run.projectId === projectId &&
            stored.run.status === "RUNNING",
        )
      )
        throw new ServiceError(
          "busy",
          t("다른 회차를 점검하고 있어요. 끝난 뒤에 다시 시도해 주세요."),
          "settingChecks.start",
        );
      const now = Date.now();
      const stored: StoredSettingCheckRun = {
        run: {
          id: nextId("check"),
          projectId,
          documentId,
          documentTitle: node.title,
          revisionNo: node.revisionNo,
          versionId: null,
          status: "RUNNING",
          stage: "READING",
          createdAt: new Date(now).toISOString(),
          finishedAt: null,
          read: {
            manuscripts: 0,
            fromOrdinal: null,
            toOrdinal: null,
            settings: 0,
            coreFacts: 0,
          },
          failureCode: null,
        },
        findings: [],
        startedAtMs: now,
        outcome: outcomeOfNextJob(),
      };
      db.settingChecks.runs.push(stored);
      persistDb();
      return toRun(stored);
    }),

  cancel: (runId) =>
    simulate("settingChecks.cancel", () => {
      const db = getDb();
      advance(db);
      const stored = requireRun(db, runId, "settingChecks.cancel");
      if (stored.run.status !== "RUNNING") return;
      stored.run.status = "CANCELLED";
      stored.run.stage = null;
      stored.run.finishedAt = new Date().toISOString();
      persistDb();
    }),

  setVerdict: (findingId, verdict, reason) =>
    simulate("settingChecks.setVerdict", () => {
      const db = getDb();
      const { finding } = requireFinding(
        db,
        findingId,
        "settingChecks.setVerdict",
      );
      const trimmed = reason?.trim() || null;
      if (trimmed && trimmed.length > SETTING_CHECK_REASON_MAX)
        throw new ServiceError(
          "validation",
          t("입력을 다시 확인해 주세요."),
          "settingChecks.setVerdict",
        );
      finding.verdict = verdict;
      finding.reason = trimmed;
      finding.decidedAt = new Date().toISOString();
      persistDb();
      return toFinding(finding);
    }),

  clearVerdict: (findingId) =>
    simulate("settingChecks.clearVerdict", () => {
      const db = getDb();
      const { finding } = requireFinding(
        db,
        findingId,
        "settingChecks.clearVerdict",
      );
      finding.verdict = null;
      finding.reason = null;
      finding.decidedAt = null;
      persistDb();
      return toFinding(finding);
    }),
};
