import { t } from "@/i18n";

import { ServiceError } from "../errors";

// Every protected response may renew Set-Cookie. Drain responses under shared locks
// before any operation that replaces/deletes that cookie takes the exclusive lock.
const LOCK = "loresentry-auth";
const MARKER = "ls.auth-transition";
const EVENT = "ls-auth-transition";
let localMarker = "";
const active = new Set<Promise<unknown>>();
let fallbackTail: Promise<unknown> = Promise.resolve();
function marker(): string {
  try {
    return window.localStorage.getItem(MARKER) ?? "";
  } catch {
    return localMarker;
  }
}
function publish(value: string) {
  localMarker = value;
  try {
    window.localStorage.setItem(MARKER, value);
  } catch {
    /* Same-tab coordination remains available. */
  }
  window.dispatchEvent(new Event(EVENT));
}
export function authTransitionPending() {
  return marker().endsWith(":pending") || marker().endsWith(":navigation");
}
export function subscribeAuthTransition(listener: (external: boolean) => void) {
  const local = () => listener(false);
  const storage = (event: StorageEvent) => {
    if (event.key === MARKER) listener(true);
  };
  window.addEventListener(EVENT, local);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(EVENT, local);
    window.removeEventListener("storage", storage);
  };
}
export function finishAuthNavigation() {
  if (marker().endsWith(":navigation"))
    publish(`${crypto.randomUUID()}:complete`);
}
function changed() {
  return new ServiceError(
    "busy",
    t("로그인 상태가 변경됐어요. 다시 확인해 주세요."),
  );
}

export async function withSessionRequest<T>(run: () => Promise<T>): Promise<T> {
  const before = marker();
  if (authTransitionPending()) throw changed();
  const execute = async () => {
    if (marker() !== before || authTransitionPending()) throw changed();
    const result = await run();
    if (marker() !== before) throw changed();
    return result;
  };
  const task =
    typeof navigator !== "undefined" && navigator.locks
      ? navigator.locks.request(LOCK, { mode: "shared" }, execute)
      : execute();
  active.add(task);
  try {
    return await task;
  } finally {
    active.delete(task);
  }
}

export async function withAuthTransition<T>(
  run: () => Promise<T>,
  navigation = false,
): Promise<T> {
  let departed = false;
  const execute = async (drain: boolean) => {
    const token = crypto.randomUUID();
    let release!: (value: T) => void;
    const departure = new Promise<T>((resolve) => {
      release = resolve;
    });
    const leave = () => {
      departed = true;
      release(undefined as T);
    };
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted || !departed) return;
      window.removeEventListener("pageshow", restore);
      // A newer login in another tab owns its own marker.
      if (marker().startsWith(token)) publish(`${token}:complete`);
    };
    if (navigation) {
      window.addEventListener("pagehide", leave, { once: true });
      window.addEventListener("pageshow", restore);
    }
    publish(`${token}:${navigation ? "navigation" : "pending"}`);
    try {
      // Fallback also waits for response headers; aborting fetch is not sufficient.
      if (drain) await Promise.allSettled([...active]);
      return await (navigation ? Promise.race([run(), departure]) : run());
    } finally {
      window.removeEventListener("pagehide", leave);
      if (!departed) {
        window.removeEventListener("pageshow", restore);
        if (marker().startsWith(token)) publish(`${token}:complete`);
      }
    }
  };
  let result: T;
  if (typeof navigator !== "undefined" && navigator.locks) {
    result = await navigator.locks.request(LOCK, { mode: "exclusive" }, () =>
      execute(false),
    );
  } else {
    const task = fallbackTail.then(
      () => execute(true),
      () => execute(true),
    );
    fallbackTail = task.catch(() => {});
    result = await task;
  }
  // Release the lock at pagehide, but never resume the caller's post-login routing
  // when the old document is restored from the browser's back/forward cache.
  return departed ? new Promise<T>(() => {}) : result;
}
