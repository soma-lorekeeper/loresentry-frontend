import { beforeEach, describe, expect, it, vi } from "vitest";

import { bodyFromPlainText, bodyToPlainText } from "@/domain/document-body";
import type {
  DocumentDraft,
  RefreshProposal,
  RefreshRun,
} from "@/domain/models";
import { clearMockRules, setMockLatency } from "@/services/mock/control";
import { GLASS_GARDEN_ID, getDb, resetDb } from "@/services/mock/db";
import {
  mockDocuments,
  mockVersions,
  readDocument,
} from "@/services/mock/documents";
import { mockFiles } from "@/services/mock/files";

import { isServiceError } from "../errors";
import type { DocumentService, SaveDocumentInput } from "../ports";

import { createApiRefresh, EXTRACTION_MS, type RunStore } from "./refresh";

function memoryStore(): RunStore & { raw: Map<string, unknown> } {
  const raw = new Map<string, unknown>();
  return {
    raw,
    read: (projectId) =>
      (raw.get(projectId) as ReturnType<RunStore["read"]>) ?? null,
    write: (projectId, value) => void raw.set(projectId, value),
    clear: (projectId) => void raw.delete(projectId),
  };
}

let clock: number;
let store: ReturnType<typeof memoryStore>;

function refreshWith(documents: Pick<DocumentService, "get" | "save">) {
  return createApiRefresh({
    files: mockFiles,
    documents,
    versions: mockVersions,
    store,
    now: () => clock,
  });
}

async function ready(refresh = refreshWith(mockDocuments)) {
  await refresh.start(GLASS_GARDEN_ID);
  clock += EXTRACTION_MS;
  return { refresh, run: await refresh.current(GLASS_GARDEN_ID) };
}

function acceptAll(run: RefreshRun) {
  return Object.fromEntries(run.proposals.map((p) => [p.id, p.proposed]));
}

function readyRun(proposals: RefreshProposal[]): RefreshRun {
  const run: RefreshRun = {
    id: "run-1",
    projectId: GLASS_GARDEN_ID,
    status: "READY",
    startedAt: null,
    sourceFileIds: [],
    proposals,
    preview: true,
  };
  store.write(GLASS_GARDEN_ID, { run, readyAt: null, done: [] });
  return run;
}

function modified(fileId: string, proposed: DocumentDraft): RefreshProposal {
  const current = readDocument(fileId);
  return {
    id: `proposal-${fileId}`,
    kind: "modified",
    fileId,
    title: current.title,
    docType: current.docType,
    baseRevisionNo: current.revisionNo,
    current: {
      title: current.title,
      body: current.body,
      properties: current.properties,
    },
    proposed,
  };
}

beforeEach(() => {
  resetDb();
  setMockLatency(0);
  clearMockRules();
  clock = 1_000_000;
  store = memoryStore();
});

describe("graph refresh preview", () => {
  it("extracts for a while, then offers proposals from the recent chapters", async () => {
    const refresh = refreshWith(mockDocuments);
    const started = await refresh.start(GLASS_GARDEN_ID);

    expect(started).toMatchObject({ status: "RUNNING", preview: true });
    expect(started.sourceFileIds).toHaveLength(3);
    expect((await refresh.current(GLASS_GARDEN_ID)).status).toBe("RUNNING");
    await expect(refresh.start(GLASS_GARDEN_ID)).rejects.toMatchObject({
      code: "busy",
    });

    clock += EXTRACTION_MS;
    const run = await refresh.current(GLASS_GARDEN_ID);
    expect(run.status).toBe("READY");
    expect(run.proposals.map((p) => p.title)).toEqual(["서윤", "정원 기록단"]);
    expect(await refresh.current(GLASS_GARDEN_ID)).toEqual(run);
  });

  it("writes the accepted drafts and keeps the state before them as a version", async () => {
    const { refresh, run } = await ready();
    const seoyun = run.proposals[0];

    const applied = await refresh.apply(
      GLASS_GARDEN_ID,
      run.id,
      acceptAll(run),
    );

    expect(applied).toMatchObject({ status: "APPLIED", proposals: [] });
    expect(bodyToPlainText(readDocument(seoyun.fileId).body)).toBe(
      bodyToPlainText(seoyun.proposed!.body),
    );
    const before = getDb().versions.find(
      (v) => v.fileId === seoyun.fileId && v.kind === "NAMED",
    );
    expect(bodyToPlainText(before!.snapshot.body)).toBe(
      bodyToPlainText(seoyun.current!.body),
    );
  });

  it("refuses to overwrite a document edited after extraction", async () => {
    const { refresh, run } = await ready();
    const seoyun = run.proposals[0];
    const edited = readDocument(seoyun.fileId);
    await mockDocuments.save(seoyun.fileId, {
      draft: { ...seoyun.current!, body: bodyFromPlainText("직접 고친 글") },
      ifMatchRevision: edited.revisionNo,
      saveId: "manual",
    });

    const error = await refresh
      .apply(GLASS_GARDEN_ID, run.id, acceptAll(run))
      .catch((cause: unknown) => cause);

    expect(isServiceError(error) && error.code).toBe("validation");
    expect(String((error as Error).message)).toContain("서윤");
    expect(bodyToPlainText(readDocument(seoyun.fileId).body)).toBe(
      "직접 고친 글",
    );
    expect(bodyToPlainText(readDocument(run.proposals[1].fileId).body)).toBe(
      bodyToPlainText(run.proposals[1].current!.body),
    );
  });

  it("skips documents kept as they are", async () => {
    const save = vi.fn(mockDocuments.save);
    const { refresh, run } = await ready(
      refreshWith({ get: mockDocuments.get, save }),
    );

    await refresh.apply(
      GLASS_GARDEN_ID,
      run.id,
      Object.fromEntries(run.proposals.map((p) => [p.id, p.current])),
    );

    expect(save).not.toHaveBeenCalled();
  });

  it("finishes the rest after a failure without redoing what was written", async () => {
    let fail = true;
    const save = vi.fn(async (fileId: string, input: SaveDocumentInput) => {
      if (save.mock.calls.length === 2 && fail) {
        fail = false;
        throw new Error("network");
      }
      return mockDocuments.save(fileId, input);
    });
    const { refresh, run } = await ready(
      refreshWith({ get: mockDocuments.get, save }),
    );

    await expect(
      refresh.apply(GLASS_GARDEN_ID, run.id, acceptAll(run)),
    ).rejects.toThrow("network");
    expect((await refresh.current(GLASS_GARDEN_ID)).status).toBe("READY");

    const applied = await refresh.apply(
      GLASS_GARDEN_ID,
      run.id,
      acceptAll(run),
    );
    expect(applied.status).toBe("APPLIED");
    expect(save.mock.calls.map(([id]) => id)).toEqual([
      run.proposals[0].fileId,
      run.proposals[1].fileId,
      run.proposals[1].fileId,
    ]);
  });

  it("does not let a later save undo a link an earlier one made", async () => {
    const saved: Record<string, DocumentDraft> = {};
    const refresh = refreshWith({
      get: mockDocuments.get,
      save: async (fileId, input) => {
        saved[fileId] = input.draft;
        return mockDocuments.save(fileId, input);
      },
    });
    const harinId = `${GLASS_GARDEN_ID}:c-harin`;
    const lensId = `${GLASS_GARDEN_ID}:i-lens`;
    const harin = readDocument(harinId);
    const lens = readDocument(lensId);
    const run = readyRun([
      modified(harinId, {
        ...harin,
        properties: [
          ...harin.properties.filter((p) => p.key !== "related_item"),
          {
            id: "relation:related_item",
            kind: "relation",
            key: "related_item",
            label: "관련 아이템",
            targetType: "item",
            targetIds: [lensId],
            descriptions: { [lensId]: "렌즈를 쥐었다." },
          },
        ],
      }),
      modified(lensId, { ...lens, body: bodyFromPlainText("금이 갔다.") }),
    ]);

    await refresh.apply(GLASS_GARDEN_ID, run.id, acceptAll(run));

    expect(saved[lensId].properties).toContainEqual(
      expect.objectContaining({
        key: "related_character",
        targetIds: expect.arrayContaining([harinId]),
        descriptions: expect.objectContaining({ [harinId]: "렌즈를 쥐었다." }),
      }),
    );
  });

  it("creates an accepted new document under the folder it was proposed for", async () => {
    const refresh = refreshWith(mockDocuments);
    const folder = (await mockFiles.tree(GLASS_GARDEN_ID)).find(
      (n) =>
        n.kind === "folder" && n.role === "category" && n.category === "event",
    )!;
    const draft: DocumentDraft = {
      title: "잠긴 문에서 생긴 일",
      body: bodyFromPlainText("문이 열렸다."),
      properties: [],
    };
    const run = readyRun([
      {
        id: "new-event",
        kind: "added",
        fileId: `new:${folder.id}:x`,
        title: draft.title,
        docType: "event",
        baseRevisionNo: null,
        current: null,
        proposed: draft,
      },
    ]);

    await refresh.apply(GLASS_GARDEN_ID, run.id, { "new-event": draft });

    const created = (await mockFiles.tree(GLASS_GARDEN_ID)).find(
      (n) => n.title === draft.title,
    )!;
    expect(created).toMatchObject({ parentId: folder.id, docType: "event" });
    expect(bodyToPlainText(readDocument(created.id).body)).toBe("문이 열렸다.");
  });

  it("asks for every proposal to be decided and forgets a discarded run", async () => {
    const { refresh, run } = await ready();

    await expect(
      refresh.apply(GLASS_GARDEN_ID, run.id, {}),
    ).rejects.toMatchObject({ code: "validation" });

    expect(await refresh.discard(GLASS_GARDEN_ID, run.id)).toMatchObject({
      status: "IDLE",
    });
    expect(store.raw.size).toBe(0);
  });

  it("turns a failed extraction into FAILED and can start again", async () => {
    const refresh = refreshWith({
      get: () => Promise.reject(new Error("offline")),
      save: mockDocuments.save,
    });
    await refresh.start(GLASS_GARDEN_ID);
    clock += EXTRACTION_MS;
    const failed = await refresh.current(GLASS_GARDEN_ID);

    expect(failed.status).toBe("FAILED");
    expect((await refresh.start(GLASS_GARDEN_ID)).status).toBe("RUNNING");
  });
});
