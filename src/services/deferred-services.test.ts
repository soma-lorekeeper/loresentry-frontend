import { describe, expect, it, vi } from "vitest";

import { DEFAULT_RUNTIME_CONFIG } from "@/config/runtime-config";

import { createServices } from "./create-services";
import { deferServices } from "./deferred-services";
import { createMockServices } from "./mock";
import type { Services } from "./ports";

type Port = Record<string, unknown>;

/** 모든 함수를 spy 로 바꾼 서비스. 어느 것이 불렸는지 본다. */
function spied(source: Services) {
  const copy: Record<string, Port> = {};
  for (const [port, members] of Object.entries(source)) {
    copy[port] = Object.fromEntries(
      Object.keys(members as Port).map((name) => [
        name,
        vi.fn(() => Promise.resolve(`${port}.${name}`)),
      ]),
    );
  }
  return copy as unknown as Services;
}

function calls(services: Services) {
  return Object.values(services).flatMap((port) =>
    Object.values(port as Port).flatMap(
      (member) => (member as ReturnType<typeof vi.fn>).mock.calls,
    ),
  );
}

describe("deferServices", () => {
  it("holds calls made before the source is known, then sends them to the real services in order", async () => {
    const shape = spied(createMockServices());
    const real = spied(createMockServices());
    const deferred = deferServices(shape);

    const first = deferred.services.projects.get("p1");
    const second = deferred.services.memos.update("m1", "body");
    await Promise.resolve();

    // 출처가 정해지기 전에는 어디로도 나가지 않는다. 모양을 빌려 준 쪽으로도.
    expect(calls(real)).toEqual([]);
    expect(calls(shape)).toEqual([]);

    deferred.settle(real);
    await expect(first).resolves.toBe("projects.get");
    await expect(second).resolves.toBe("memos.update");

    expect(real.projects.get).toHaveBeenCalledWith("p1");
    expect(real.memos.update).toHaveBeenCalledWith("m1", "body");
    const order = [real.projects.get, real.memos.update].map(
      (member) => vi.mocked(member).mock.invocationCallOrder[0],
    );
    expect(order[0]).toBeLessThan(order[1]);
    expect(calls(shape)).toEqual([]);
  });

  it("passes a failure from the real services back to the caller that waited", async () => {
    const real = spied(createMockServices());
    const failure = new Error("nope");
    vi.mocked(real.auth.getSession).mockRejectedValue(failure);
    const deferred = deferServices(createMockServices());

    const waiting = deferred.services.auth.getSession();
    deferred.settle(real);

    await expect(waiting).rejects.toBe(failure);
  });

  it("calls the real function directly once the source is known", () => {
    const real = spied(createMockServices());
    const answer = Promise.resolve([]);
    vi.mocked(real.projects.list).mockReturnValue(answer);
    const deferred = deferServices(createMockServices());

    deferred.settle(real);

    // 같은 Promise 가 그대로 돌아온다 — 사이에 한 박자도 끼지 않는다.
    expect(deferred.services.projects.list()).toBe(answer);
    expect(real.projects.list).toHaveBeenCalledTimes(1);
  });

  it("keeps the first source and ignores a second one", async () => {
    const first = spied(createMockServices());
    const second = spied(createMockServices());
    const deferred = deferServices(createMockServices());

    deferred.settle(first);
    deferred.settle(second);
    await deferred.services.help.guides();

    expect(first.help.guides).toHaveBeenCalledTimes(1);
    expect(calls(second)).toEqual([]);
  });

  it("hands out the same port objects before and after, so effects that depend on them do not rerun", () => {
    const deferred = deferServices(createMockServices());
    const before = deferred.services.auth;

    deferred.settle(spied(createMockServices()));

    expect(deferred.services.auth).toBe(before);
  });

  it("calls a member as a method of its port", async () => {
    const real = createMockServices();
    const port = {
      ...real.help,
      guides(this: unknown) {
        return Promise.resolve(this === port ? [] : null) as ReturnType<
          Services["help"]["guides"]
        >;
      },
    };
    const deferred = deferServices(createMockServices());

    deferred.settle({ ...real, help: port });

    await expect(deferred.services.help.guides()).resolves.toEqual([]);
  });

  /**
   * 대리 객체는 mock 의 이름으로 만든다. 실제 서비스에 그 이름의 함수가 없으면 부를 때 터지고,
   * 실제 서비스에만 있는 함수는 화면에서 부를 수 없게 된다. 두 출처 모두에서 이름이 맞는지 본다.
   */
  it.each([
    ["mock", () => createMockServices()],
    [
      "api",
      () =>
        createServices({
          ...DEFAULT_RUNTIME_CONFIG,
          dataSource: "api",
          apiBaseUrl: "https://api.test.invalid",
        }),
    ],
  ])("covers every port and function of the %s services", (_, create) => {
    const real = create();
    const { services } = deferServices(createMockServices());

    expect(Object.keys(services).sort()).toEqual(Object.keys(real).sort());
    for (const port of Object.keys(real) as (keyof Services)[]) {
      const functions = Object.entries(real[port] as unknown as Port)
        .filter(([, member]) => typeof member === "function")
        .map(([name]) => name)
        .sort();
      expect(Object.keys(services[port]).sort(), port).toEqual(functions);
    }
  });
});
