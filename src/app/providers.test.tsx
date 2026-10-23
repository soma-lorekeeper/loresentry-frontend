import { act, render, screen, waitFor } from "@testing-library/react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import userEvent from "@testing-library/user-event";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { mockProjects } from "@/services/mock/projects";
import { SessionGate } from "@/features/auth/session-gate";
import { routerMock } from "@/test/render";
import { useServices } from "@/services/services-context";

import { AppProviders } from "./providers";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/workspace",
}));

const BASE = "https://api.test.invalid";

function Probe() {
  const services = useServices();
  // 실제 API 어댑터라면 이 호출이 HTTP 요청을 낸다. mock 이라면 아무 요청도 나가지 않는다.
  void services.projects.list().catch(() => undefined);
  return <p>probe</p>;
}

let requested: string[];
/** 붙잡아 둔 config.json 응답을 보낸다. 설정이 오기 전의 화면을 보려고 테스트가 시점을 정한다. */
let sendConfig: () => void;
let mockList: ReturnType<typeof vi.spyOn>;

const toApi = () => requested.filter((url) => url.startsWith(BASE));

beforeEach(() => {
  window.localStorage.removeItem("ls.auth-transition");
  requested = [];
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/");
  mockList = vi.spyOn(mockProjects, "list");
  const held = new Promise<void>((resolve) => {
    sendConfig = resolve;
  });
  vi.stubGlobal("fetch", (input: string) => {
    const url = String(input);
    requested.push(url);
    if (url.endsWith("/config.json")) {
      return held.then(
        () =>
          new Response(
            JSON.stringify({ apiBaseUrl: BASE, dataSource: "api" }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          ),
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
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});

describe("AppProviders", () => {
  it.each([false, true])(
    "confirms another tab's identity before clearing cached work (changed: %s)",
    async (changed) => {
      let identity = "user-a";
      let reads = 0;
      let client!: QueryClient;
      vi.stubGlobal("fetch", (url: string) => {
        const body = String(url).endsWith("/config.json")
          ? { apiBaseUrl: BASE, dataSource: "api" }
          : (reads++,
            {
              id: identity,
              display_name: "QA",
              email: "qa@example.test",
              onboarding_completed: true,
              locale: "ko",
            });
        return Promise.resolve(
          new Response(JSON.stringify(body), { status: 200 }),
        );
      });
      function Form() {
        const currentClient = useQueryClient();
        useEffect(() => {
          client = currentClient;
        }, [currentClient]);
        return (
          <SessionGate>
            {(user) => (
              <>
                <p>{user.id}</p>
                <input aria-label="draft" />
              </>
            )}
          </SessionGate>
        );
      }
      render(
        <AppProviders>
          <Form />
        </AppProviders>,
      );
      const input = await screen.findByRole("textbox", { name: "draft" });
      await userEvent.type(input, "private draft");
      client.setQueryData(["private-record"], { owner: "user-a" });
      const external = (phase: string) =>
        act(() => {
          window.localStorage.setItem(
            "ls.auth-transition",
            `external:${phase}`,
          );
          window.dispatchEvent(
            new StorageEvent("storage", {
              key: "ls.auth-transition",
              newValue: `external:${phase}`,
            }),
          );
        });
      external("pending");
      expect(input).toHaveValue("private draft");
      identity = changed ? "user-b" : "user-a";
      external("complete");
      await waitFor(() => expect(reads).toBeGreaterThan(1));
      await waitFor(() =>
        expect(screen.getByText(identity)).toBeInTheDocument(),
      );
      if (changed) {
        expect(client.getQueryData(["private-record"])).toBeUndefined();
        expect(screen.getByRole("textbox", { name: "draft" })).toHaveValue("");
      } else {
        expect(client.getQueryData(["private-record"])).toEqual({
          owner: "user-a",
        });
        expect(screen.getByRole("textbox", { name: "draft" })).toHaveValue(
          "private draft",
        );
      }
    },
  );
  it("keeps a protected form mounted through a failed API auth transition", async () => {
    let finish!: (response: Response) => void;
    const held = new Promise<Response>((resolve) => {
      finish = resolve;
    });
    const response = (body: unknown, status = 200) =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    vi.stubGlobal("fetch", (url: string) => {
      if (String(url).endsWith("/config.json"))
        return Promise.resolve(
          response({ apiBaseUrl: BASE, dataSource: "api" }),
        );
      if (String(url).endsWith("/auth/sessions/revoke")) return held;
      return Promise.resolve(
        response({
          id: "qa-user",
          display_name: "QA",
          email: "qa@example.test",
          onboarding_completed: true,
          locale: "ko",
        }),
      );
    });
    function Form() {
      const services = useServices();
      const [failed, setFailed] = useState(false);
      return (
        <SessionGate>
          {() => (
            <>
              <input aria-label="draft" />
              <button
                onClick={() =>
                  void services.auth.logout().catch(() => setFailed(true))
                }
              >
                logout
              </button>
              {failed && <p>logout failed</p>}
            </>
          )}
        </SessionGate>
      );
    }
    render(
      <AppProviders>
        <Form />
      </AppProviders>,
    );
    const input = await screen.findByRole("textbox", { name: "draft" });
    const actor = userEvent.setup();
    await actor.type(input, "keep this draft");
    await actor.click(screen.getByRole("button", { name: "logout" }));
    try {
      expect(input).toBeInTheDocument();
    } finally {
      finish(response({ code: "SESSION_UNAVAILABLE" }, 500));
    }
    await screen.findByText("logout failed");
    expect(screen.getByRole("textbox", { name: "draft" })).toHaveValue(
      "keep this draft",
    );
  });
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
    sendConfig();

    await waitFor(() => expect(toApi().length).toBeGreaterThan(0));
    expect(mockList).not.toHaveBeenCalled();
  });

  /**
   * 화면은 설정을 기다리지 않는다. 빌드 때 만드는 HTML 에 본문이 들어가야 검색 로봇이 읽는다.
   * 대신 서비스 호출이 기다린다 — 출처가 정해지기 전에는 어디로도 나가지 않는다. mock 으로도.
   */
  it("draws the screen at once, but lets no call out until the config arrives", async () => {
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );

    expect(screen.getByText("probe")).toBeInTheDocument();
    // 붙잡힌 호출이 그사이 다른 길로 새지 않는지, 몇 박자 지나 본다.
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(toApi()).toEqual([]);
    expect(mockList).not.toHaveBeenCalled();

    sendConfig();

    // 붙잡혀 있던 호출이 읽어 온 설정의 출처로 나간다.
    await waitFor(() => expect(toApi().length).toBeGreaterThan(0));
    expect(mockList).not.toHaveBeenCalled();
  });

  /**
   * 화면이 먼저 뜨므로 설정이 오기 전에 버튼을 누를 수 있다. 랜딩의 "Google로 시작하기"가 그렇다.
   * 그 호출도 설정을 기다렸다가 올바른 출처로 가야 한다.
   */
  it("holds a click made before the config arrives, then sends it to the loaded source", async () => {
    function Starter() {
      const services = useServices();
      return (
        <button onClick={() => void services.projects.list().catch(() => {})}>
          start
        </button>
      );
    }
    render(
      <AppProviders>
        <Starter />
      </AppProviders>,
    );

    await userEvent.click(screen.getByRole("button", { name: "start" }));
    expect(toApi()).toEqual([]);
    expect(mockList).not.toHaveBeenCalled();

    sendConfig();

    await waitFor(() => expect(toApi()).toHaveLength(1));
    expect(mockList).not.toHaveBeenCalled();
  });

  /**
   * 설정이 오기 전후로 provider 의 구조가 같아야 한다. 구조가 바뀌면 그 아래 화면이 처음부터
   * 다시 만들어져, 랜딩의 등장 동작이 다시 돌고 입력하던 값이 사라진다.
   */
  it("keeps the screen mounted when the config arrives", async () => {
    let mounts = 0;
    function Counter() {
      const [count, setCount] = useState(0);
      useEffect(() => {
        mounts += 1;
      }, []);
      return <button onClick={() => setCount(count + 1)}>count {count}</button>;
    }
    render(
      <AppProviders>
        <Counter />
        <Probe />
      </AppProviders>,
    );
    await userEvent.click(screen.getByRole("button"));

    sendConfig();
    await waitFor(() => expect(toApi().length).toBeGreaterThan(0));

    expect(mounts).toBe(1);
    expect(screen.getByRole("button")).toHaveTextContent("count 1");
  });

  /**
   * `?data=mock` 으로 열면 배포 설정과 상관없이 mock 으로 돈다. 주소는 설정을 받기 전에 읽어야
   * 한다 — 화면이 먼저 뜨므로 받는 사이에 링크를 눌러 주소가 바뀔 수 있다.
   */
  it("honors ?data=mock from the first address even if the address changes while the config loads", async () => {
    window.history.replaceState({}, "", "/?data=mock");
    render(
      <AppProviders>
        <Probe />
      </AppProviders>,
    );

    // 설정을 받는 사이에 다른 화면으로 옮겼고, 탭에 기억해 둔 값도 쓸 수 없다고 하자.
    window.history.replaceState({}, "", "/login/");
    window.sessionStorage.clear();
    sendConfig();

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    expect(toApi()).toEqual([]);
  });
});
