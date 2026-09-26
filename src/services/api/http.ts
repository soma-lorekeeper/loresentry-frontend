import { ServiceError } from "../errors";

import { isRefreshable, toServiceError, type ApiErrorBody } from "./errors";

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  /** 문서 저장의 조건부 갱신 토큰. 서버는 이 헤더가 없으면 저장을 거절한다. */
  ifMatch?: number;
  /** 저장 재시도를 알아보는 멱등 키. 같은 값이면 서버가 revision 을 또 올리지 않는다. */
  saveId?: string;
  /** 오류에 붙일 연산 이름. 화면이 어느 요청이 실패했는지 구분할 때 쓴다. */
  operation?: string;
  signal?: AbortSignal;
}

export interface ApiFailure {
  status: number;
  body: ApiErrorBody | null;
}

interface Exchange {
  status: number;
  ok: boolean;
  payload: unknown;
}

const REFRESH_PATH = "/auth/tokens/refresh";
/** Web Locks 이름. 같은 프로필의 모든 탭이 이 하나를 두고 줄을 선다. */
const REFRESH_LOCK = "loresentry-token-refresh";
/** 마지막 재발급 시각. 탭 사이에 "이미 했다"를 알리는 유일한 수단이다. */
const REFRESH_MARK = "lk.tokenRefreshedAt";

/**
 * 한 곳에서 base URL, 신원 헤더, 오류 변환, 토큰 재발급을 맡는다. 포트 어댑터들은 경로와 본문만 안다.
 *
 * <p>새 엔드포인트를 붙일 때 여기를 고칠 일이 없도록, 메서드·조건부 헤더·멱등 키를 모두 옵션으로
 * 받는다. 확장은 `services/api/<port>.ts` 파일 하나를 더하는 것으로 끝난다.
 */
export class ApiClient {
  private refreshing: Promise<boolean> | null = null;

  constructor(readonly baseUrl: string) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const result = await this.exchange(path, options);

    if (result.status === 204) return undefined as T;
    if (!result.ok) {
      throw toServiceError(
        result.payload as ApiErrorBody | null,
        result.status,
        options.operation,
      );
    }
    return result.payload as T;
  }

  /**
   * 오류 본문까지 호출자가 봐야 하는 경우에 쓴다. 문서 저장 충돌이 그렇다 —
   * 응답에 현재 문서와 공통 조상이 실려 오므로 `ServiceError` 로 접으면 그 정보가 사라진다.
   */
  async requestAllowing<T>(
    path: string,
    allowedStatus: number[],
    options: RequestOptions = {},
  ): Promise<{ ok: true; data: T } | { ok: false; failure: ApiFailure }> {
    const result = await this.exchange(path, options);

    if (result.ok) return { ok: true, data: result.payload as T };
    if (allowedStatus.includes(result.status)) {
      return {
        ok: false,
        failure: {
          status: result.status,
          body: result.payload as ApiErrorBody,
        },
      };
    }
    throw toServiceError(
      result.payload as ApiErrorBody | null,
      result.status,
      options.operation,
    );
  }

  /**
   * AT 는 15분이다. 그것이 만료됐다고 거절된 요청은 **한 번** 재발급하고 **한 번만** 다시 보낸다.
   *
   * <p>재발급 대상은 `ACCESS_TOKEN_MISSING`·`ACCESS_TOKEN_EXPIRED` 뿐이다
   * (`loresentry-gateway/docs/auth/REFRESH_FLOW.md`). 모든 401 을 대상으로 삼으면 세션이 정말
   * 끝난 경우에도 재발급을 반복한다. 재발급 자체는 이 경로를 타지 않으므로 재귀하지 않는다.
   */
  private async exchange(
    path: string,
    options: RequestOptions,
  ): Promise<Exchange> {
    const first = await this.send(path, options);
    if (first.status !== 401) return first;

    const code = (first.payload as ApiErrorBody | null)?.code;
    if (!isRefreshable(code)) return first;
    if (!(await this.refresh())) return first;

    return this.send(path, options);
  }

  /**
   * 재발급은 한 번에 하나만 나간다.
   *
   * <p>같은 탭에서 동시에 거절된 요청들은 **하나의 결과**를 기다린다. 탭이 여러 개면 Web Locks 로
   * 줄을 세우고, 자기 차례에 "내가 거절당한 뒤 누군가 이미 갱신했다"면 부르지 않고 재시도만 한다.
   * 이 조율이 없으면 탭 수만큼 재발급이 나가고, RT 를 회전시키는 서버에서는 뒤늦은 요청이 이미
   * 쓰인 RT 를 들고 가 실패한다.
   */
  private refresh(): Promise<boolean> {
    this.refreshing ??= this.runRefresh().finally(() => {
      this.refreshing = null;
    });
    return this.refreshing;
  }

  private async runRefresh(): Promise<boolean> {
    const askedAt = Date.now();
    const run = async () => {
      if (refreshedSince(askedAt)) return true;

      // 재발급은 상태를 바꾸므로 CSRF 헤더가 필요하다. 실패한 재발급은 다시 시도하지 않는다.
      const response = await fetch(`${this.baseUrl}${REFRESH_PATH}`, {
        method: "POST",
        credentials: "include",
        headers: { "X-LS-CSRF": "1" },
      }).catch(() => null);

      if (!response?.ok) return false;
      markRefreshed();
      return true;
    };

    const locks = globalThis.navigator?.locks;
    if (!locks) return run();
    // 잠금 콜백의 타입은 동기 반환을 말하지만 실제로는 프로미스를 기다려 준다. await 로 벗긴다.
    return await locks.request(REFRESH_LOCK, run);
  }

  private async send(path: string, options: RequestOptions): Promise<Exchange> {
    const response = await this.fetch(path, options);
    const payload = response.status === 204 ? null : await readJson(response);
    return { status: response.status, ok: response.ok, payload };
  }

  private async fetch(
    path: string,
    options: RequestOptions,
  ): Promise<Response> {
    const method = options.method ?? "GET";
    const headers: Record<string, string> = {};
    if (options.body !== undefined)
      headers["Content-Type"] = "application/json";
    // BFF 계약: 상태를 바꾸는 요청에만 붙는다. 폼 제출·본문·쿼리 값으로 대신할 수 없으므로
    // 이 헤더의 존재 자체가 CSRF 방어가 된다.
    if (method !== "GET") headers["X-LS-CSRF"] = "1";
    // 서버는 따옴표 있는 형태와 없는 형태를 모두 받는다. ETag 관례를 따른다.
    if (options.ifMatch !== undefined)
      headers["If-Match"] = `"${options.ifMatch}"`;
    if (options.saveId) headers["X-Save-Id"] = options.saveId;

    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method,
        // 토큰은 HttpOnly 쿠키로만 오간다. 본문이나 URL 에서 AT·RT 를 읽지 않는다.
        credentials: "include",
        headers,
        body:
          options.body === undefined ? undefined : JSON.stringify(options.body),
        signal: options.signal,
      });
    } catch (cause) {
      // 요청이 나가지도 못했다. 서버 오류와 구분해 재시도 안내를 다르게 낼 수 있어야 한다.
      if (cause instanceof DOMException && cause.name === "AbortError")
        throw cause;
      throw new ServiceError(
        "network",
        "서버에 연결할 수 없어요.",
        options.operation,
      );
    }
  }
}

function refreshedSince(instant: number): boolean {
  try {
    const mark = Number(window.localStorage.getItem(REFRESH_MARK));
    return Number.isFinite(mark) && mark > instant;
  } catch {
    // 저장소를 읽을 수 없는 환경이면 탭 조율을 포기하고 스스로 갱신한다.
    return false;
  }
}

function markRefreshed() {
  try {
    window.localStorage.setItem(REFRESH_MARK, String(Date.now()));
  } catch {
    // 알리지 못해도 이 탭의 갱신은 끝났다.
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    // 서버가 JSON 이 아닌 것을 돌려줬다. 본문을 추측하지 않고 없는 것으로 본다.
    return null;
  }
}

export function query(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, value);
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
