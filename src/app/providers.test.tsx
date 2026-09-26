import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useServices } from "@/services/services-context";

import { AppProviders } from "./providers";

const BASE = "https://api.test.invalid";

function Probe() {
  const services = useServices();
  // 실제 API 어댑터라면 이 호출이 HTTP 요청을 낸다. mock 이라면 아무 요청도 나가지 않는다.
  void services.projects.list().catch(() => undefined);
  return <p>probe</p>;
}

let requested: string[];

beforeEach(() => {
  requested = [];
  window.sessionStorage.clear();
  vi.stubGlobal("fetch", (input: string) => {
    const url = String(input);
    requested.push(url);
    if (url.endsWith("/config.json")) {
      return Promise.resolve(
        new Response(JSON.stringify({ apiBaseUrl: BASE, dataSource: "api" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      );
    }
    return Promise.resolve(
      new Response(JSON.stringify({ projects: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AppProviders", () => {
  /**
   * 서비스를 기본 설정으로 먼저 만들면 데이터 출처가 mock 으로 굳는다. 그러면 `config.json` 이
   * `api` 여도 앱은 끝까지 mock 으로 돌고, mock 은 씨앗 사용자를 로그인된 것으로 보고한다 —
   * 남의 계정으로 로그인된 화면이 된다. 실제로 그렇게 배포됐던 적이 있다.
   */
  it("builds the services from the loaded config, not from the default", async () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );

    await screen.findByText("probe");
    await waitFor(() =>
      expect(requested.some((url) => url.startsWith(BASE))).toBe(true),
    );
  });

  it("draws nothing until the config arrives, so no query picks a source first", () => {
    const { container } = render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );

    // 첫 렌더에는 자식이 없다. 출처가 정해지기 전에 나가는 요청도 없다.
    expect(container.textContent).toBe("");
    expect(requested.some((url) => url.startsWith(BASE))).toBe(false);
  });
});
