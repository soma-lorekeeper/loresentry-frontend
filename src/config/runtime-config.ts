export type DataSource = "mock" | "api";

export interface RuntimeConfig {
  apiBaseUrl: string;
  dataSource: DataSource;
  feedbackUrl: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
}

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  apiBaseUrl: "",
  dataSource: "mock",
  feedbackUrl: "",
  privacyPolicyUrl: "",
  termsOfServiceUrl: "",
};

function absoluteHttpUrl(value: unknown) {
  if (typeof value !== "string" || !value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : "";
  } catch {
    return "";
  }
}

export function parseRuntimeConfig(value: unknown): RuntimeConfig {
  if (!value || typeof value !== "object") return DEFAULT_RUNTIME_CONFIG;
  const raw = value as Record<string, unknown>;
  return {
    apiBaseUrl: absoluteHttpUrl(raw.apiBaseUrl),
    // 백엔드 API가 준비되기 전까지 기본값은 mock이다. api로 바꾸려면 services/api 어댑터가 필요하다.
    dataSource: raw.dataSource === "api" ? "api" : "mock",
    feedbackUrl: absoluteHttpUrl(raw.feedbackUrl),
    privacyPolicyUrl: absoluteHttpUrl(raw.privacyPolicyUrl),
    termsOfServiceUrl: absoluteHttpUrl(raw.termsOfServiceUrl),
  };
}

/**
 * URL 로 데이터 출처를 바꾼다: `?data=api` 또는 `?data=mock`.
 *
 * 배포된 사이트의 기본값을 건드리지 않고 실제 API 를 확인할 수 있어야 한다. 반대로 API 에 문제가
 * 있을 때 `?data=mock` 으로 화면만 따로 볼 수도 있다. `config.json` 을 고치면 배포가 필요하다.
 */
export function applyDataSourceOverride(config: RuntimeConfig): RuntimeConfig {
  if (typeof window === "undefined") return config;
  const requested = new URLSearchParams(window.location.search).get("data");
  if (requested !== "api" && requested !== "mock") return config;
  return { ...config, dataSource: requested };
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (!response.ok) return applyDataSourceOverride(DEFAULT_RUNTIME_CONFIG);
    return applyDataSourceOverride(parseRuntimeConfig(await response.json()));
  } catch {
    return applyDataSourceOverride(DEFAULT_RUNTIME_CONFIG);
  }
}
