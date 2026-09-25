import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { DocumentSession, SAVE_IDLE_MS } from "./document-session";
import { draftRecovery } from "./draft-recovery";
import { ServiceError } from "@/services/errors";
import { mockDocuments } from "@/services/mock/documents";
import { GLASS_GARDEN_ID, resetDb } from "@/services/mock/db";
import { setMockLatency } from "@/services/mock/control";
const fileId = `${GLASS_GARDEN_ID}:ch-12`;
beforeEach(() => {
  resetDb();
  setMockLatency(0);
  window.sessionStorage.clear();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});
it.each(["session-required", "session-unavailable", "network"] as const)(
  "preserves drafts and stops automatic retries after %s",
  async (code) => {
    const content = await mockDocuments.get(fileId);
    const save = vi.fn().mockRejectedValue(new ServiceError(code, "failed"));
    const recovery = draftRecovery("owner", fileId);
    const session = new DocumentSession(
      fileId,
      { ...mockDocuments, save },
      vi.fn(),
      () => "same-save",
      recovery,
    );
    session.hydrate(content);
    session.update({ bodyMd: "내가 쓴 내용" });
    await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
    session.update({ title: "계속 보관할 제목" });
    await session.dispose();
    await vi.advanceTimersByTimeAsync(14 * 24 * 60 * 60 * 1000);
    expect(save).toHaveBeenCalledOnce();
    expect(session.getSnapshot().draft?.bodyMd).toBe("내가 쓴 내용");
    expect(recovery.load()?.draft.title).toBe("계속 보관할 제목");
    expect(draftRecovery("other", fileId).load()).toBeNull();
    const restoredSave = vi.fn().mockResolvedValue({
      ...content,
      bodyMd: "내가 쓴 내용",
      title: "계속 보관할 제목",
      revisionNo: content.revisionNo + 1,
    });
    const restored = new DocumentSession(
      fileId,
      { ...mockDocuments, save: restoredSave },
      vi.fn(),
      () => "explicit-save",
      recovery,
    );
    restored.hydrate({ ...content, revisionNo: content.revisionNo + 1 });
    await vi.runAllTimersAsync();
    expect(restoredSave).not.toHaveBeenCalled();
    expect(restored.getSnapshot().draft?.bodyMd).toBe("내가 쓴 내용");
    await restored.retry();
    expect(restoredSave.mock.calls[0][1].ifMatchRevision).toBe(
      content.revisionNo,
    );
    expect(recovery.load()).toBeNull();
  },
);
it("reuses the same idempotency key after an uncertain response to the same draft", async () => {
  const content = await mockDocuments.get(fileId);
  const save = vi
    .fn()
    .mockRejectedValueOnce(new ServiceError("network", "lost"))
    .mockResolvedValue({
      ...content,
      bodyMd: "saved once",
      revisionNo: content.revisionNo + 1,
    });
  const id = vi
    .fn()
    .mockReturnValueOnce("first-id")
    .mockReturnValue("second-id");
  const session = new DocumentSession(
    fileId,
    { ...mockDocuments, save },
    vi.fn(),
    id,
    draftRecovery("owner", fileId),
  );
  session.hydrate(content);
  session.update({ bodyMd: "saved once" });
  await vi.advanceTimersByTimeAsync(SAVE_IDLE_MS);
  await session.retry();
  expect(save).toHaveBeenCalledTimes(2);
  expect(save.mock.calls[0][1]).toEqual(save.mock.calls[1][1]);
  expect(id).toHaveBeenCalledOnce();
});
it("pauses pending autosave on an auth transition without clearing text", async () => {
  const save = vi.fn();
  const session = new DocumentSession(
    fileId,
    { ...mockDocuments, save },
    vi.fn(),
  );
  session.hydrate(await mockDocuments.get(fileId));
  session.update({ bodyMd: "보관" });
  session.pause();
  await vi.runAllTimersAsync();
  await session.dispose();
  expect(save).not.toHaveBeenCalled();
  expect(session.getSnapshot().draft?.bodyMd).toBe("보관");
});
