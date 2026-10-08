import type { DocumentType } from "@/domain/document-types";
import type {
  DocumentContent,
  DocumentDraft,
  RefreshProposal,
  RefreshRun,
} from "@/domain/models";
import { t } from "@/i18n";

import { ServiceError } from "../errors";
import {
  ConflictError,
  type DocumentService,
  type FileService,
  type RefreshService,
  type VersionService,
} from "../ports";

import {
  buildProposals,
  parentOfAdded,
  pickSources,
  pickTargets,
  withRelation,
} from "./refresh-proposals";

export const EXTRACTION_MS = 4000;

interface StoredRun {
  run: RefreshRun;
  readyAt: number | null;
  done: string[];
}

export interface RunStore {
  read(projectId: string): StoredRun | null;
  write(projectId: string, value: StoredRun): void;
  clear(projectId: string): void;
}

const STORAGE_PREFIX = "loresentry.refresh.";

export function browserRunStore(): RunStore {
  const memory = new Map<string, StoredRun>();
  return {
    read(projectId) {
      try {
        const raw = window.localStorage.getItem(STORAGE_PREFIX + projectId);
        if (raw) return JSON.parse(raw) as StoredRun;
      } catch {
        return memory.get(projectId) ?? null;
      }
      return memory.get(projectId) ?? null;
    },
    write(projectId, value) {
      memory.set(projectId, value);
      try {
        window.localStorage.setItem(
          STORAGE_PREFIX + projectId,
          JSON.stringify(value),
        );
      } catch {
        return;
      }
    },
    clear(projectId) {
      memory.delete(projectId);
      try {
        window.localStorage.removeItem(STORAGE_PREFIX + projectId);
      } catch {
        return;
      }
    },
  };
}

export interface RefreshDependencies {
  files: Pick<FileService, "tree" | "create" | "moveToTrash">;
  documents: Pick<DocumentService, "get" | "save">;
  versions: Pick<VersionService, "saveNamed">;
  store?: RunStore;
  now?: () => number;
  newId?: () => string;
}

interface Pair {
  id: string;
  type: DocumentType;
  description: string;
}

function idle(projectId: string): RefreshRun {
  return {
    id: `run-idle-${projectId}`,
    projectId,
    status: "IDLE",
    startedAt: null,
    sourceFileIds: [],
    proposals: [],
    preview: true,
  };
}

function same(a: DocumentDraft | null, b: DocumentDraft | null): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function stale(title: string) {
  return new ServiceError(
    "validation",
    t("‘{title}’이 추출 뒤에 수정됐어요. 그래프를 다시 최신화해 주세요.", {
      title,
    }),
  );
}

function relationTargets(draft: DocumentDraft | null): Map<string, string> {
  const targets = new Map<string, string>();
  for (const property of draft?.properties ?? []) {
    if (property.kind !== "relation") continue;
    for (const id of property.targetIds)
      targets.set(id, property.descriptions[id] ?? "");
  }
  return targets;
}

function keepPairs(draft: DocumentDraft, pairs: Pair[] | undefined) {
  const present = relationTargets(draft);
  return (pairs ?? []).reduce(
    (acc, pair) =>
      present.has(pair.id)
        ? acc
        : withRelation(acc, pair.type, pair.id, pair.description),
    draft,
  );
}

function dropPairs(
  draft: DocumentDraft,
  current: DocumentDraft | null,
  dropped: Set<string> | undefined,
): DocumentDraft {
  const before = relationTargets(current);
  const gone = [...(dropped ?? [])].filter((id) => before.has(id));
  if (gone.length === 0) return draft;
  return {
    ...draft,
    properties: draft.properties.map((property) =>
      property.kind === "relation"
        ? {
            ...property,
            targetIds: property.targetIds.filter((id) => !gone.includes(id)),
          }
        : property,
    ),
  };
}

async function settled<T>(tasks: Promise<T>[]): Promise<T[]> {
  const results = await Promise.allSettled(tasks);
  return results.flatMap((result) =>
    result.status === "fulfilled" ? [result.value] : [],
  );
}

export function createApiRefresh({
  files,
  documents,
  versions,
  store = browserRunStore(),
  now = Date.now,
  newId = () => crypto.randomUUID(),
}: RefreshDependencies): RefreshService {
  const generating = new Map<string, Promise<RefreshProposal[]>>();

  const generate = async (run: RefreshRun) => {
    const tree = await files.tree(run.projectId);
    const sources = (
      await Promise.all(run.sourceFileIds.map((id) => documents.get(id)))
    ).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const targets: DocumentContent[] = await settled(
      pickTargets(tree, sources).map((node) => documents.get(node.id)),
    );
    return buildProposals({ tree, sources, targets, newId });
  };

  const generation = (run: RefreshRun) => {
    let pending = generating.get(run.id);
    if (!pending) {
      pending = generate(run);
      pending.catch(() => {});
      generating.set(run.id, pending);
    }
    return pending;
  };

  const current = async (projectId: string): Promise<RefreshRun> => {
    const stored = store.read(projectId);
    if (!stored) return idle(projectId);
    const { run, readyAt } = stored;
    if (run.status !== "RUNNING") return run;
    const pending = generation(run);
    if (readyAt !== null && now() < readyAt) return run;

    let next: RefreshRun;
    try {
      next = { ...run, status: "READY", proposals: await pending };
    } catch {
      next = { ...run, status: "FAILED" };
    }
    generating.delete(run.id);
    const latest = store.read(projectId);
    if (!latest || latest.run.id !== run.id || latest.run.status !== "RUNNING")
      return latest?.run ?? idle(projectId);
    store.write(projectId, { run: next, readyAt: null, done: [] });
    return next;
  };

  return {
    current,

    start: async (projectId) => {
      if ((await current(projectId)).status === "RUNNING") {
        throw new ServiceError(
          "busy",
          t("이미 그래프 최신화를 진행하고 있어요."),
        );
      }
      const tree = await files.tree(projectId);
      const run: RefreshRun = {
        id: newId(),
        projectId,
        status: "RUNNING",
        startedAt: new Date(now()).toISOString(),
        sourceFileIds: pickSources(tree),
        proposals: [],
        preview: true,
      };
      store.write(projectId, { run, readyAt: now() + EXTRACTION_MS, done: [] });
      generation(run);
      return run;
    },

    apply: async (projectId, runId, resolved) => {
      const stored = store.read(projectId);
      const run = stored?.run;
      if (!stored || !run || run.id !== runId || run.status !== "READY") {
        throw new ServiceError("validation", t("반영할 변경 사항이 없어요."));
      }
      if (run.proposals.some((proposal) => !(proposal.id in resolved))) {
        throw new ServiceError(
          "validation",
          t("아직 결정하지 않은 변경이 있어요."),
        );
      }

      const done = new Set(stored.done);
      const remember = () =>
        store.write(projectId, { ...stored, done: [...done] });
      const pending = run.proposals.filter((p) => !done.has(p.id));
      const modified = pending.filter(
        (proposal) =>
          proposal.kind === "modified" &&
          resolved[proposal.id] !== null &&
          !same(resolved[proposal.id], proposal.current),
      );

      const latest = await Promise.all(
        modified.map((proposal) => documents.get(proposal.fileId)),
      );
      modified.forEach((proposal, index) => {
        if (latest[index].revisionNo !== proposal.baseRevisionNo)
          throw stale(proposal.title);
      });

      const pairs = new Map<string, Pair[]>();
      const dropped = new Map<string, Set<string>>();
      const record = (proposal: RefreshProposal, final: DocumentDraft) => {
        const before = relationTargets(proposal.current);
        const after = relationTargets(final);
        for (const [id, description] of after) {
          if (before.has(id)) continue;
          pairs.set(id, [
            ...(pairs.get(id) ?? []),
            { id: proposal.fileId, type: proposal.docType, description },
          ]);
        }
        for (const id of before.keys()) {
          if (after.has(id)) continue;
          dropped.set(id, (dropped.get(id) ?? new Set()).add(proposal.fileId));
        }
      };

      for (const proposal of modified) {
        const final = dropPairs(
          keepPairs(
            resolved[proposal.id] as DocumentDraft,
            pairs.get(proposal.fileId),
          ),
          proposal.current,
          dropped.get(proposal.fileId),
        );
        await versions.saveNamed(proposal.fileId, t("그래프 최신화 반영 전"));
        try {
          await documents.save(proposal.fileId, {
            draft: final,
            ifMatchRevision: proposal.baseRevisionNo as number,
            saveId: newId(),
          });
        } catch (cause) {
          if (cause instanceof ConflictError) throw stale(proposal.title);
          throw cause;
        }
        record(proposal, final);
        done.add(proposal.id);
        remember();
      }

      for (const proposal of pending) {
        const final = resolved[proposal.id];
        if (proposal.kind === "added" && final) {
          const created = await files.create({
            projectId,
            parentId: parentOfAdded(proposal.fileId),
            kind: "document",
            title: final.title,
            docType: proposal.docType,
          });
          if (created.kind === "document") {
            await documents.save(created.id, {
              draft: final,
              ifMatchRevision: created.revisionNo,
              saveId: newId(),
            });
          }
        } else if (proposal.kind === "removed" && !final) {
          await files.moveToTrash(proposal.fileId);
        } else {
          continue;
        }
        done.add(proposal.id);
        remember();
      }

      const applied: RefreshRun = { ...run, status: "APPLIED", proposals: [] };
      store.write(projectId, { run: applied, readyAt: null, done: [] });
      return applied;
    },

    discard: async (projectId, runId) => {
      if (store.read(projectId)?.run.id === runId) store.clear(projectId);
      return idle(projectId);
    },
  };
}
