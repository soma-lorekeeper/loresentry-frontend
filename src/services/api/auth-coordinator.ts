import { ServiceError } from "../errors";

export type AuthPhase =
  "active" | "transition" | "login" | "signed-out" | "required";
export interface AuthState {
  generation: string;
  phase: AuthPhase;
}
const STATE_KEY = "loresentry.authTransition";
const LOGIN_KEY = "loresentry.loginTransition";
const REQUEST_LOCK = "loresentry.auth.requests";
const TRANSITION_LOCK = "loresentry.auth.transition";
const EVENT = "loresentry-auth-state";
const INITIAL: AuthState = { generation: "initial", phase: "active" };

// Shared locks cover the complete fetch, including response headers and body. We do
// not abort an underlying fetch to release a lock: abort does not undo Set-Cookie.
export class AuthCoordinator {
  private completion?: { generation: string; promise: Promise<unknown> };
  state(): AuthState {
    if (typeof window === "undefined") return INITIAL;
    try {
      const raw = window.localStorage.getItem(STATE_KEY);
      if (!raw) return INITIAL;
      const state = JSON.parse(raw) as AuthState;
      if (
        typeof state.generation === "string" &&
        ["active", "transition", "login", "signed-out", "required"].includes(
          state.phase,
        )
      )
        return state;
    } catch {
      /* Storage is required for coordination across navigation. */
    }
    return { generation: "unavailable", phase: "required" };
  }

  subscribe = (listener: () => void) => {
    const storage = (event: StorageEvent) => {
      if (event.key === STATE_KEY || event.key === null) listener();
    };
    window.addEventListener("storage", storage);
    window.addEventListener(EVENT, listener);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener(EVENT, listener);
    };
  };

  private write(state: AuthState) {
    try {
      window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
    } catch {
      throw new ServiceError(
        "session-unavailable",
        "탭 간 로그인 상태를 공유할 수 없어요. 브라우저 저장소 설정을 확인해 주세요.",
      );
    }
    window.dispatchEvent(new Event(EVENT));
  }

  private locks() {
    if (typeof navigator === "undefined" || !navigator.locks)
      throw new ServiceError(
        "session-unavailable",
        "이 브라우저에서는 안전한 로그인 전환을 지원하지 않아요.",
      );
    return navigator.locks;
  }

  async request<T>(
    operation: () => Promise<T>,
    signal?: AbortSignal,
  ): Promise<T> {
    const before = this.state();
    const blocked = () =>
      new ServiceError(
        before.phase === "required" || before.phase === "signed-out"
          ? "session-required"
          : "busy",
        "로그인 전환 중에는 요청을 시작할 수 없어요.",
      );
    if (before.phase !== "active") throw blocked();
    if (signal?.aborted) throw new DOMException("Cancelled", "AbortError");
    const result = await this.locks().request(
      REQUEST_LOCK,
      { mode: "shared" },
      async () => {
        if (
          this.state().generation !== before.generation ||
          this.state().phase !== "active"
        )
          throw blocked();
        try {
          return await operation();
        } catch (error) {
          if (this.state().generation !== before.generation)
            throw new DOMException("Stale authentication result", "AbortError");
          if (
            this.state().generation === before.generation &&
            error instanceof ServiceError &&
            error.code === "session-required"
          ) {
            this.write({ ...before, phase: "required" });
          }
          throw error;
        }
      },
    );
    if (signal?.aborted || this.state().generation !== before.generation)
      throw new DOMException("Stale authentication result", "AbortError");
    return result;
  }

  async transition<T>(
    kind: "login" | "logout",
    operation: () => Promise<T>,
    recover = false,
  ): Promise<T> {
    return this.locks().request(TRANSITION_LOCK, async () => {
      const previous = this.state();
      if (
        !recover &&
        (previous.phase === "login" || previous.phase === "transition")
      ) {
        throw new ServiceError(
          "busy",
          "다른 로그인 창의 처리를 마쳐 주세요. 창이 닫혔다면 중단된 로그인을 복구할 수 있어요.",
        );
      }
      const generation = crypto.randomUUID();
      this.write({ generation, phase: "transition" });
      return this.locks().request(
        REQUEST_LOCK,
        { mode: "exclusive" },
        async () => {
          try {
            if (kind === "login") {
              window.sessionStorage.setItem(LOGIN_KEY, generation);
              this.write({ generation, phase: "login" });
            }
            return await operation();
          } finally {
            if (kind === "logout")
              this.write({ generation, phase: "signed-out" });
          }
        },
      );
    });
  }

  completeLogin<T>(verify: () => Promise<T | null>): Promise<T | null> {
    const generation = this.state().generation;
    if (this.completion?.generation === generation)
      return this.completion.promise as Promise<T | null>;
    const promise = this.verifyLogin(verify).catch((error) => {
      this.completion = undefined;
      throw error;
    });
    this.completion = { generation, promise };
    return promise;
  }

  private async verifyLogin<T>(
    verify: () => Promise<T | null>,
  ): Promise<T | null> {
    return this.locks().request(TRANSITION_LOCK, () =>
      this.locks().request(REQUEST_LOCK, { mode: "exclusive" }, async () => {
        const state = this.state();
        const owner = window.sessionStorage.getItem(LOGIN_KEY);
        if (!owner || owner !== state.generation || state.phase !== "login")
          throw new ServiceError(
            "session-required",
            "이전 로그인 결과예요. 다시 로그인해 주세요.",
          );
        const user = await verify();
        this.write({ ...state, phase: user ? "active" : "required" });
        window.sessionStorage.removeItem(LOGIN_KEY);
        return user;
      }),
    );
  }

  async cancelLogin() {
    await this.locks().request(TRANSITION_LOCK, async () => {
      const state = this.state();
      if (
        state.phase === "login" &&
        window.sessionStorage.getItem(LOGIN_KEY) === state.generation
      ) {
        this.write({ ...state, phase: "required" });
        window.sessionStorage.removeItem(LOGIN_KEY);
      }
    });
  }
}

export const authCoordinator = new AuthCoordinator();
