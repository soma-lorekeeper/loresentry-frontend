const ALLOWED_PREFIXES = ["/projects", "/workspace"];

export function safeReturnTo(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  try {
    const url = new URL(value, "https://loresentry.local");
    if (url.origin !== "https://loresentry.local") return null;
    const allowed = ALLOWED_PREFIXES.some(
      (prefix) =>
        url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
    );
    return allowed ? `${url.pathname}${url.search}` : null;
  } catch {
    return null;
  }
}
