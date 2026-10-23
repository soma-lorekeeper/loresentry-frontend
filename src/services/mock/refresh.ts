import type {
  DocumentDraft,
  DocumentProperty,
  RefreshProposal,
  RefreshRun,
} from "@/domain/models";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import { t } from "@/i18n";

import { ServiceError } from "../errors";
import {
  RefreshConfirmError,
  RefreshDraftConflict,
  type RefreshService,
} from "../ports";

import { simulate } from "./control";
import {
  GLASS_GARDEN_ID,
  getDb,
  isDocumentNode,
  nextId,
  persistDb,
} from "./db";
import { readDocument, writeDocument } from "./documents";
import { mockFiles } from "./files";
import { SEED } from "./seed-world";
import { bodyFromPlainText, bodyToPlainText } from "@/domain/document-body";

/** 결과가 오기까지 걸리는 시간(흉내). 예시 작품은 조금 더 오래 걸린다 */
export const EXTRACTION_MS = 3500;

/**
 * mock 이 보관하는 최신화 한 번. 서버(content)의 run·작업본·문서 잠금을 한 덩어리로 흉내 낸다.
 *
 * @param readyAt   결과가 도착하는 시각(ms). RUNNING 일 때만 의미가 있다
 * @param lockedFileIds 이 run 이 잠근 문서. 끝날 때 이것만 푼다
 * @param origins   작업본마다 처음 뜬 왼쪽. 확정 때 바뀐 문서만 쓰려고 둔다
 * @param parents   새 문서 후보 → 만들 폴더
 */
export interface StoredRefreshRun {
  run: RefreshRun;
  readyAt: number | null;
  lockedFileIds: string[];
  proposals: RefreshProposal[];
  origins: Record<string, DocumentDraft | null>;
  parents: Record<string, string>;
}

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

function draftOf(fileId: string): DocumentDraft {
  const doc = readDocument(fileId);
  return { title: doc.title, body: doc.body, properties: doc.properties };
}

function same(a: DocumentDraft | null, b: DocumentDraft | null) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function withDescription(draft: DocumentDraft, value: string): DocumentDraft {
  return {
    ...draft,
    properties: draft.properties.map((p) =>
      p.kind === "text" && p.key === "description" ? { ...p, value } : p,
    ),
  };
}

function withRelation(
  draft: DocumentDraft,
  relation: DocumentProperty,
): DocumentDraft {
  if (relation.kind !== "relation") return draft;
  const existing = draft.properties.find((p) => p.key === relation.key);
  if (!existing || existing.kind !== "relation") {
    return { ...draft, properties: [...draft.properties, relation] };
  }
  return {
    ...draft,
    properties: draft.properties.map((p) =>
      p === existing
        ? {
            ...existing,
            targetIds: [
              ...new Set([...existing.targetIds, ...relation.targetIds]),
            ],
          }
        : p,
    ),
  };
}

/** 예시 작품의 정해진 제안. AI 대신 같은 결과를 낸다 */
function buildProposals(
  projectId: string,
): Pick<StoredRefreshRun, "proposals" | "parents"> {
  const db = getDb();
  const find = (key: string) =>
    db.files.find((f) => f.id === `${projectId}:${key}` && !f.trashedAt);
  const proposals: RefreshProposal[] = [];
  const parents: Record<string, string> = {};
  const draft = (
    proposal: Omit<
      RefreshProposal,
      "id" | "draftRevision" | "matched" | "baseMismatch"
    >,
  ): RefreshProposal => ({
    ...proposal,
    id: nextId("draft"),
    draftRevision: 1,
    matched: same(proposal.current, proposal.proposed),
    baseMismatch: false,
  });

  const harin = find("c-harin");
  const teo = find("c-teo");
  if (harin && isDocumentNode(harin)) {
    const current = draftOf(harin.id);
    let proposed = withDescription(current, SEED.refresh.harinDescription);
    if (teo) {
      proposed = withRelation(proposed, {
        id: `${harin.id}:related_character`,
        kind: "relation",
        key: "related_character",
        descriptions: {},
        label: DOCUMENT_TYPE_META.character.relationLabel,
        targetType: "character",
        targetIds: [teo.id],
      });
    }
    proposed = {
      ...proposed,
      body: bodyFromPlainText(
        `${bodyToPlainText(current.body)}\n\n${SEED.refresh.harinBodyAddition}`,
      ),
    };
    proposals.push(
      draft({
        kind: "modified",
        fileId: harin.id,
        title: harin.title,
        docType: "character",
        current,
        proposed,
      }),
    );
  }
  const placeFolder = db.files.find(
    (f) =>
      f.projectId === projectId &&
      f.kind === "folder" &&
      f.category === "place" &&
      f.role === "category",
  );
  if (placeFolder) {
    const candidate = "new:place:ash-lighthouse";
    parents[candidate] = placeFolder.id;
    proposals.push(
      draft({
        kind: "added",
        fileId: candidate,
        title: SEED.refresh.newPlace.title,
        docType: "place",
        current: null,
        proposed: {
          title: SEED.refresh.newPlace.title,
          body: bodyFromPlainText(SEED.refresh.newPlace.body),
          properties: [
            {
              id: "new:description",
              kind: "text",
              key: "description",
              label: t("mock::설명"),
              value: SEED.refresh.newPlace.description,
            },
          ],
        },
      }),
    );
  }
  const seoyun = find("c-seoyun");
  if (seoyun && isDocumentNode(seoyun)) {
    const current = draftOf(seoyun.id);
    proposals.push(
      draft({
        kind: "modified",
        fileId: seoyun.id,
        title: seoyun.title,
        docType: "character",
        current,
        proposed: withDescription(current, SEED.refresh.seoyunDescription),
      }),
    );
  }
  return { proposals, parents };
}

function setLocks(fileIds: readonly string[], locked: boolean) {
  for (const node of getDb().files) {
    if (fileIds.includes(node.id) && isDocumentNode(node))
      node.refreshLocked = locked;
  }
}

function counts(proposals: readonly RefreshProposal[]) {
  return {
    total: proposals.length,
    matched: proposals.filter((p) => p.matched).length,
    created: proposals.filter((p) => p.kind === "added").length,
  };
}

/** 지난 형식으로 저장된 run(브라우저에 남은 옛 mock 자료)은 없는 것으로 본다 */
function stored(projectId: string): StoredRefreshRun | null {
  const value = getDb().refreshRuns[projectId] as StoredRefreshRun | undefined;
  return value && "run" in value && "proposals" in value ? value : null;
}

/** 끝난 run 으로 바꾸고 이 run 이 건 잠금을 푼다 */
function end(entry: StoredRefreshRun, status: RefreshRun["status"]) {
  setLocks(entry.lockedFileIds, false);
  entry.run = {
    ...entry.run,
    status,
    completedAt: new Date().toISOString(),
    counts: NO_DRAFTS,
  };
  entry.proposals = [];
  entry.lockedFileIds = [];
}

/** 결과가 도착할 시각이 지났으면 서버의 완료 처리처럼 작업본을 열고 관련 문서를 잠근다 */
function tick(projectId: string): StoredRefreshRun | null {
  const entry = stored(projectId);
  if (
    !entry ||
    entry.run.status !== "RUNNING" ||
    entry.readyAt === null ||
    Date.now() < entry.readyAt
  )
    return entry;
  const built = buildProposals(projectId);
  entry.proposals = built.proposals;
  entry.parents = built.parents;
  entry.origins = Object.fromEntries(
    built.proposals.map((p) => [p.id, p.current]),
  );
  entry.readyAt = null;
  if (built.proposals.length === 0) {
    end(entry, "NO_CHANGE");
  } else {
    const targets = built.proposals
      .filter((p) => p.kind === "modified")
      .map((p) => p.fileId);
    entry.lockedFileIds = [...new Set([...entry.lockedFileIds, ...targets])];
    setLocks(entry.lockedFileIds, true);
    entry.run = {
      ...entry.run,
      status: "READY",
      readyAt: new Date().toISOString(),
      counts: counts(entry.proposals),
    };
  }
  persistDb();
  return entry;
}

function requireReady(projectId: string, runId: string): StoredRefreshRun {
  const entry = tick(projectId);
  if (!entry || entry.run.id !== runId || entry.run.status !== "READY") {
    throw new ServiceError("not-found", t("이미 끝난 최신화예요."));
  }
  return entry;
}

/** 확정한 문서의 관계에서 새 문서 후보 id 를 실제 id 로 바꾼다. 만들지 않은 후보는 뺀다 */
function resolveCandidates(
  draft: DocumentDraft,
  created: ReadonlyMap<string, string>,
): DocumentDraft {
  return {
    ...draft,
    properties: draft.properties.map((property) =>
      property.kind === "relation"
        ? {
            ...property,
            targetIds: property.targetIds
              .map((id) => (id.startsWith("new:") ? created.get(id) : id))
              .filter((id): id is string => id !== undefined),
          }
        : property,
    ),
  };
}

function recordAiApply(fileId: string, docType: RefreshProposal["docType"]) {
  const content = readDocument(fileId);
  getDb().versions.push({
    id: nextId("ver"),
    fileId,
    kind: "AI_APPLY",
    label: null,
    createdAt: new Date().toISOString(),
    snapshot: {
      title: content.title,
      body: content.body,
      properties: content.properties,
      docType,
    },
  });
}

export const mockRefresh: RefreshService = {
  latest: (projectId) =>
    simulate("refresh.latest", () => tick(projectId)?.run ?? idle(projectId), {
      latencyMs: 60,
    }),

  start: (projectId) =>
    simulate("refresh.start", () => {
      const entry = tick(projectId);
      if (entry?.run.status === "RUNNING") {
        throw new ServiceError(
          "busy",
          t("이미 그래프 최신화를 진행하고 있어요."),
        );
      }
      if (entry?.run.status === "READY") {
        throw new ServiceError(
          "busy",
          t("검토를 기다리는 최신화 결과가 있어요."),
        );
      }
      const db = getDb();
      // 서버는 지난 최신화 뒤 바뀐 문서를 모두 보낸다. 여기서는 최근 원고 세 편으로 대신한다.
      const sources = db.files
        .filter(
          (f) =>
            f.projectId === projectId &&
            isDocumentNode(f) &&
            f.docType === "manuscript" &&
            !f.trashedAt,
        )
        .sort((a, b) =>
          isDocumentNode(b) && isDocumentNode(a)
            ? b.updatedAt.localeCompare(a.updatedAt)
            : 0,
        )
        .slice(0, 3)
        .map((f) => f.id);
      const run: RefreshRun = {
        ...idle(projectId),
        id: nextId("run"),
        status: "RUNNING",
        startedAt: new Date().toISOString(),
      };
      db.refreshRuns[projectId] = {
        run,
        readyAt:
          Date.now() +
          (projectId === GLASS_GARDEN_ID ? EXTRACTION_MS : EXTRACTION_MS / 2),
        lockedFileIds: sources,
        proposals: [],
        origins: {},
        parents: {},
      };
      setLocks(sources, true);
      persistDb();
      return { run, lockedFileIds: sources };
    }),

  review: (projectId, runId) =>
    simulate("refresh.review", () => {
      const entry = tick(projectId);
      if (!entry || entry.run.id !== runId) {
        throw new ServiceError("not-found", t("이미 끝난 최신화예요."));
      }
      return { ...entry.run, proposals: entry.proposals };
    }),

  saveDraft: (projectId, runId, draftId, input) =>
    simulate("refresh.saveDraft", () => {
      const entry = requireReady(projectId, runId);
      const proposal = entry.proposals.find((p) => p.id === draftId);
      if (!proposal) {
        throw new ServiceError("not-found", t("이미 끝난 최신화예요."));
      }
      if (proposal.draftRevision !== input.draftRevision) {
        throw new RefreshDraftConflict({
          draftRevision: proposal.draftRevision,
          matched: proposal.matched,
          current: proposal.current,
          proposed: proposal.proposed,
        });
      }
      proposal.current = input.current;
      proposal.proposed = input.proposed;
      proposal.draftRevision += 1;
      proposal.matched = same(input.current, input.proposed);
      entry.run = { ...entry.run, counts: counts(entry.proposals) };
      persistDb();
      return {
        draftRevision: proposal.draftRevision,
        matched: proposal.matched,
        current: proposal.current,
        proposed: proposal.proposed,
      };
    }),

  confirm: (projectId, runId) =>
    simulate(
      "refresh.confirm",
      async () => {
        const entry = requireReady(projectId, runId);
        const unmatched = entry.proposals.filter((p) => !p.matched);
        if (unmatched.length > 0) {
          throw new RefreshConfirmError(
            "REFRESH_DRAFTS_UNMATCHED",
            unmatched.map((p) => p.id),
            [],
          );
        }
        // 잠금을 먼저 풀어야 새 문서·관계를 쓸 수 있다(서버는 이 run 의 잠금을 통과한다).
        setLocks(entry.lockedFileIds, false);
        const created = new Map<string, string>();
        for (const proposal of entry.proposals) {
          if (proposal.kind !== "added" || !proposal.current) continue;
          const file = await mockFiles.create({
            projectId,
            parentId: entry.parents[proposal.fileId] ?? null,
            kind: "document",
            title: proposal.current.title,
            docType: proposal.docType,
          });
          created.set(proposal.fileId, file.id);
        }
        for (const proposal of entry.proposals) {
          if (!proposal.current) continue;
          const fileId = created.get(proposal.fileId) ?? proposal.fileId;
          if (
            proposal.kind === "modified" &&
            same(proposal.current, entry.origins[proposal.id] ?? null)
          )
            continue;
          writeDocument(fileId, resolveCandidates(proposal.current, created));
          recordAiApply(fileId, proposal.docType);
        }
        end(entry, "APPLIED");
        persistDb();
      },
      { latencyMs: 600 },
    ),
};
