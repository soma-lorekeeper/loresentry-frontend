/**
 * 서버는 모든 요청에 `X-User-Id`를 요구한다. gateway 가 아직 인증을 하지 않으므로
 * (`CONTENT_PROJECT_API.md` §4.3) 프론트가 자기 신원을 직접 들고 간다.
 *
 * **임시 방식이다.** Google 로그인이 붙으면 이 모듈은 사라지고, gateway 가 검증한 신원을 넣는다.
 * 그때까지는 브라우저마다 고정된 UUID 하나를 만들어 쓴다 — 새로 고쳐도 같은 작업공간으로 돌아오고,
 * 다른 브라우저는 서로의 자료를 보지 않는다.
 */
const STORAGE_KEY = "loresentry.devUserId";

function canonicalUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuid.test(value) ? value.toLowerCase() : null;
}

let cached: string | null = null;

export function devUserId(): string {
  if (cached) return cached;

  // localStorage 는 프라이빗 창이나 저장이 막힌 환경에서 던질 수 있다. 그때도 동작해야 한다.
  try {
    const stored = canonicalUuid(window.localStorage.getItem(STORAGE_KEY));
    if (stored) {
      cached = stored;
      return stored;
    }
  } catch {
    // 아래에서 새로 만든다.
  }

  const created = crypto.randomUUID();
  try {
    window.localStorage.setItem(STORAGE_KEY, created);
  } catch {
    // 저장하지 못하면 이 탭에서만 유효한 신원이 된다.
  }
  cached = created;
  return created;
}

/** 테스트에서 신원을 고정한다. */
export function setDevUserId(value: string): void {
  cached = canonicalUuid(value);
}
