import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearMockRules,
  setMockLatency,
  setMockRule,
} from "@/services/mock/control";
import { GLASS_GARDEN_ID, resetDb } from "@/services/mock/db";
import { mockDocuments } from "@/services/mock/documents";
import { ServiceError } from "@/services/errors";

import {
  DocumentSession,
  SAVE_IDLE_MS,
  SAVE_MAX_WAIT_MS,
} from "./document-session";
import { bodyFromPlainText, bodyToPlainText } from "@/domain/document-body";

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
  it("keeps an expired-session draft without background saves until an explicit retry", async () => {
    const save = vi
      .fn(mockDocuments.save)
      .mockRejectedValueOnce(
        new ServiceError("unauthenticated", "login required"),
      );
    const session = new DocumentSession(
      fileId,
      { ...mockDocuments, save },
      vi.fn(),
    );
    session.hydrate(await mockDocuments.get(fileId));
    session.update({ body: bodyFromPlainText("로그인 만료 전 초안") });
    await session.save();
    expect(session.getSnapshot().status).toBe("expired");
    session.update({ body: bodyFromPlainText("로그인 만료 후에도 지킨 초안") });
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS + SAVE_IDLE_MS);
    await session.save();
    await session.dispose();
    expect(save).toHaveBeenCalledTimes(1);
    expect(session.hasUnsavedChanges).toBe(true);
    expect(bodyToPlainText(session.getSnapshot().draft!.body)).toBe(
      "로그인 만료 후에도 지킨 초안",
    );
    await session.retry();
    expect(save).toHaveBeenCalledTimes(2);
    expect(session.getSnapshot().status).toBe("saved");
    expect(bodyToPlainText((await mockDocuments.get(fileId)).body)).toBe(
      "로그인 만료 후에도 지킨 초안",
    );
  });
  it("saves after the idle delay", async () => {
    const { session, saved } = await hydrated();
    session.update({ body: bodyFromPlainText("새 문장") });
    expect(session.getSnapshot().status).toBe("dirty");
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    expect(saved).toHaveBeenCalledOnce();
    expect(session.getSnapshot().status).toBe("saved");
  });

  it("does not let continuous typing postpone saving past the max wait", async () => {
    const { session, saved } = await hydrated();
    for (let elapsed = 0; elapsed < SAVE_MAX_WAIT_MS; elapsed += 400) {
      session.update({ body: bodyFromPlainText(`타이핑 ${elapsed}`) });
      await vi.advanceTimersByTimeAsync(400);
    }
    expect(saved).toHaveBeenCalled();
  });

  it("keeps the draft and reports an error when saving fails", async () => {
    const { session } = await hydrated();
    setMockRule("documents.save", "fail");
    session.update({ body: bodyFromPlainText("지키고 싶은 문장") });
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    expect(session.getSnapshot()).toMatchObject({
      status: "error",
      draft: { body: bodyFromPlainText("지키고 싶은 문장") },
    });
    setMockRule("documents.save", null);
    await session.retry();
    expect(session.getSnapshot().status).toBe("saved");
  });

  it("merges a conflicting save that touched another paragraph", async () => {
    const { session } = await hydrated();
    const original = session.getSnapshot().draft!;
    const paragraphs = bodyToPlainText(original.body).split("\n");
    const other = await mockDocuments.get(fileId);
    await mockDocuments.save(fileId, {
      draft: {
        ...original,
        body: bodyFromPlainText(
          [paragraphs[0], paragraphs[1], "다른 탭의 셋째 문단"].join("\n"),
        ),
      },
      ifMatchRevision: other.revisionNo,
      saveId: "other-tab",
    });
    session.update({
      body: bodyFromPlainText(
        ["이 탭의 첫 문단", paragraphs[1], paragraphs[2]].join("\n"),
      ),
    });
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    await vi.runAllTimersAsync();
    const final = await mockDocuments.get(fileId);
    expect(bodyToPlainText(final.body)).toBe(
      ["이 탭의 첫 문단", paragraphs[1], "다른 탭의 셋째 문단"].join("\n"),
    );
    expect(session.getSnapshot().status).toBe("saved");
  });

  it("stops at a conflict when both sides edit the same paragraph", async () => {
    const { session } = await hydrated();
    const original = session.getSnapshot().draft!;
    const other = await mockDocuments.get(fileId);
    await mockDocuments.save(fileId, {
      draft: { ...original, body: bodyFromPlainText("다른 탭이 모두 고침") },
      ifMatchRevision: other.revisionNo,
      saveId: "other-tab",
    });
    session.update({ body: bodyFromPlainText("이 탭도 모두 고침") });
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    expect(session.getSnapshot().status).toBe("conflict");
    await session.keepMine();
    expect(bodyToPlainText((await mockDocuments.get(fileId)).body)).toBe(
      "이 탭도 모두 고침",
    );
  });

  it("does not reset the editor when its own save comes back", async () => {
    const { session } = await hydrated();
    const version = session.getSnapshot().contentVersion;
    session.update({ body: bodyFromPlainText("새 문장") });
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    session.hydrate(await mockDocuments.get(fileId));
    expect(session.getSnapshot().contentVersion).toBe(version);
  });

  it("keeps a conflict unresolved across background saves and further typing", async () => {
    const { session } = await hydrated();
    const original = session.getSnapshot().draft!;
    const other = await mockDocuments.get(fileId);
    await mockDocuments.save(fileId, {
      draft: { ...original, body: bodyFromPlainText("먼저 저장한 다른 탭") },
      ifMatchRevision: other.revisionNo,
      saveId: "other-tab",
    });
    session.update({ body: bodyFromPlainText("해결하지 않은 내 초안") });
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    expect(session.getSnapshot().status).toBe("conflict");

    await session.save();
    await session.dispose();
    session.update({ body: bodyFromPlainText("계속 쓰고 있는 내 초안") });
    await vi.advanceTimersByTimeAsync(SAVE_MAX_WAIT_MS);
    expect(session.getSnapshot().status).toBe("conflict");
    expect(bodyToPlainText((await mockDocuments.get(fileId)).body)).toBe(
      "먼저 저장한 다른 탭",
    );
    expect(bodyToPlainText(session.getSnapshot().draft!.body)).toBe(
      "계속 쓰고 있는 내 초안",
    );

    await session.keepMine();
    expect(bodyToPlainText((await mockDocuments.get(fileId)).body)).toBe(
      "계속 쓰고 있는 내 초안",
    );
  });

  it("ignores updates that change nothing and returns to saved after undoing", async () => {
    const { session } = await hydrated();
    const original = session.getSnapshot().draft!;
    session.update({ body: original.body });
    expect(session.getSnapshot().status).toBe("saved");
    session.update({ body: bodyFromPlainText("잠깐 고침") });
    session.update({ body: original.body });
    expect(session.getSnapshot().status).toBe("saved");
  });

  it("refuses edits while the document is locked", async () => {
    await mockDocuments.setLocked(fileId, true);
    const { session } = await hydrated();
    session.update({ body: bodyFromPlainText("잠긴 문서") });
    expect(session.getSnapshot()).toMatchObject({ status: "locked" });
    expect(bodyToPlainText(session.getSnapshot().draft!.body)).not.toBe(
      "잠긴 문서",
    );
  });

  it("still reports an unsaved draft if another tab locks the document", async () => {
    const { session } = await hydrated();
    session.update({ body: bodyFromPlainText("잠금 전에 쓰던 초안") });
    await mockDocuments.setLocked(fileId, true);
    await session.save();
    expect(session.getSnapshot().status).toBe("locked");
    expect(session.hasUnsavedChanges).toBe(true);
    expect(bodyToPlainText(session.getSnapshot().draft!.body)).toBe(
      "잠금 전에 쓰던 초안",
    );
  });

  it("merges instead of overwriting when another save arrives while editing", async () => {
    const { session } = await hydrated();
    const original = session.getSnapshot().draft!;
    const paragraphs = bodyToPlainText(original.body).split("\n");

    const other = new DocumentSession(fileId, mockDocuments, () => {});
    other.hydrate(await mockDocuments.get(fileId));
    other.update({
      body: bodyFromPlainText(
        [paragraphs[0], paragraphs[1], "다른 창에서 고친 마지막 문단"].join(
          "\n",
        ),
      ),
    });
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);

    session.update({
      body: bodyFromPlainText(
        ["이 창에서 고친 첫 문단", paragraphs[1], paragraphs[2]].join("\n"),
      ),
    });
    session.hydrate(await mockDocuments.get(fileId));
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);

    const stored = bodyToPlainText((await mockDocuments.get(fileId)).body);
    expect(stored).toContain("이 창에서 고친 첫 문단");
    expect(stored).toContain("다른 창에서 고친 마지막 문단");
  });
});
