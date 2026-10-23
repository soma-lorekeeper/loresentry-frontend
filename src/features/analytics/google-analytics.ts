import { usesApiData, type RuntimeConfig } from "@/config/runtime-config";

export const ANALYTICS_HOSTNAME = "loresentry.com";

const KEPT_PARAMS = ["open", "topic"];

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: Gtag;
  }
}

export function analyticsEnabled(config: RuntimeConfig, hostname: string) {
  return (
    config.gaMeasurementId !== "" &&
    usesApiData(config) &&
    hostname === ANALYTICS_HOSTNAME
  );
}

export function pageLocation(href: string) {
  const url = new URL(href);
  const kept = new URLSearchParams();
  for (const name of KEPT_PARAMS) {
    const value = url.searchParams.get(name);
    if (value) kept.set(name, value.split(":")[0]);
  }
  url.search = kept.toString();
  url.hash = "";
  return url.toString();
}

/** 첫 페이지에도 원래 referrer가 자동으로 실리지 않도록 명시적으로 덮어쓴다. */
export function pageReferrer(href: string) {
  if (!href) return "";
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    return url.hostname === ANALYTICS_HOSTNAME
      ? pageLocation(href)
      : `${url.origin}/`;
  } catch {
    return "";
  }
}

export function installGoogleAnalytics(measurementId: string): Gtag {
  if (window.gtag) return window.gtag;
  const dataLayer = (window.dataLayer ??= []);
  const gtag: Gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  };
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("set", {
    page_location: pageLocation(window.location.href),
    page_referrer: pageReferrer(document.referrer),
  });
  gtag("config", measurementId, { send_page_view: false });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  document.head.appendChild(script);
  return gtag;
}
