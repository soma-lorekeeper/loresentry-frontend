import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  ACQUISITION_MAX_AGE_MS,
  ACQUISITION_STORAGE_KEY,
  LANDING_STORAGE_KEY,
  acquisitionFrom,
  clearAcquisition,
  createLandingScript,
  pendingAcquisition,
  settleLandings,
} from "./acquisition";

const NOW = Date.parse("2026-10-27T03:00:00.000Z");

function land(path: string, referrer = "") {
  window.history.replaceState(null, "", path);
  Object.defineProperty(document, "referrer", {
    value: referrer,
    configurable: true,
  });
  new Function(createLandingScript())();
}

function landings() {
  return JSON.parse(sessionStorage.getItem(LANDING_STORAGE_KEY) ?? "[]");
}

describe("landing script", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => window.history.replaceState(null, "", "/"));

  it("is one line of plain JavaScript", () => {
    expect(createLandingScript()).not.toContain("\n");
  });

  it("appends each page load and keeps only the latest five", () => {
    land("/?gclid=Cj0K&utm_source=google", "https://www.google.com/");
    expect(landings()).toEqual([
      {
        href: `${window.location.origin}/?gclid=Cj0K&utm_source=google`,
        referrer: "https://www.google.com/",
        at: expect.any(Number),
      },
    ]);
    for (let i = 0; i < 6; i++) land(`/login/?n=${i}`);
    expect(landings()).toHaveLength(5);
    expect(landings()[4].href).toContain("n=5");
  });

  it("starts over when the stored list is unreadable", () => {
    sessionStorage.setItem(LANDING_STORAGE_KEY, "{not json");
    land("/");
    expect(landings()).toHaveLength(1);
    sessionStorage.setItem(LANDING_STORAGE_KEY, '{"href":"/"}');
    land("/");
    expect(landings()).toHaveLength(1);
  });
});

describe("acquisitionFrom", () => {
  const at = Date.parse("2026-10-27T01:02:03.000Z");

  it("reads campaign parameters, the click ID, the referrer host and the path", () => {
    expect(
      acquisitionFrom({
        href: "https://loresentry.com/en/?utm_source=google&utm_medium=cpc&utm_campaign=123&utm_term=%EC%86%8C%EC%84%A4+%EC%97%90%EB%94%94%ED%84%B0&utm_content=ad1&gclid=Cj0K-x_1&projectId=p-1#top",
        referrer: "https://WWW.Google.com/search?q=private",
        at,
      }),
    ).toEqual({
      utmSource: "google",
      utmMedium: "cpc",
      utmCampaign: "123",
      utmTerm: "소설 에디터",
      utmContent: "ad1",
      clickId: "Cj0K-x_1",
      clickIdType: "gclid",
      referrerHost: "www.google.com",
      landingPath: "/en/",
      landedAt: "2026-10-27T01:02:03.000Z",
    });
  });

  it("cleans values to what the server accepts", () => {
    const result = acquisitionFrom({
      href: `https://loresentry.com/?utm_source=%20goo%0Agle%20&utm_medium=%20%20&utm_term=${"a".repeat(250)}&utm_campaign=${"😀".repeat(60)}&gclid=bad%20id&gbraid=GB_1`,
      referrer: "",
      at,
    });
    expect(result).toMatchObject({
      utmSource: "google",
      utmMedium: null,
      utmTerm: "a".repeat(200),
      clickId: "GB_1",
      clickIdType: "gbraid",
      referrerHost: null,
    });
    expect(result?.utmCampaign).toBe("😀".repeat(50));
  });

  it("ignores our own hosts, Google sign-in and non-web referrers", () => {
    for (const referrer of [
      "https://loresentry.com/projects/",
      "https://api.loresentry.com/auth/oauth/google/callback",
      "https://accounts.google.com/",
      "android-app://com.google.android.gm/",
      "not a url",
    ])
      expect(
        acquisitionFrom({ href: "https://loresentry.com/", referrer, at })
          ?.referrerHost,
      ).toBeNull();
  });

  it("returns null for an address it cannot read", () => {
    expect(acquisitionFrom({ href: "::", referrer: "", at })).toBeNull();
  });
});

describe("settleLandings", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  function queue(...items: { href: string; referrer?: string; at?: number }[]) {
    sessionStorage.setItem(
      LANDING_STORAGE_KEY,
      JSON.stringify(
        items.map((item) => ({
          referrer: "",
          at: NOW,
          ...item,
          href: `https://loresentry.com${item.href}`,
        })),
      ),
    );
  }

  it("keeps an ad click through later direct visits", () => {
    queue({ href: "/?gclid=Cj0K&utm_source=google" });
    settleLandings(NOW);
    queue({ href: "/login/?result=success" }, { href: "/projects/" });
    settleLandings(NOW + 1000);

    expect(sessionStorage.getItem(LANDING_STORAGE_KEY)).toBeNull();
    expect(pendingAcquisition(NOW + 2000)).toMatchObject({
      clickId: "Cj0K",
      utmSource: "google",
      landingPath: "/",
    });
  });

  it("lets a newer visit with a source replace the older one", () => {
    queue({ href: "/?gclid=Cj0K" });
    settleLandings(NOW);
    queue({ href: "/", referrer: "https://search.naver.com/" });
    settleLandings(NOW + 1000);

    expect(pendingAcquisition(NOW + 2000)).toMatchObject({
      clickId: null,
      referrerHost: "search.naver.com",
    });
  });

  it("remembers a direct first visit until a source arrives", () => {
    queue({ href: "/en/" });
    settleLandings(NOW);
    expect(pendingAcquisition(NOW)).toMatchObject({
      referrerHost: null,
      landingPath: "/en/",
    });

    queue({ href: "/?utm_source=newsletter" });
    expect(pendingAcquisition(NOW + 1000)).toMatchObject({
      utmSource: "newsletter",
      landingPath: "/",
    });
  });

  it("forgets a source older than thirty days", () => {
    queue({ href: "/?gclid=Cj0K" });
    settleLandings(NOW);
    expect(pendingAcquisition(NOW + ACQUISITION_MAX_AGE_MS + 1)).toBeNull();
    expect(localStorage.getItem(ACQUISITION_STORAGE_KEY)).toBeNull();

    queue({ href: "/?gclid=Cj0K" });
    settleLandings(NOW);
    queue({ href: "/projects/", at: NOW + ACQUISITION_MAX_AGE_MS + 1 });
    expect(pendingAcquisition(NOW + ACQUISITION_MAX_AGE_MS + 1)).toMatchObject({
      clickId: null,
      landingPath: "/projects/",
    });
  });

  it("survives unreadable storage", () => {
    sessionStorage.setItem(LANDING_STORAGE_KEY, "{");
    localStorage.setItem(ACQUISITION_STORAGE_KEY, "{");
    expect(() => settleLandings(NOW)).not.toThrow();
    expect(pendingAcquisition(NOW)).toBeNull();
  });

  it("clears the kept source", () => {
    queue({ href: "/?gclid=Cj0K" });
    settleLandings(NOW);
    clearAcquisition();
    expect(pendingAcquisition(NOW)).toBeNull();
  });
});
