import { afterEach, describe, expect, it } from "vitest";

import {
  installSearchUrlRedaction,
  withoutSearchTerms,
} from "./search-url-redaction";

let remove: (() => void) | undefined;
afterEach(() => {
  remove?.();
  remove = undefined;
  window.history.replaceState(null, "", "/");
});

describe("search URL redaction", () => {
  it("removes every search alias and duplicate while preserving navigation and anchors", () => {
    expect(
      withoutSearchTerms(
        "https://loresentry.com/ko/workspace/?projectId=p-1&open=search&q=private&q=more&S=private&search=private&query=private&keyword=private&search_term=private#guide-writing",
      ),
    ).toBe(
      "https://loresentry.com/ko/workspace/?projectId=p-1&open=search#guide-writing",
    );
  });

  it("cleans the initial entry without losing the router state or creating a new entry", () => {
    const state = { __NA: true, custom: "kept" };
    window.history.replaceState(
      state,
      "",
      "/workspace/?projectId=p-1&q=private#anchor",
    );
    const entries = window.history.length;
    remove = installSearchUrlRedaction();
    expect(window.location.search).toBe("?projectId=p-1");
    expect(window.location.hash).toBe("#anchor");
    expect(window.history.state).toEqual(state);
    expect(window.history.length).toBe(entries);
  });

  it.each(["pushState", "replaceState"] as const)(
    "redacts relative URLs in %s and retains state",
    (method) => {
      remove = installSearchUrlRedaction();
      window.history[method](
        { custom: 1 },
        "",
        "/workspace/?open=search&q=private",
      );
      expect(window.location.pathname).toBe("/workspace/");
      expect(window.location.search).toBe("?open=search");
      expect(window.history.state).toEqual({ custom: 1 });
    },
  );

  it("cleans restored history before later popstate observers see the address", () => {
    const originalReplace = window.history.replaceState;
    remove = installSearchUrlRedaction();
    originalReplace.call(
      window.history,
      { restored: true },
      "",
      "/?q=private&data=api",
    );
    let observed = "";
    const observe = () => {
      observed = window.location.search;
    };
    window.addEventListener("popstate", observe);
    try {
      window.dispatchEvent(new PopStateEvent("popstate"));
      expect(observed).toBe("?data=api");
      expect(window.history.state).toEqual({ restored: true });
    } finally {
      window.removeEventListener("popstate", observe);
    }
  });

  it("installs once and preserves native rejection of a cross-origin URL", () => {
    const original = window.history.pushState;
    remove = installSearchUrlRedaction();
    const installed = window.history.pushState;
    expect(installSearchUrlRedaction()).toBe(remove);
    expect(window.history.pushState).toBe(installed);
    expect(() =>
      window.history.pushState(null, "", "https://other.invalid/?q=private"),
    ).toThrow();
    remove();
    expect(window.history.pushState).toBe(original);
  });
});
