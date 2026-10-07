import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createLocaleScript,
  explicitLocaleOf,
  followAccountLocale,
  readLocaleCookie,
  withoutLocalePrefix,
  writeLocaleCookie,
} from "./preference";

function clearCookie() {
  document.cookie = "ls_locale=; Path=/; Max-Age=0";
}

describe("locale preference", () => {
  beforeEach(() => {
    clearCookie();
    sessionStorage.clear();
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
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      pathname: "/projects/",
      search: "",
      hash: "",
      reload,
      assign: vi.fn(),
    } as Location);
    followAccountLocale("en");
    expect(readLocaleCookie()).toBe("en");
    expect(reload).toHaveBeenCalledTimes(1);
    followAccountLocale("en");
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("keeps the session cookie script on one line of plain JavaScript", () => {
    expect(createLocaleScript()).toContain('"ko"');
    expect(createLocaleScript()).not.toContain("\n");
  });
});
