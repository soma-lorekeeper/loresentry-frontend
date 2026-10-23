import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLocaleScript,
  explicitLocaleOf,
  followAccountLocale,
  localeHref,
  policyHref,
  readLocaleSync,
  readLocaleCookie,
  withoutLocalePrefix,
  writeLocaleCookie,
  setLocaleSync,
} from "./preference";

function clearCookie() {
  document.cookie = "ls_locale=; Path=/; Max-Age=0";
}

describe("locale preference", () => {
  beforeEach(() => {
    clearCookie();
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => vi.restoreAllMocks());

  it("recognises only a real language prefix", () => {
    expect(explicitLocaleOf("/en/projects/")).toBe("en");
    expect(explicitLocaleOf("/ko")).toBe("ko");
    expect(explicitLocaleOf("/korea/")).toBeNull();
    expect(withoutLocalePrefix("/en/projects/")).toBe("/projects/");
    expect(withoutLocalePrefix("/en")).toBe("/");
    expect(withoutLocalePrefix("/projects/")).toBe("/projects/");
  });

  it("reads back the language it wrote and ignores other values", () => {
    expect(readLocaleCookie()).toBeNull();
    writeLocaleCookie("en");
    expect(readLocaleCookie()).toBe("en");
    document.cookie = "ls_locale=fr; Path=/";
    expect(readLocaleCookie()).toBeNull();
  });

  it("does nothing when the account already matches this build", () => {
    followAccountLocale("ko");
    expect(readLocaleCookie()).toBeNull();
  });

  it("moves to the account language once per tab", () => {
    const assign = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      pathname: "/projects/",
      search: "",
      hash: "",
      assign,
    } as Location);
    followAccountLocale("en");
    expect(readLocaleCookie()).toBe("en");
    expect(assign).toHaveBeenCalledWith("/en/projects/");
    followAccountLocale("en");
    expect(assign).toHaveBeenCalledTimes(1);
  });

  it("uses unique locale URLs for internal navigation and policies, preserving external policies", () => {
    expect(localeHref("/en/workspace/?projectId=one", "ko")).toBe(
      "/ko/workspace/?projectId=one",
    );
    expect(policyHref("/policies/terms/")).toBe("/ko/policies/terms/");
    expect(
      policyHref("https://loresentry.com/en/policies/privacy/?v=2#data"),
    ).toBe("/ko/policies/privacy/?v=2#data");
    expect(policyHref("https://legal.example.com/terms")).toBe(
      "https://legal.example.com/terms",
    );
  });

  it("keeps a failed device choice for the same user until the account confirms it", () => {
    setLocaleSync({ userId: "one", locale: "ko" });
    expect(readLocaleSync("other")).toBeNull();
    expect(readLocaleSync("one")?.locale).toBe("ko");
    followAccountLocale("en", "one");
    expect(readLocaleCookie()).toBeNull();
    expect(readLocaleSync("one")).not.toBeNull();
    followAccountLocale("ko", "one");
    expect(readLocaleSync("one")).toBeNull();
  });

  it("does not replace an existing chosen-language cookie with a session cookie", () => {
    writeLocaleCookie("ko");
    const setter = vi.spyOn(document, "cookie", "set");
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      pathname: "/ko/projects/",
    } as Location);
    // Execute the actual pre-hydration script, not a second implementation of it.
    new Function(createLocaleScript())();
    expect(setter).not.toHaveBeenCalled();
  });

  it("keeps the session cookie script on one line of plain JavaScript", () => {
    expect(createLocaleScript()).toContain('"ko"');
    expect(createLocaleScript()).not.toContain("\n");
  });
});
