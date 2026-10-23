import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_RUNTIME_CONFIG,
  parseRuntimeConfig,
} from "@/config/runtime-config";

import {
  analyticsEnabled,
  installGoogleAnalytics,
  pageLocation,
  pageReferrer,
  trackProjectSearch,
} from "./google-analytics";
import { GoogleAnalyticsTracker } from "./google-analytics-tracker";
import { installSearchUrlRedaction } from "./search-url-redaction";

const navigation = vi.hoisted(() => ({
  pathname: "/projects/",
  search: "",
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams(navigation.search),
}));

const ID = "G-TEST123";

function calls() {
  return (window.dataLayer ?? []).map((entry) =>
    Array.from(entry as ArrayLike<unknown>),
  );
}

function pageViews() {
  return calls().filter(
    ([command, name]) => command === "event" && name === "page_view",
  );
}

function navigate(path: string, search = "") {
  navigation.pathname = path;
  navigation.search = search;
  window.history.pushState(null, "", `${path}${search ? `?${search}` : ""}`);
}

beforeEach(() => {
  delete window.gtag;
  delete window.dataLayer;
  document.head
    .querySelectorAll("script[src*='googletagmanager']")
    .forEach((script) => script.remove());
  navigate("/projects/");
});

afterEach(() => {
  installSearchUrlRedaction()();
  vi.restoreAllMocks();
  navigate("/");
});

describe("analyticsEnabled", () => {
  const config = {
    ...DEFAULT_RUNTIME_CONFIG,
    dataSource: "api" as const,
    apiBaseUrl: "https://api.loresentry.com",
    gaMeasurementId: ID,
  };

  it("runs only on the production host with real data", () => {
    expect(analyticsEnabled(config, "loresentry.com")).toBe(true);
    expect(analyticsEnabled(config, "localhost")).toBe(false);
    expect(
      analyticsEnabled({ ...config, dataSource: "mock" }, "loresentry.com"),
    ).toBe(false);
    expect(
      analyticsEnabled({ ...config, gaMeasurementId: "" }, "loresentry.com"),
    ).toBe(false);
  });

  it.each(["", "not-a-url", "javascript:alert(1)"])(
    "does not measure API configuration that falls back to mock: %s",
    (apiBaseUrl) => {
      expect(
        analyticsEnabled({ ...config, apiBaseUrl }, "loresentry.com"),
      ).toBe(false);
    },
  );
});

describe("pageReferrer", () => {
  it("removes private query values before the first event", () => {
    expect(
      pageReferrer(
        "https://loresentry.com/workspace/?projectId=secret&q=private#draft",
      ),
    ).toBe("https://loresentry.com/workspace/");
    expect(pageReferrer("https://example.com/private-path?q=private")).toBe(
      "https://example.com/",
    );
    expect(pageReferrer("")).toBe("");
    expect(pageReferrer("invalid")).toBe("");
    expect(pageReferrer("javascript:alert(1)")).toBe("");
  });
});

describe("pageLocation", () => {
  it("keeps the view kind and drops identifiers and test switches", () => {
    expect(
      pageLocation(
        "https://loresentry.com/workspace/?projectId=p-1&open=file:f-9&mock=search.query:fail&data=api#x",
      ),
    ).toBe("https://loresentry.com/workspace/?open=file");
    expect(
      pageLocation(
        "https://loresentry.com/login/?result=success&returnTo=%2Fworkspace",
      ),
    ).toBe("https://loresentry.com/login/");
    expect(
      pageLocation("https://loresentry.com/projects/guide/?topic=graph"),
    ).toBe("https://loresentry.com/projects/guide/?topic=graph");
  });
});

describe("installGoogleAnalytics", () => {
  it("removes search terms before the tag can inspect the real page URL", () => {
    navigate("/workspace/", "projectId=p-1&open=search&q=private-original");
    installGoogleAnalytics(ID);
    expect(window.location.search).toBe("?projectId=p-1&open=search");
    expect(JSON.stringify(calls())).not.toContain("private-original");
  });
  it("loads gtag.js once and turns off the automatic page view", () => {
    navigate("/workspace/", "projectId=p-1");
    installGoogleAnalytics(ID);
    installGoogleAnalytics(ID);

    const scripts = document.head.querySelectorAll(
      "script[src*='googletagmanager']",
    );
    expect(scripts).toHaveLength(1);
    expect(scripts[0].getAttribute("src")).toBe(
      `https://www.googletagmanager.com/gtag/js?id=${ID}`,
    );
    expect(calls().slice(1)).toEqual([
      [
        "set",
        { page_location: "http://localhost/workspace/", page_referrer: "" },
      ],
      ["config", ID, { send_page_view: false }],
    ]);
  });
});

describe("project search measurement", () => {
  it("does not install analytics when it is absent, including MOCK", () => {
    trackProjectSearch(true);
    expect(window.gtag).toBeUndefined();
    expect(window.dataLayer).toBeUndefined();
    expect(document.querySelector("script[src*=googletagmanager]")).toBeNull();
  });

  it("accepts result presence only and sends no search term or identifiers", () => {
    installGoogleAnalytics(ID);
    trackProjectSearch(true);
    trackProjectSearch(false);
    expect(calls().filter(([, name]) => name === "project_search")).toEqual([
      ["event", "project_search", { has_results: true }],
      ["event", "project_search", { has_results: false }],
    ]);
  });
});

describe("GoogleAnalyticsTracker", () => {
  it("sends one page view per distinct page with the previous page as referrer", () => {
    const { rerender } = render(<GoogleAnalyticsTracker measurementId={ID} />);
    expect(pageViews()).toHaveLength(1);

    navigate("/workspace/", "projectId=p-1");
    rerender(<GoogleAnalyticsTracker measurementId={ID} />);
    navigate("/workspace/", "projectId=p-2");
    rerender(<GoogleAnalyticsTracker measurementId={ID} />);

    expect(pageViews().map(([, , params]) => params)).toEqual([
      { page_location: "http://localhost/projects/", page_referrer: "" },
      {
        page_location: "http://localhost/workspace/",
        page_referrer: "http://localhost/projects/",
      },
    ]);
  });

  it("sanitizes the initial document referrer before config and page_view", () => {
    vi.spyOn(document, "referrer", "get").mockReturnValue(
      "https://loresentry.com/workspace/?projectId=private-project&q=private-text#draft",
    );
    render(<GoogleAnalyticsTracker measurementId={ID} />);
    expect(calls().find(([command]) => command === "set")).toEqual([
      "set",
      {
        page_location: "http://localhost/projects/",
        page_referrer: "https://loresentry.com/workspace/",
      },
    ]);
    expect(pageViews()[0][2]).toEqual({
      page_location: "http://localhost/projects/",
      page_referrer: "https://loresentry.com/workspace/",
    });
    expect(JSON.stringify(calls())).not.toContain("private-");
  });
});

describe("parseRuntimeConfig", () => {
  it("accepts only a GA4 measurement id", () => {
    expect(parseRuntimeConfig({ gaMeasurementId: ID }).gaMeasurementId).toBe(
      ID,
    );
    expect(
      parseRuntimeConfig({ gaMeasurementId: "UA-1-1" }).gaMeasurementId,
    ).toBe("");
    expect(parseRuntimeConfig({}).gaMeasurementId).toBe("");
  });
});
