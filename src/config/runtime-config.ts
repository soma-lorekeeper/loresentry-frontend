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

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (!response.ok) return DEFAULT_RUNTIME_CONFIG;
    return parseRuntimeConfig(await response.json());
  } catch {
    return DEFAULT_RUNTIME_CONFIG;
  }
}
