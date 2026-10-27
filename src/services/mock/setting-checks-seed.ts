import { bodyBlocks, bodyToPlainText } from "@/domain/document-body";
import type { DocumentNode } from "@/domain/models";
import type {
  SettingCheckFinding,
  SettingCheckRead,
  SettingCheckRun,
  SettingCheckVerdict,
} from "@/domain/setting-check";
import { isCoreBlock } from "@/features/documents/editor/core-setting";

import type { MockDb } from "./db";
import type { MockSeed, SeedSettingFinding } from "./seed-types";
import { activeFiles, orderedTree } from "./tree";

export type StoredSettingFinding = Omit<
  SettingCheckFinding,
  "verdict" | "reason"
> & { fingerprint: string };

/**
 * mock 이 보관하는 점검 한 번. 어긋남 수는 판정과 맞춰 읽을 때 센다(서버처럼 fingerprint 로 잇는다).
 *
 * @param startedAtMs 단계를 흉내 내는 기준 시각
 * @param outcome     끝날 때의 모습. `hang` 이면 끝나지 않는다(`?mock=settingChecks.job:hang`)
 */
export interface StoredSettingCheckRun {
  run: Omit<SettingCheckRun, "counts">;
  findings: StoredSettingFinding[];
  startedAtMs: number;
  outcome: "done" | "fail" | "hang";
}

export interface StoredSettingVerdict {
  verdict: SettingCheckVerdict;
  reason: string | null;
}

export interface MockSettingChecks {
  runs: StoredSettingCheckRun[];
  /** `${projectId}|${fingerprint}` → 판정 */
  verdicts: Record<string, StoredSettingVerdict>;
}

export function emptySettingChecks(): MockSettingChecks {
  return { runs: [], verdicts: {} };
}

export function normalizeQuote(text: string) {
  return text
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^["'“”‘’「」『』\s]+/, "")
    .replace(/["'“”‘’「」『』.,!?…\s]+$/, "");
}

/**
 * 서버는 종류·근거 문서·두 인용으로 짓는다. mock 의 어긋남은 시드에서 오므로 인용 대신 시드 key 를
 * 써서, 한국어·영어 시드가 같은 판정 열쇠를 갖게 한다.
 */
export function fingerprintOf(kind: string, sourceId: string, key: string) {
  return [kind, sourceId, key].join("|");
}

export function verdictKey(projectId: string, fingerprint: string) {
  return `${projectId}|${fingerprint}`;
}

export function manuscriptsOf(db: MockDb, projectId: string): DocumentNode[] {
  return orderedTree(activeFiles(db, projectId)).filter(
    (node): node is DocumentNode =>
      node.kind === "document" && node.docType === "manuscript",
  );
}

/** 서버의 읽은 범위와 같은 것: 앞 회차 전부, 설정 문서 전부, 그 안의 중요 설정 문단 */
export function readScope(
  db: MockDb,
  projectId: string,
  documentId: string,
): SettingCheckRead {
  const order = manuscriptsOf(db, projectId);
  const ordinal = order.findIndex((node) => node.id === documentId) + 1;
  const earlier = Math.max(0, ordinal - 1);
  const settings = activeFiles(db, projectId).filter(
    (node): node is DocumentNode =>
      node.kind === "document" && node.docType !== "manuscript",
  );
  const coreFacts = settings.reduce((sum, node) => {
    const body = db.documents[node.id]?.body;
    return (
      sum +
      (body
        ? bodyBlocks(body).filter(
            (block) =>
              isCoreBlock(block) &&
              bodyToPlainText({ schemaVersion: 1, doc: block }).trim() !== "",
          ).length
        : 0)
    );
  }, 0);
  return {
    manuscripts: earlier,
    fromOrdinal: earlier > 0 ? 1 : null,
    toOrdinal: earlier > 0 ? earlier : null,
    settings: settings.length,
    coreFacts,
  };
}

export function storedFinding(
  db: MockDb,
  projectId: string,
  runId: string,
  seed: SeedSettingFinding,
): StoredSettingFinding | null {
  const sourceId = `${projectId}:${seed.source}`;
  const source = db.files.find(
    (node): node is DocumentNode =>
      node.id === sourceId && node.kind === "document" && !node.trashedAt,
  );
  if (!source) return null;
  const order = manuscriptsOf(db, projectId);
  const ordinal = order.findIndex((node) => node.id === sourceId);
  return {
    id: `${runId}:${seed.key}`,
    kind: seed.kind,
    core: seed.core ?? false,
    confidence: seed.confidence ?? "HIGH",
    summary: seed.summary,
    direction: seed.direction,
    quote: seed.quote,
    source: {
      documentId: sourceId,
      title: source.title,
      docType: source.docType,
      ordinal:
        source.docType === "manuscript" && ordinal >= 0 ? ordinal + 1 : null,
      quote: seed.sourceQuote,
    },
    fingerprint: fingerprintOf(seed.kind, sourceId, seed.key),
  };
}

/**
 * 예시 작품의 점검 기록. 12화는 세 번(가장 최근 것이 어긋남 셋·의도함 하나), 11화는 어긋남 없음,
 * 10화는 점검한 뒤 고친 회차, 9화는 의도함 하나다. 13·14·8화와 나머지는 점검하지 않았다.
 */
export function seedSettingChecks(
  db: MockDb,
  projectId: string,
  seed: MockSeed,
  now: number,
) {
  const plan = seed.settingCheck;
  const nodeOf = (key: string) =>
    db.files.find(
      (node): node is DocumentNode =>
        node.id === `${projectId}:${key}` && node.kind === "document",
    );

  const add = (
    chapterKey: string,
    minutesAgo: number,
    revisionBack: number,
    findings: SeedSettingFinding[],
  ) => {
    const node = nodeOf(chapterKey);
    if (!node) return;
    const runId = `check-${chapterKey}-${minutesAgo}`;
    const createdAt = now - minutesAgo * 60_000;
    db.settingChecks.runs.push({
      run: {
        id: runId,
        projectId,
        documentId: node.id,
        documentTitle: node.title,
        revisionNo: Math.max(1, node.revisionNo - revisionBack),
        status: "DONE",
        stage: null,
        createdAt: new Date(createdAt).toISOString(),
        finishedAt: new Date(createdAt + 2 * 60_000).toISOString(),
        read: readScope(db, projectId, node.id),
        failureCode: null,
      },
      findings: findings.flatMap(
        (finding) => storedFinding(db, projectId, runId, finding) ?? [],
      ),
      startedAtMs: createdAt,
      outcome: "done",
    });
    for (const finding of findings) {
      if (!finding.verdict) continue;
      const fingerprint = fingerprintOf(
        finding.kind,
        `${projectId}:${finding.source}`,
        finding.key,
      );
      db.settingChecks.verdicts[verdictKey(projectId, fingerprint)] = {
        ...finding.verdict,
      };
    }
  };

  const [door, patrol, harin, crack] = plan.findings;
  const [lantern, law] = plan.earlier;
  for (const chapter of plan.chapters) {
    add(
      chapter.chapter,
      chapter.daysAgo * 24 * 60,
      chapter.edited ? 2 : 0,
      chapter.findings,
    );
  }
  add(plan.chapter, 60 * 24 * 2 + 75, 3, [door, patrol, lantern, law]);
  add(plan.chapter, 60 * 3 + 38, 1, [door, patrol, harin, crack, lantern]);
  add(plan.chapter, 18, 0, plan.findings);
}
