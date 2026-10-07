import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

type Event = {
  request: {
    uri: string;
    headers: Record<string, { value: string }>;
    cookies?: Record<string, { value: string }>;
    querystring: Record<string, { value: string }>;
  };
};

const source = readFileSync(join(__dirname, "cloudfront-rewrite.js"), "utf8");
const handler = new Function(`${source}; return handler;`)() as (
  event: Event,
) => { uri?: string; statusCode?: number; headers?: Record<string, { value: string }> };

function request(
  uri: string,
  {
    country,
    language,
    cookie,
    host = "loresentry.com",
  }: { country?: string; language?: string; cookie?: string; host?: string } = {},
): Event {
  const headers: Record<string, { value: string }> = { host: { value: host } };
  if (country) headers["cloudfront-viewer-country"] = { value: country };
  if (language) headers["accept-language"] = { value: language };
  return {
    request: {
      uri,
      headers,
      cookies: cookie ? { ls_locale: { value: cookie } } : {},
      querystring: {},
    },
  };
}

describe("cloudfront-rewrite", () => {
  it("serves Korean to viewers in Korea and English elsewhere", () => {
    expect(handler(request("/", { country: "KR" })).uri).toBe("/ko/index.html");
    expect(handler(request("/", { country: "US" })).uri).toBe("/en/index.html");
    expect(handler(request("/projects/", { country: "JP" })).uri).toBe(
      "/en/projects/index.html",
    );
  });

  it("lets the language cookie win over the country", () => {
    expect(handler(request("/login/", { country: "KR", cookie: "en" })).uri).toBe(
      "/en/login/index.html",
    );
    expect(handler(request("/", { country: "US", cookie: "ko" })).uri).toBe(
      "/ko/index.html",
    );
  });

  it("ignores a cookie that is not a language", () => {
    expect(handler(request("/", { country: "KR", cookie: "fr" })).uri).toBe(
      "/ko/index.html",
    );
  });

  it("falls back to Accept-Language, then English, when the country is unknown", () => {
    expect(handler(request("/", { language: "ko-KR,ko;q=0.9,en;q=0.8" })).uri).toBe(
      "/ko/index.html",
    );
    expect(handler(request("/", { language: "en-US,ko;q=0.5" })).uri).toBe(
      "/en/index.html",
    );
    expect(handler(request("/")).uri).toBe("/en/index.html");
  });

  it("serves an explicitly prefixed address as is", () => {
    expect(handler(request("/en/", { country: "KR" })).uri).toBe("/en/index.html");
    expect(handler(request("/ko/projects", { country: "US" })).uri).toBe(
      "/ko/projects/index.html",
    );
    expect(handler(request("/ko/_next/static/a.js", { country: "US" })).uri).toBe(
      "/ko/_next/static/a.js",
    );
  });

  it("rewrites files and payloads under the chosen language", () => {
    expect(handler(request("/config.json", { country: "KR" })).uri).toBe(
      "/ko/config.json",
    );
    expect(handler(request("/projects/index.txt", { country: "US" })).uri).toBe(
      "/en/projects/index.txt",
    );
    expect(handler(request("/policies/terms.html", { country: "US" })).uri).toBe(
      "/en/policies/terms.html",
    );
  });

  it("does not mistake a path that only starts with ko or en for a prefix", () => {
    expect(handler(request("/korea/", { country: "US" })).uri).toBe(
      "/en/korea/index.html",
    );
  });

  it("still sends www to the bare domain", () => {
    const response = handler(request("/projects/", { host: "www.loresentry.com" }));
    expect(response.statusCode).toBe(301);
    expect(response.headers?.location.value).toBe("https://loresentry.com/projects/");
  });
});
