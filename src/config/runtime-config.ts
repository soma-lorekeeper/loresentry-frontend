export interface RuntimeConfig {
  apiBaseUrl: string | null;
}

interface RuntimeConfigResponse {
  json: () => Promise<unknown>;
  ok: boolean;
  status: number;
}

export type RuntimeConfigFetcher = (
  input: string,
  init?: RequestInit,
) => Promise<RuntimeConfigResponse>;

export function parseRuntimeConfig(value: unknown): RuntimeConfig {
  if (
    typeof value !== "object" ||
    value === null ||
    !("apiBaseUrl" in value) ||
    typeof value.apiBaseUrl !== "string"
  ) {
    throw new Error("config.json의 apiBaseUrl은 문자열이어야 합니다.");
  }

  const apiBaseUrl = value.apiBaseUrl.trim();
  if (!apiBaseUrl) return { apiBaseUrl: null };

  let url: URL;
  try {
    url = new URL(apiBaseUrl);
  } catch {
    throw new Error("config.json의 apiBaseUrl은 절대 URL이어야 합니다.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("config.json의 apiBaseUrl은 HTTP(S) URL이어야 합니다.");
  }

  return { apiBaseUrl: apiBaseUrl.replace(/\/+$/, "") };
}

export async function loadRuntimeConfig(
  fetcher: RuntimeConfigFetcher = fetch,
): Promise<RuntimeConfig> {
  const response = await fetcher("/config.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`config.json을 불러오지 못했습니다. (${response.status})`);
  }

  return parseRuntimeConfig(await response.json());
}
