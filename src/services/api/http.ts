import { t } from "@/i18n";

import { withSessionRequest } from "./auth-transition";
import { ServiceError } from "../errors";

import { toServiceError, type ApiErrorBody } from "./errors";

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
  expectedStatus?: number;
  /** Only for a request already inside the exclusive auth transition. */
  authTransition?: boolean;
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

/**
 * 한 곳에서 base URL, 신원 헤더, 오류 변환을 맡는다. 포트 어댑터들은 경로와 본문만 안다.
 *
 * <p>재발급은 없다. BFF 는 단일 세션 ID 쿠키를 쓰고 보호 요청이 성공할 때마다 수명을 연장하므로
 * 브라우저가 따로 연장을 요청할 일이 없다(`loresentry-gateway/docs/auth/SESSION_FLOW.md`).
 * 401 을 받은 요청을 자동으로 다시 보내지도 않는다 — 계약이 그것을 금한다.
 *
 * <p>새 엔드포인트를 붙일 때 여기를 고칠 일이 없도록, 메서드·조건부 헤더·멱등 키를 모두 옵션으로
 * 받는다. 확장은 `services/api/<port>.ts` 파일 하나를 더하는 것으로 끝난다.
 */
export class ApiClient {
  constructor(readonly baseUrl: string) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const result = await this.send(path, options);

    if (
      result.ok &&
      options.expectedStatus !== undefined &&
      result.status !== options.expectedStatus
    ) {
      throw new ServiceError(
        "unknown",
        t("서버 응답을 확인할 수 없어요."),
        options.operation,
      );
    }
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
    const result = await this.send(path, options);

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

  private async send(path: string, options: RequestOptions): Promise<Exchange> {
    const exchange = async () => {
      const response = await this.fetch(path, options);
      const payload = response.status === 204 ? null : await readJson(response);
      return { status: response.status, ok: response.ok, payload };
    };
    const route = path.split("?", 1)[0];
    return options.authTransition || route === "/auth/terms"
      ? exchange()
      : withSessionRequest(exchange);
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
        t("서버에 연결할 수 없어요."),
        options.operation,
      );
    }
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
