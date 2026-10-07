import { isLocale, LOCALE, type Locale } from "./locale";

/**
 * 언어 선택은 쿠키 하나로 CloudFront 에 전한다. CloudFront 함수가 이 쿠키를 먼저 보고, 없으면
 * 접속한 나라(한국이면 한국어, 그 밖은 영어)로 고른다(docs/deploy/cloudfront-rewrite.js).
 */
export const LOCALE_COOKIE = "ls_locale";

const YEAR_SECONDS = 365 * 24 * 60 * 60;
/** 계정 언어로 옮겨 가는 새로고침은 한 탭에서 한 번만 한다. CDN 이 쿠키를 아직 모르면 되풀이된다. */
const SWITCH_GUARD_KEY = "loresentry.locale-switch";

function secure() {
  return typeof location !== "undefined" && location.protocol === "https:"
    ? "; Secure"
    : "";
}

export function readLocaleCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  for (const part of document.cookie.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name === LOCALE_COOKIE && isLocale(value)) return value;
  }
  return null;
}

export function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; Path=/; Max-Age=${YEAR_SECONDS}; SameSite=Lax${secure()}`;
}

/** `/en/...` 처럼 언어를 직접 붙여 연 주소인지. 이때 연 언어를 그대로 존중한다. */
export function explicitLocaleOf(pathname: string): Locale | null {
  const match = /^\/(ko|en)(?:\/|$)/.exec(pathname);
  return match ? (match[1] as Locale) : null;
}

/** 언어를 붙인 주소라면 떼어 낸다. 언어는 쿠키가 고른다. */
export function withoutLocalePrefix(pathname: string): string {
  const explicit = explicitLocaleOf(pathname);
  if (!explicit) return pathname;
  const rest = pathname.slice(explicit.length + 1);
  return rest.startsWith("/") ? rest : `/${rest}`;
}

function reloadInto(pathname: string) {
  const target = `${withoutLocalePrefix(pathname)}${location.search}${location.hash}`;
  if (target === `${location.pathname}${location.search}${location.hash}`) {
    location.reload();
  } else {
    // 다른 언어판은 다른 빌드라 클라이언트 라우팅으로는 갈 수 없다. 문서를 새로 받아야 한다.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    location.assign(target);
  }
}

/** 사용자가 언어를 골랐다. 쿠키를 고치고 그 언어판으로 다시 연다. */
export function switchLocale(locale: Locale) {
  writeLocaleCookie(locale);
  if (locale !== LOCALE) reloadInto(location.pathname);
}

/**
 * 로그인한 계정의 언어로 맞춘다. 계정 언어가 이 기기의 선택보다 앞선다 — 어느 기기에서 들어와도 같은
 * 언어로 보여야 한다. 쿠키만 고치고 다시 여는 것은 탭마다 한 번뿐이라, CDN 이 쿠키를 무시하는 환경에서도
 * 새로고침이 되풀이되지 않는다.
 */
export function followAccountLocale(locale: Locale) {
  if (locale === LOCALE) return;
  if (explicitLocaleOf(location.pathname)) return;
  try {
    if (sessionStorage.getItem(SWITCH_GUARD_KEY) === locale) return;
    sessionStorage.setItem(SWITCH_GUARD_KEY, locale);
  } catch {
    return;
  }
  writeLocaleCookie(locale);
  reloadInto(location.pathname);
}

/**
 * 언어를 붙인 주소로 들어오면 이 탭이 열려 있는 동안 그 언어를 쓴다. 그 뒤 앱 안의 이동은 언어 없는
 * 주소로 가므로, 쿠키가 없으면 CloudFront 가 다른 언어판을 줄 수 있다. 영구 쿠키가 아니라 세션 쿠키다 —
 * 남이 보낸 링크 한 번으로 언어가 굳으면 안 된다. `<head>` 에서 그리기 전에 돈다.
 */
export function createLocaleScript() {
  return `(function(){var l=${JSON.stringify(LOCALE)},p=location.pathname;if(p==="/"+l||p.indexOf("/"+l+"/")===0){document.cookie=${JSON.stringify(`${LOCALE_COOKIE}=`)}+l+"; Path=/; SameSite=Lax"+(location.protocol==="https:"?"; Secure":"")}})();`;
}
