import { ServiceError } from "../errors";

import { toServiceError, type ApiErrorBody } from "./errors";
import { devUserId } from "./identity";

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

/**
 * 한 곳에서 base URL, 신원 헤더, 오류 변환을 맡는다. 포트 어댑터들은 경로와 본문만 안다.
 *
 * <p>새 엔드포인트를 붙일 때 여기를 고칠 일이 없도록, 메서드·조건부 헤더·멱등 키를 모두 옵션으로
 * 받는다. 확장은 `services/api/<port>.ts` 파일 하나를 더하는 것으로 끝난다.
 */
export class ApiClient {
  constructor(private readonly baseUrl: string) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await this.send(path, options);

    if (response.status === 204) return undefined as T;
    const payload = await readJson(response);

    if (!response.ok) {
      throw toServiceError(
        payload as ApiErrorBody | null,
        response.status,
        options.operation,
      );
    }
    return payload as T;
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
    const response = await this.send(path, options);
    const payload = response.status === 204 ? null : await readJson(response);

    if (response.ok) return { ok: true, data: payload as T };
    if (allowedStatus.includes(response.status)) {
      return {
        ok: false,
        failure: { status: response.status, body: payload as ApiErrorBody },
      };
    }
    throw toServiceError(
      payload as ApiErrorBody | null,
      response.status,
      options.operation,
    );
  }

  private async send(path: string, options: RequestOptions): Promise<Response> {
    const headers: Record<string, string> = { "X-User-Id": devUserId() };
    if (options.body !== undefined)
      headers["Content-Type"] = "application/json";
    // 서버는 따옴표 있는 형태와 없는 형태를 모두 받는다. ETag 관례를 따른다.
    if (options.ifMatch !== undefined)
      headers["If-Match"] = `"${options.ifMatch}"`;
    if (options.saveId) headers["X-Save-Id"] = options.saveId;

    try {
      return await fetch(`${this.baseUrl}${path}`, {
        method: options.method ?? "GET",
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
