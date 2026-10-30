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
  normalizeQuote,
  readScope,
  storedFinding,
  verdictKey,
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

function counts(db: MockDb, stored: StoredSettingCheckRun): SettingCheckCounts {
  const result = { open: 0, intended: 0, notConflict: 0 };
  for (const finding of stored.findings) {
    const verdict =
      db.settingChecks.verdicts[
        verdictKey(stored.run.projectId, finding.fingerprint)
      ]?.verdict;
    if (verdict === "INTENDED") result.intended += 1;
    else if (verdict === "NOT_CONFLICT") result.notConflict += 1;
    else result.open += 1;
  }
  return result;
}

function toRun(db: MockDb, stored: StoredSettingCheckRun): SettingCheckRun {
  return { ...stored.run, counts: counts(db, stored) };
}

function toFinding(
  db: MockDb,
  projectId: string,
  stored: StoredSettingFinding,
): SettingCheckFinding {
  const { fingerprint, ...finding } = stored;
  const verdict = db.settingChecks.verdicts[verdictKey(projectId, fingerprint)];
  return {
    ...finding,
    verdict: verdict?.verdict ?? null,
    reason: verdict?.reason ?? null,
  };
}

function toDetail(
  db: MockDb,
  stored: StoredSettingCheckRun,
): SettingCheckRunDetail {
  return {
    ...toRun(db, stored),
    findings: stored.findings.map((finding) =>
      toFinding(db, stored.run.projectId, finding),
    ),
  };
}

/** 서버의 인용 확인처럼, 인용이 지금 원고에 그대로 있는 어긋남만 낸다 */
function detect(db: MockDb, stored: StoredSettingCheckRun) {
  const { projectId, documentId, id } = stored.run;
  const plan = SEED.settingCheck;
  if (documentId !== `${projectId}:${plan.chapter}`) return [];
  const body = db.documents[documentId]?.body;
  const text = normalizeQuote(body ? bodyToPlainText(body) : "");
  return plan.findings.flatMap((finding) =>
    text.includes(normalizeQuote(finding.quote))
      ? (storedFinding(db, projectId, id, finding) ?? [])
      : [],
  );
}

function advance(db: MockDb, now = Date.now()) {
  for (const stored of db.settingChecks.runs) {
    if (stored.run.status !== "RUNNING") continue;
    const elapsed = now - stored.startedAtMs;
    if (
      elapsed >= SETTING_CHECK_TIMELINE_MS.finding &&
      !stored.run.read.settings
    )
      stored.run.read = readScope(
        db,
        stored.run.projectId,
        stored.run.documentId,
      );
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
    t("이 어긋남을 찾을 수 없어요. 다시 불러와 주세요."),
    operation,
  );
}

function newest(a: StoredSettingCheckRun, b: StoredSettingCheckRun) {
  return b.run.createdAt.localeCompare(a.run.createdAt);
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
        running: running ? toRun(db, running) : null,
        chapters: [...latest.values()].map((stored) => ({
          documentId: stored.run.documentId,
          latest: toRun(db, stored),
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
        .map((stored) => toRun(db, stored));
    }),

  run: (runId) =>
    simulate("settingChecks.run", () => {
      const db = getDb();
      advance(db);
      return toDetail(db, requireRun(db, runId, "settingChecks.run"));
    }),

  verdicts: (projectId) =>
    simulate("settingChecks.verdicts", () => {
      const db = getDb();
      advance(db);
      const runs = db.settingChecks.runs
        .filter((stored) => stored.run.projectId === projectId)
        .sort(newest);
      const decisions: SettingCheckDecision[] = [];
      for (const [key, verdict] of Object.entries(db.settingChecks.verdicts)) {
        if (!key.startsWith(`${projectId}|`)) continue;
        const fingerprint = key.slice(projectId.length + 1);
        for (const stored of runs) {
          const finding = stored.findings.find(
            (item) => item.fingerprint === fingerprint,
          );
          if (!finding) continue;
          decisions.push({
            documentId: stored.run.documentId,
            documentTitle: stored.run.documentTitle,
            decidedAt: verdict.decidedAt,
            finding: toFinding(db, projectId, finding),
          });
          break;
        }
      }
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
      return toRun(db, stored);
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
      const { stored, finding } = requireFinding(
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
      db.settingChecks.verdicts[
        verdictKey(stored.run.projectId, finding.fingerprint)
      ] = { verdict, reason: trimmed, decidedAt: new Date().toISOString() };
      persistDb();
      return toFinding(db, stored.run.projectId, finding);
    }),

  clearVerdict: (findingId) =>
    simulate("settingChecks.clearVerdict", () => {
      const db = getDb();
      const { stored, finding } = requireFinding(
        db,
        findingId,
        "settingChecks.clearVerdict",
      );
      delete db.settingChecks.verdicts[
        verdictKey(stored.run.projectId, finding.fingerprint)
      ];
      persistDb();
      return toFinding(db, stored.run.projectId, finding);
    }),
};
