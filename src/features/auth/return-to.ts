const ALLOWED_PREFIXES = ["/projects", "/workspace"];

export function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://loresentry.local");
    if (url.origin !== "https://loresentry.local") return null;
    const pathname = url.pathname.replace(/^\/(?:ko|en)(?=\/|$)/, "");
    const allowed = ALLOWED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );
    return allowed ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}

const OAUTH_RETURN_TO = "loresentry.oauth.return-to";

/** The BFF callback omits returnTo; this tab keeps the validated destination. */
export function rememberOAuthReturnTo(value: string | null) {
  try {
    const path = safeReturnTo(value);
    if (path) window.sessionStorage.setItem(OAUTH_RETURN_TO, path);
    else window.sessionStorage.removeItem(OAUTH_RETURN_TO);
  } catch {
    /* Login still works when tab storage is unavailable. */
  }
}

export function readOAuthReturnTo(): string | null {
  try {
    return safeReturnTo(window.sessionStorage.getItem(OAUTH_RETURN_TO));
  } catch {
    return null;
  }
}

export function clearOAuthReturnTo() {
  try {
    window.sessionStorage.removeItem(OAUTH_RETURN_TO);
  } catch {
    /* Nothing persisted. */
  }
}
