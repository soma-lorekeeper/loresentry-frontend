import { describe, expect, it, vi } from "vitest";

import { loadRuntimeConfig, parseRuntimeConfig } from "./runtime-config";

describe("runtime config", () => {
  it("loads and normalizes the backend URL without a frontend rebuild", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      json: async () => ({
        apiBaseUrl: "https://api.example.com/v1/",
        privacyPolicyUrl: "https://example.com/privacy",
        termsOfServiceUrl: "https://example.com/terms",
      }),
      ok: true,
      status: 200,
    });

    await expect(loadRuntimeConfig(fetcher)).resolves.toEqual({
      apiBaseUrl: "https://api.example.com/v1",
      privacyPolicyUrl: "https://example.com/privacy",
      termsOfServiceUrl: "https://example.com/terms",
    });
    expect(fetcher).toHaveBeenCalledWith("/config.json", {
      cache: "no-store",
    });
  });

  it("treats an empty backend URL as intentionally disconnected", () => {
    expect(parseRuntimeConfig({ apiBaseUrl: "" })).toEqual({
      apiBaseUrl: null,
      privacyPolicyUrl: null,
      termsOfServiceUrl: null,
    });
  });

  it("rejects untrusted policy link schemes", () => {
    expect(() =>
      parseRuntimeConfig({
        apiBaseUrl: "",
        privacyPolicyUrl: "javascript:alert(1)",
      }),
    ).toThrow("privacyPolicyUrl은 HTTP(S)");
  });

  it.each([
    [{}, "문자열이어야"],
    [{ apiBaseUrl: "/api" }, "절대 URL"],
    [{ apiBaseUrl: "ftp://api.example.com" }, "HTTP(S)"],
  ])("rejects invalid config %#", (config, message) => {
    expect(() => parseRuntimeConfig(config)).toThrow(message);
  });

  it("reports a missing runtime config file", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      json: async () => ({}),
      ok: false,
      status: 404,
    });

    await expect(loadRuntimeConfig(fetcher)).rejects.toThrow("(404)");
  });
});
