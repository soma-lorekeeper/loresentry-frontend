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

const OVERRIDE_KEY = "lk.dataSource";

function rememberedDataSource(): DataSource | null {
  try {
    const value = window.sessionStorage.getItem(OVERRIDE_KEY);
    return value === "api" || value === "mock" ? value : null;
  } catch {
    // 사생활 보호 모드 등에서 sessionStorage 접근 자체가 던진다. 없는 것으로 본다.
    return null;
  }
}

function rememberDataSource(value: DataSource) {
  try {
    window.sessionStorage.setItem(OVERRIDE_KEY, value);
  } catch {
    // 기억하지 못해도 이번 화면은 요청대로 돈다.
  }
}

/**
 * URL 로 데이터 출처를 바꾼다: `?data=api` 또는 `?data=mock`.
 *
 * 배포된 사이트의 기본값을 건드리지 않고 실제 API 를 확인할 수 있어야 한다. 반대로 API 에 문제가
 * 있을 때 `?data=mock` 으로 화면만 따로 볼 수도 있다. `config.json` 을 고치면 배포가 필요하다.
 *
 * <p><b>왜 탭에 기억하는가.</b> Google 로그인은 사이트를 떠나 돌아오는 왕복이고, BFF 는 **고정된**
 * `/login?result=...` 로 돌려보낸다(`loresentry-gateway/docs/FRONTEND_AUTH_CONTRACT.md`). 쿼리에만
 * 의존하면 그 왕복에서 `?data=api` 가 사라져, 실제로 로그인한 뒤에 화면이 mock 으로 돌아온다 —
 * 그러면 mock 씨앗 사용자로 "로그인된" 것처럼 보이고 실제 계정은 보이지 않는다. 그래서 요청을
 * 탭 수명 동안 기억한다. `?data=mock` 이면 다시 mock 으로 돌아가고, 탭을 닫으면 사라진다.
 */
export function applyDataSourceOverride(config: RuntimeConfig): RuntimeConfig {
  if (typeof window === "undefined") return config;
  const requested = new URLSearchParams(window.location.search).get("data");
  if (requested === "api" || requested === "mock") {
    rememberDataSource(requested);
    return { ...config, dataSource: requested };
  }
  const remembered = rememberedDataSource();
  return remembered ? { ...config, dataSource: remembered } : config;
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
