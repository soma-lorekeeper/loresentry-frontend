import { afterEach, describe, expect, it, vi } from "vitest";
import {
  authTransitionPending,
  withAuthTransition,
  withSessionRequest,
} from "./auth-transition";

afterEach(() => {
  vi.unstubAllGlobals();
  window.dispatchEvent(
    new PageTransitionEvent("pageshow", { persisted: true }),
  );
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe("auth boundary without Web Locks", () => {
  it("waits for old response processing, rejects new requests and serializes transitions", async () => {
    const old = deferred<string>();
    const completed = deferred<void>();
    const request = withSessionRequest(() => old.promise).catch(
      (error) => error,
    );
    const replace = vi.fn(() => completed.promise);
    const first = withAuthTransition(replace);
    await vi.waitFor(() => expect(authTransitionPending()).toBe(true));
    expect(replace).not.toHaveBeenCalled();
    const newRequest = vi.fn().mockResolvedValue("data");
    await expect(withSessionRequest(newRequest)).rejects.toMatchObject({
      code: "busy",
    });
    expect(newRequest).not.toHaveBeenCalled();
    const secondAction = vi.fn().mockResolvedValue(undefined);
    const second = withAuthTransition(secondAction);
    old.resolve("old data");
    expect(await request).toMatchObject({ code: "busy" });
    await vi.waitFor(() => expect(replace).toHaveBeenCalledOnce());
    expect(secondAction).not.toHaveBeenCalled();
    completed.resolve();
    await first;
    await second;
    expect(secondAction).toHaveBeenCalledOnce();
    expect(authTransitionPending()).toBe(false);
  });
});

describe.each([false, true])(
  "OAuth page lifecycle (Web Locks: %s)",
  (locks) => {
    function setupLocks() {
      if (!locks) return;
      let tail: Promise<unknown> = Promise.resolve();
      vi.stubGlobal("navigator", {
        locks: {
          request: vi.fn((_name, _options, run) => {
            const task = tail.then(run);
            tail = task.catch(() => {});
            return task;
          }),
        },
      });
    }

    it("releases the lock on departure without resuming the old caller, then recovers on Back", async () => {
      setupLocks();
      const navigate = vi.fn(() => new Promise<void>(() => {}));
      const resumed = vi.fn();
      void withAuthTransition(navigate, true).then(resumed);
      await vi.waitFor(() => expect(navigate).toHaveBeenCalledOnce());
      const marker = window.localStorage.getItem("ls.auth-transition");
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
      // The cookie boundary remains closed until callback or Back, although the
      // old page no longer monopolizes the exclusive lock.
      expect(authTransitionPending()).toBe(true);
      await Promise.resolve();
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
      expect(authTransitionPending()).toBe(false);
      expect(resumed).not.toHaveBeenCalled();
      const retry = vi.fn().mockResolvedValue(undefined);
      await withAuthTransition(retry);
      expect(retry).toHaveBeenCalledOnce();
      expect(window.localStorage.getItem("ls.auth-transition")).not.toBe(
        marker,
      );
      expect(resumed).not.toHaveBeenCalled();
    });

    it("allows another tab's transition and does not clear its marker when the old page returns", async () => {
      setupLocks();
      const navigate = vi.fn(() => new Promise<void>(() => {}));
      void withAuthTransition(navigate, true);
      await vi.waitFor(() => expect(navigate).toHaveBeenCalledOnce());
      window.dispatchEvent(
        new PageTransitionEvent("pagehide", { persisted: true }),
      );
      const next = deferred<void>();
      const action = vi.fn(() => next.promise);
      const second = withAuthTransition(action);
      await vi.waitFor(() => expect(action).toHaveBeenCalledOnce());
      const newer = window.localStorage.getItem("ls.auth-transition");
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
      expect(window.localStorage.getItem("ls.auth-transition")).toBe(newer);
      expect(authTransitionPending()).toBe(true);
      next.resolve();
      await second;
      expect(authTransitionPending()).toBe(false);
    });

    it("cleans up a failed navigation and permits retry", async () => {
      setupLocks();
      await expect(
        withAuthTransition(async () => {
          throw new Error("Navigation failed");
        }, true),
      ).rejects.toThrow("Navigation failed");
      expect(authTransitionPending()).toBe(false);
      await expect(withAuthTransition(async () => "retried")).resolves.toBe(
        "retried",
      );
    });
  },
);
