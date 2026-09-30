import { describe, expect, it, vi } from "vitest";
import {
  authTransitionPending,
  withAuthTransition,
  withSessionRequest,
} from "./auth-transition";

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
