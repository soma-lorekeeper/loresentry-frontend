import deployedConfig from "../../public/config.json";

export type DataSource = "mock" | "api";

export interface RuntimeConfig {
  apiBaseUrl: string;
  dataSource: DataSource;
  /** 피드백 폼 주소. 없으면 `contactEmail` 로 메일을 쓴다. */
  feedbackUrl: string;
  /** 문의·피드백을 받을 주소. 바닥글의 연락처이기도 하다. */
  contactEmail: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  gaMeasurementId: string;
}

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  apiBaseUrl: "",
  dataSource: "mock",
  feedbackUrl: "",
  contactEmail: "",
  privacyPolicyUrl: "/policies/privacy/",
  termsOfServiceUrl: "/policies/terms/",
  gaMeasurementId: "",
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

/** 주소처럼 보이지 않는 값은 버린다. 링크로 만들면 죽은 링크가 된다. */
function emailAddress(value: unknown) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : "";
}

function measurementId(value: unknown) {
  return typeof value === "string" && /^G-[A-Z0-9]+$/.test(value) ? value : "";
}

export function parseRuntimeConfig(value: unknown): RuntimeConfig {
  if (!value || typeof value !== "object") return DEFAULT_RUNTIME_CONFIG;
  const raw = value as Record<string, unknown>;
  return {
    apiBaseUrl: absoluteHttpUrl(raw.apiBaseUrl),
    // 배포된 config.json 은 `api` 다. 값이 없거나 이상하면 mock 으로 떨어진다 — 설정을 못 읽었을 때
    // 실제 데이터를 건드리는 쪽으로 기울면 안 된다.
    dataSource: raw.dataSource === "api" ? "api" : "mock",
    feedbackUrl: absoluteHttpUrl(raw.feedbackUrl),
    contactEmail: emailAddress(raw.contactEmail),
    privacyPolicyUrl:
      absoluteHttpUrl(raw.privacyPolicyUrl) ||
      DEFAULT_RUNTIME_CONFIG.privacyPolicyUrl,
    termsOfServiceUrl:
      absoluteHttpUrl(raw.termsOfServiceUrl) ||
      DEFAULT_RUNTIME_CONFIG.termsOfServiceUrl,
    gaMeasurementId: measurementId(raw.gaMeasurementId),
  };
}

/**
 * `config.json` 을 읽기 전에 화면을 그릴 때 쓰는 값. 빌드 때 만드는 HTML 과, 브라우저가 설정을
 * 받기 전에 그리는 첫 화면이 이 값을 쓴다(app/providers.tsx).
 *
 * <p>저장소의 `public/config.json` 에서 **화면에 보이는 값만** 가져온다. 기본값으로 먼저 그리면
 * 문의 이메일이 비어 있어 랜딩의 "문의하기"가 없다가, 설정이 온 뒤에 끼어들며 메뉴가 밀린다. 운영에는
 * CI 가 이 파일을 그대로 올리므로(.github/workflows/ci-cd.yaml) 첫 화면과 설정이 온 뒤의 화면이 같다.
 *
 * <p>**데이터 출처(`dataSource`, `apiBaseUrl`)와 측정 ID 는 가져오지 않는다.** 환경마다 다른 값이고,
 * 빌드 때의 값으로 요청이 나가면 안 된다. 서비스는 실행 중에 받은 설정으로만 만든다.
 */
export const PRERENDER_CONFIG: RuntimeConfig = (() => {
  const deployed = parseRuntimeConfig(deployedConfig);
  return {
    ...DEFAULT_RUNTIME_CONFIG,
    contactEmail: deployed.contactEmail,
    privacyPolicyUrl: deployed.privacyPolicyUrl,
    termsOfServiceUrl: deployed.termsOfServiceUrl,
  };
})();

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
  const requested = requestedDataSource();
  return requested ? { ...config, dataSource: requested } : config;
}

/** 주소가 요청한 출처, 없으면 이 탭이 기억하는 출처. 둘 다 없으면 null. */
function requestedDataSource(): DataSource | null {
  if (typeof window === "undefined") return null;
  const requested = new URLSearchParams(window.location.search).get("data");
  if (requested === "api" || requested === "mock") {
    rememberDataSource(requested);
    return requested;
  }
  return rememberedDataSource();
}

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  // 주소는 설정을 받기 **전에** 읽는다. 화면이 설정보다 먼저 그려지므로, 받는 사이에 링크를 눌러
  // 주소에서 `?data=` 가 사라질 수 있다. 탭에 기억하지 못하는 환경(사생활 보호 모드)에서도
  // 처음 열 때의 요청이 지켜진다.
  const requested = requestedDataSource();
  const override = (config: RuntimeConfig) =>
    requested ? { ...config, dataSource: requested } : config;
  try {
    const response = await fetch("/config.json", { cache: "no-store" });
    if (!response.ok) return override(DEFAULT_RUNTIME_CONFIG);
    return override(parseRuntimeConfig(await response.json()));
  } catch {
    return override(DEFAULT_RUNTIME_CONFIG);
  }
}
