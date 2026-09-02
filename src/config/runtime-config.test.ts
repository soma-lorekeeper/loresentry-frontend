import { describe, expect, it, vi } from "vitest";

import { loadRuntimeConfig, parseRuntimeConfig } from "./runtime-config";

describe("runtime config", () => {
  it("loads and normalizes the backend URL without a frontend rebuild", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      json: async () => ({ apiBaseUrl: "https://api.example.com/v1/" }),
      ok: true,
      status: 200,
    });

    await expect(loadRuntimeConfig(fetcher)).resolves.toEqual({
      apiBaseUrl: "https://api.example.com/v1",
    });
    expect(fetcher).toHaveBeenCalledWith("/config.json", {
      cache: "no-store",
    });
  });

  it("treats an empty backend URL as intentionally disconnected", () => {
    expect(parseRuntimeConfig({ apiBaseUrl: "" })).toEqual({
      apiBaseUrl: null,
    });
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
