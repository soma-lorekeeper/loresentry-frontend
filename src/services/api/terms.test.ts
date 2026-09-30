import { afterEach, describe, expect, it, vi } from "vitest";
import { createApiAuth } from "./auth";
import { ApiClient } from "./http";
import { mockAuth, resetMockTerms } from "../mock/account";
import { setMockLatency, setMockRule, clearMockRules } from "../mock/control";
const id = "00000000-0000-4000-8000-000000000001";
const terms = {
  terms_version_id: id,
  version: "1",
  title: "약관",
  content: "원문",
  effective_at: "2026-09-30T00:00:00Z",
  expires_at: "2026-09-30T01:00:00Z",
};
const auth = () => createApiAuth(new ApiClient("https://api.test.invalid"));
function reply(status: number, body?: unknown) {
  return vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      new Response(body === undefined ? null : JSON.stringify(body), {
        status,
      }),
    ),
  );
}
afterEach(() => {
  vi.unstubAllGlobals();
  clearMockRules();
  resetMockTerms();
});
describe("terms API", () => {
  it("reads the original and sends only the selected version with cookies and CSRF", async () => {
    reply(200, terms);
    expect(await auth().getTerms()).toMatchObject({
      termsVersionId: id,
      content: "원문",
    });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.test.invalid/auth/terms",
      expect.objectContaining({ credentials: "include", headers: {} }),
    );
    reply(204);
    await auth().acceptTerms(id);
    expect(fetch).toHaveBeenCalledExactlyOnceWith(
      "https://api.test.invalid/auth/terms/accept",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", "X-LS-CSRF": "1" },
        body: JSON.stringify({ terms_version_id: id }),
      }),
    );
  });
  it.each([
    null,
    {},
    { ...terms, terms_version_id: "bad" },
    { ...terms, content: " " },
    { ...terms, effective_at: "tomorrow" },
    { ...terms, expires_at: "2026-09-30" },
  ])("rejects malformed terms %#", async (body) => {
    reply(200, body);
    await expect(auth().getTerms()).rejects.toMatchObject({ code: "unknown" });
  });
  it.each([200, 201, 202])(
    "does not accept HTTP %i as completion",
    async (status) => {
      reply(status, {});
      await expect(auth().acceptTerms(id)).rejects.toMatchObject({
        code: "unknown",
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    },
  );
  it.each([
    [401, "CONSENT_REQUEST_INVALID", "consent-invalid"],
    [409, "TERMS_VERSION_MISMATCH", "terms-version-mismatch"],
    [403, "CSRF_REJECTED", "csrf-rejected"],
    [400, "INVALID_REQUEST", "validation"],
    [503, "LOGIN_UNAVAILABLE", "network"],
    [502, "UPSTREAM_INVALID_RESPONSE", "unknown"],
  ])("preserves %s %s without retry", async (status, code, expected) => {
    reply(status as number, { code, message: "private diagnostic" });
    await expect(auth().acceptTerms(id)).rejects.toMatchObject({
      code: expected,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("never resends a lost completion", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("lost")));
    await expect(auth().acceptTerms(id)).rejects.toMatchObject({
      code: "network",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("rejects an invalid account after completion", async () => {
    reply(200, {});
    await expect(auth().getSession()).rejects.toMatchObject({
      code: "unknown",
    });
  });
  it("supports mock expiry, version change, completion replay and outage", async () => {
    setMockLatency(0);
    resetMockTerms({ expiresAt: "2000-01-01T00:00:00Z" });
    await expect(mockAuth.getTerms()).rejects.toMatchObject({
      code: "consent-invalid",
    });
    resetMockTerms({ termsVersionId: "00000000-0000-4000-8000-000000000002" });
    await expect(mockAuth.acceptTerms(id)).rejects.toMatchObject({
      code: "terms-version-mismatch",
    });
    await mockAuth.acceptTerms((await mockAuth.getTerms()).termsVersionId);
    await expect(mockAuth.acceptTerms(id)).rejects.toMatchObject({
      code: "consent-invalid",
    });
    resetMockTerms();
    setMockRule("auth.terms", "fail");
    await expect(mockAuth.getTerms()).rejects.toMatchObject({
      code: "network",
    });
  });
});
