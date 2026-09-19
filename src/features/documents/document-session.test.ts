import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearMockRules,
  setMockLatency,
  setMockRule,
} from "@/services/mock/control";
import { GLASS_GARDEN_ID, resetDb } from "@/services/mock/db";
import { mockDocuments } from "@/services/mock/documents";

import {
  DocumentSession,
  SAVE_IDLE_MS,
  SAVE_MAX_WAIT_MS,
} from "./document-session";

const fileId = `${GLASS_GARDEN_ID}:ch-12`;

async function hydrated() {
  const saved = vi.fn();
  const session = new DocumentSession(fileId, mockDocuments, saved);
  session.hydrate(await mockDocuments.get(fileId));
  return { session, saved };
}

beforeEach(() => {
  resetDb();
  clearMockRules();
  setMockLatency(0);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DocumentSession", () => {
  it("saves after the idle delay", async () => {
    const { session, saved } = await hydrated();
    session.update({ bodyMd: "새 문장" });
    expect(session.getSnapshot().status).toBe("dirty");
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    expect(saved).toHaveBeenCalledOnce();
    expect(session.getSnapshot().status).toBe("saved");
  });

  it("does not let continuous typing postpone saving past the max wait", async () => {
    const { session, saved } = await hydrated();
    for (let elapsed = 0; elapsed < SAVE_MAX_WAIT_MS; elapsed += 400) {
      session.update({ bodyMd: `타이핑 ${elapsed}` });
      await vi.advanceTimersByTimeAsync(400);
    }
    expect(saved).toHaveBeenCalled();
  });

  it("keeps the draft and reports an error when saving fails", async () => {
    const { session } = await hydrated();
    setMockRule("documents.save", "fail");
    session.update({ bodyMd: "지키고 싶은 문장" });
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    expect(session.getSnapshot()).toMatchObject({
      status: "error",
      draft: { bodyMd: "지키고 싶은 문장" },
    });
    setMockRule("documents.save", null);
    await session.retry();
    expect(session.getSnapshot().status).toBe("saved");
  });

  it("merges a conflicting save that touched another paragraph", async () => {
    const { session } = await hydrated();
    const original = session.getSnapshot().draft!;
    const paragraphs = original.bodyMd.split("\n\n");
    const other = await mockDocuments.get(fileId);
    await mockDocuments.save(fileId, {
      draft: {
        ...original,
        bodyMd: [paragraphs[0], paragraphs[1], "다른 탭의 셋째 문단"].join(
          "\n\n",
        ),
      },
      ifMatchRevision: other.revisionNo,
      saveId: "other-tab",
    });
    session.update({
      bodyMd: ["이 탭의 첫 문단", paragraphs[1], paragraphs[2]].join("\n\n"),
    });
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    await vi.runAllTimersAsync();
    const final = await mockDocuments.get(fileId);
    expect(final.bodyMd).toBe(
      ["이 탭의 첫 문단", paragraphs[1], "다른 탭의 셋째 문단"].join("\n\n"),
    );
    expect(session.getSnapshot().status).toBe("saved");
  });

  it("stops at a conflict when both sides edit the same paragraph", async () => {
    const { session } = await hydrated();
    const original = session.getSnapshot().draft!;
    const other = await mockDocuments.get(fileId);
    await mockDocuments.save(fileId, {
      draft: { ...original, bodyMd: "다른 탭이 모두 고침" },
      ifMatchRevision: other.revisionNo,
      saveId: "other-tab",
    });
    session.update({ bodyMd: "이 탭도 모두 고침" });
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    expect(session.getSnapshot().status).toBe("conflict");
    await session.keepMine();
    expect((await mockDocuments.get(fileId)).bodyMd).toBe("이 탭도 모두 고침");
  });

  it("does not reset the editor when its own save comes back", async () => {
    const { session } = await hydrated();
    const version = session.getSnapshot().contentVersion;
    session.update({ bodyMd: "새 문장" });
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    session.hydrate(await mockDocuments.get(fileId));
    expect(session.getSnapshot().contentVersion).toBe(version);
  });

  it("ignores updates that change nothing and returns to saved after undoing", async () => {
    const { session } = await hydrated();
    const original = session.getSnapshot().draft!;
    session.update({ bodyMd: original.bodyMd });
    expect(session.getSnapshot().status).toBe("saved");
    session.update({ bodyMd: "잠깐 고침" });
    session.update({ bodyMd: original.bodyMd });
    expect(session.getSnapshot().status).toBe("saved");
  });

  it("refuses edits while the document is locked", async () => {
    await mockDocuments.setLocked(fileId, true);
    const { session } = await hydrated();
    session.update({ bodyMd: "잠긴 문서" });
    expect(session.getSnapshot()).toMatchObject({ status: "locked" });
    expect(session.getSnapshot().draft?.bodyMd).not.toBe("잠긴 문서");
  });

  it("merges instead of overwriting when another save arrives while editing", async () => {
    const { session } = await hydrated();
    const original = session.getSnapshot().draft!;
    const paragraphs = original.bodyMd.split("\n\n");

    const other = new DocumentSession(fileId, mockDocuments, () => {});
    other.hydrate(await mockDocuments.get(fileId));
    other.update({
      bodyMd: [
        paragraphs[0],
        paragraphs[1],
        "다른 창에서 고친 마지막 문단",
      ].join("\n\n"),
    });
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);

    session.update({
      bodyMd: ["이 창에서 고친 첫 문단", paragraphs[1], paragraphs[2]].join(
        "\n\n",
      ),
    });
    session.hydrate(await mockDocuments.get(fileId));
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);

    const stored = (await mockDocuments.get(fileId)).bodyMd;
    expect(stored).toContain("이 창에서 고친 첫 문단");
    expect(stored).toContain("다른 창에서 고친 마지막 문단");
  });
});
