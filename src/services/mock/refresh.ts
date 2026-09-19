import type {
  DocumentDraft,
  DocumentProperty,
  RefreshProposal,
  RefreshRun,
} from "@/domain/models";

import { ServiceError } from "../errors";
import type { RefreshService } from "../ports";

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

export const EXTRACTION_MS = 3500;

interface StoredRun extends RefreshRun {
  readyAt: number | null;
}

function idle(projectId: string): StoredRun {
  return {
    id: `run-idle-${projectId}`,
    projectId,
    status: "IDLE",
    startedAt: null,
    sourceFileIds: [],
    proposals: [],
    readyAt: null,
  };
}

function draftOf(fileId: string): DocumentDraft {
  const doc = readDocument(fileId);
  return { title: doc.title, bodyMd: doc.bodyMd, properties: doc.properties };
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

function buildProposals(projectId: string): RefreshProposal[] {
  const db = getDb();
  const find = (key: string) =>
    db.files.find((f) => f.id === `${projectId}:${key}` && !f.trashedAt);
  const proposals: RefreshProposal[] = [];
  const harin = find("c-harin");
  const teo = find("c-teo");
  if (harin && isDocumentNode(harin)) {
    const current = draftOf(harin.id);
    let proposed = withDescription(
      current,
      "북쪽 온실의 문이 열린 뒤 기록단에 합류한 정원사",
    );
    if (teo) {
      proposed = withRelation(proposed, {
        id: `${harin.id}:related_character`,
        kind: "relation",
        key: "related_character",
        label: "관련 캐릭터",
        targetType: "character",
        targetIds: [teo.id],
      });
    }
    proposed = {
      ...proposed,
      bodyMd: `${current.bodyMd}\n\n13화에서 문 너머의 목소리를 가장 먼저 알아본다.\n그 뒤로 북쪽 온실의 열쇠를 서윤에게 맡긴다.`,
    };
    proposals.push({
      id: nextId("proposal"),
      kind: "modified",
      fileId: harin.id,
      title: harin.title,
      docType: "character",
      baseRevisionNo: harin.revisionNo,
      current,
      proposed,
    });
  }
  const placeFolder = db.files.find(
    (f) =>
      f.projectId === projectId &&
      f.kind === "folder" &&
      f.category === "place" &&
      f.role === "category",
  );
  if (placeFolder) {
    proposals.push({
      id: nextId("proposal"),
      kind: "added",
      fileId: `new:${placeFolder.id}:ash-lighthouse`,
      title: "잿빛 등대",
      docType: "place",
      baseRevisionNo: null,
      current: null,
      proposed: {
        title: "잿빛 등대",
        bodyMd:
          "13화에서 처음 언급된 등대. 불이 꺼진 뒤에도 재가 빛을 머금고 있다.",
        properties: [
          {
            id: "new:description",
            kind: "text",
            key: "description",
            label: "설명",
            value: "13화에 처음 등장한 꺼진 등대",
          },
        ],
      },
    });
  }
  const lost = find("e-lost");
  if (lost && isDocumentNode(lost)) {
    proposals.push({
      id: nextId("proposal"),
      kind: "removed",
      fileId: lost.id,
      title: lost.title,
      docType: "event",
      baseRevisionNo: lost.revisionNo,
      current: draftOf(lost.id),
      proposed: null,
    });
  }
  const seoyun = find("c-seoyun");
  if (seoyun && isDocumentNode(seoyun)) {
    const current = draftOf(seoyun.id);
    proposals.push({
      id: nextId("proposal"),
      kind: "modified",
      fileId: seoyun.id,
      title: seoyun.title,
      docType: "character",
      baseRevisionNo: seoyun.revisionNo,
      current,
      proposed: withDescription(
        current,
        "정원 기록단의 막내 기록관이자 북쪽 문의 첫 방문자",
      ),
    });
  }
  return proposals;
}

function currentRun(projectId: string): StoredRun {
  const db = getDb();
  const run =
    (db.refreshRuns[projectId] as StoredRun | undefined) ?? idle(projectId);
  if (
    run.status === "RUNNING" &&
    run.readyAt !== null &&
    Date.now() >= run.readyAt
  ) {
    run.status = "READY";
    run.proposals = buildProposals(projectId);
    db.refreshRuns[projectId] = run;
    persistDb();
  }
  return run;
}

function publicRun(run: StoredRun): RefreshRun {
  const { readyAt, ...rest } = run;
  void readyAt;
  return rest;
}

export const mockRefresh: RefreshService = {
  current: (projectId) =>
    simulate("refresh.current", () => publicRun(currentRun(projectId)), {
      latencyMs: 60,
    }),
  start: (projectId) =>
    simulate("refresh.start", () => {
      const run = currentRun(projectId);
      if (run.status === "RUNNING") {
        throw new ServiceError("busy", "이미 그래프 최신화를 진행하고 있어요.");
      }
      const db = getDb();
      const manuscripts = db.files
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
      const next: StoredRun = {
        id: nextId("run"),
        projectId,
        status: "RUNNING",
        startedAt: new Date().toISOString(),
        sourceFileIds: manuscripts,
        proposals: [],
        readyAt:
          Date.now() +
          (projectId === GLASS_GARDEN_ID ? EXTRACTION_MS : EXTRACTION_MS / 2),
      };
      db.refreshRuns[projectId] = next;
      persistDb();
      return publicRun(next);
    }),
  apply: (projectId, runId, resolved) =>
    simulate(
      "refresh.apply",
      async () => {
        const run = currentRun(projectId);
        if (run.id !== runId || run.status !== "READY") {
          throw new ServiceError("validation", "반영할 변경 사항이 없어요.");
        }
        for (const proposal of run.proposals) {
          if (!(proposal.id in resolved)) {
            throw new ServiceError(
              "validation",
              "아직 결정하지 않은 변경이 있어요.",
            );
          }
        }
        // 서버 가정(TABLE_AND_LOGIC §7.6): 추출 뒤 실제 문서가 또 바뀌었으면 덮어쓰지 않는다(STALE).
        for (const proposal of run.proposals) {
          if (proposal.kind !== "modified" || proposal.baseRevisionNo === null)
            continue;
          const node = getDb().files.find((f) => f.id === proposal.fileId);
          if (
            node &&
            isDocumentNode(node) &&
            node.revisionNo !== proposal.baseRevisionNo
          ) {
            throw new ServiceError(
              "validation",
              `‘${proposal.title}’이 추출 뒤에 수정됐어요. 그래프를 다시 최신화해 주세요.`,
            );
          }
        }
        for (const proposal of run.proposals) {
          const final = resolved[proposal.id];
          if (proposal.kind === "added") {
            if (!final) continue;
            const parentId = proposal.fileId.split(":").slice(1, -1).join(":");
            const created = await mockFiles.create({
              projectId,
              parentId,
              kind: "document",
              title: final.title,
              docType: proposal.docType,
            });
            writeDocument(created.id, final);
          } else if (proposal.kind === "removed") {
            if (!final) await mockFiles.moveToTrash(proposal.fileId);
          } else if (final) {
            writeDocument(proposal.fileId, final);
            getDb().versions.push({
              id: nextId("ver"),
              fileId: proposal.fileId,
              kind: "AI_APPLY",
              label: null,
              createdAt: new Date().toISOString(),
              snapshot: { ...final, docType: proposal.docType },
            });
          }
        }
        const db = getDb();
        db.refreshRuns[projectId] = {
          ...run,
          status: "APPLIED",
          proposals: [],
        };
        persistDb();
        return publicRun(db.refreshRuns[projectId] as StoredRun);
      },
      { latencyMs: 600 },
    ),
  discard: (projectId, runId) =>
    simulate("refresh.discard", () => {
      const db = getDb();
      const run = currentRun(projectId);
      if (run.id === runId) db.refreshRuns[projectId] = idle(projectId);
      persistDb();
      return publicRun(db.refreshRuns[projectId] as StoredRun);
    }),
};
