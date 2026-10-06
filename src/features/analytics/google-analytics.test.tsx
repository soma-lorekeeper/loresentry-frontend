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
} from "./google-analytics";
import { GoogleAnalyticsTracker } from "./google-analytics-tracker";

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

function locations() {
  return calls()
    .filter(([command]) => command === "set")
    .map(([, params]) => params as Record<string, string>);
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
  navigate("/");
});

describe("analyticsEnabled", () => {
  const config = {
    ...DEFAULT_RUNTIME_CONFIG,
    dataSource: "api" as const,
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
    expect(calls()).toContainEqual([
      "config",
      ID,
      { send_page_view: false, page_location: "http://localhost/workspace/" },
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

    expect(pageViews()).toHaveLength(2);
    expect(locations()).toEqual([
      { page_location: "http://localhost/projects/" },
      {
        page_location: "http://localhost/workspace/",
        page_referrer: "http://localhost/projects/",
      },
    ]);
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
