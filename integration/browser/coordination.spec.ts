import { test, expect, type Page } from "@playwright/test";
import type { ApiClient } from "../../src/services/api/http";
import type { AuthCoordinator } from "../../src/services/api/auth-coordinator";
declare global {
  interface Window {
    client: ApiClient;
    coord: AuthCoordinator;
    ready: boolean;
    events: string[];
    outcomes: string[];
    abort?: AbortController;
  }
}
async function ready(page: Page) {
  await page.goto("/");
  await page.waitForFunction(() => window.ready);
}
test.beforeEach(async ({ request }) => {
  await request.get("/control/reset");
});
test("parallel activity drains headers before logout and blocks late tabs", async ({
  context,
  page,
  request,
}) => {
  await ready(page);
  const second = await context.newPage();
  await ready(second);
  await page.evaluate(() => {
    window.outcomes = [];
    for (const key of ["a", "b"])
      void window.client.request(`/slow?key=${key}`).then(
        () => window.outcomes.push("old-success"),
        (error) => window.outcomes.push(error.name),
      );
  });
  await expect
    .poll(
      async () => (await (await request.get("/control/calls")).json()).length,
    )
    .toBe(2);
  await second.evaluate(() => {
    window.outcomes = [];
    void window.coord
      .transition("logout", () =>
        window.client.request("/auth/sessions/revoke", {
          method: "POST",
          authTransition: true,
        }),
      )
      .then(() => window.outcomes.push("logout"));
  });
  await expect
    .poll(() => page.evaluate(() => window.events.includes("transition")))
    .toBe(true);
  const late = await context.newPage();
  await ready(late);
  expect(
    await late.evaluate(() =>
      window.client.request("/late").then(
        () => "wrong",
        (error) => error.code,
      ),
    ),
  ).toBe("busy");
  await request.get("/control/release?key=a");
  expect(await (await request.get("/control/calls")).json()).toHaveLength(2);
  await request.get("/control/release?key=b");
  await expect
    .poll(
      async () => (await (await request.get("/control/calls")).json()).length,
    )
    .toBe(3);
  await expect
    .poll(() => page.evaluate(() => window.outcomes))
    .toEqual(["AbortError", "AbortError"]);
  expect(
    (await context.cookies()).find((c) => c.name === "ls_session")?.value,
  ).toBe("old-session");
  await request.get("/control/release?key=logout");
  await expect
    .poll(() => second.evaluate(() => window.outcomes))
    .toEqual(["logout"]);
  expect(
    (await context.cookies()).find((c) => c.name === "ls_session"),
  ).toBeUndefined();
});
test("new login waits for logout headers and simultaneous completion is idempotent", async ({
  context,
  page,
  request,
}) => {
  await ready(page);
  const second = await context.newPage();
  await ready(second);
  await page.evaluate(() => {
    void window.coord.transition("logout", () =>
      window.client.request("/auth/sessions/revoke", {
        method: "POST",
        authTransition: true,
      }),
    );
  });
  await expect
    .poll(
      async () => (await (await request.get("/control/calls")).json()).length,
    )
    .toBe(1);
  await second.evaluate(() => {
    window.outcomes = [];
    void window.coord.transition("login", async () => {
      await fetch("/control/login");
      window.outcomes.push("login");
    });
  });
  expect(await second.evaluate(() => window.outcomes)).toEqual([]);
  await request.get("/control/release?key=logout");
  await expect
    .poll(() => second.evaluate(() => window.outcomes))
    .toEqual(["login"]);
  expect(
    (await context.cookies()).find((c) => c.name === "ls_session")?.value,
  ).toBe("new-session");
  const users = await second.evaluate(() =>
    Promise.all(
      [1, 2].map(() =>
        window.coord.completeLogin(() =>
          window.client.request("/auth/users/me", { authTransition: true }),
        ),
      ),
    ),
  );
  expect(users).toHaveLength(2);
  expect(
    (await (await request.get("/control/calls")).json()).filter((p: string) =>
      p.includes("users/me"),
    ),
  ).toHaveLength(1);
  expect(await page.evaluate(() => window.coord.state().phase)).toBe("active");
});
test("caller abort does not release a request before cookie headers", async ({
  context,
  page,
  request,
}) => {
  await ready(page);
  const second = await context.newPage();
  await ready(second);
  await page.evaluate(() => {
    window.abort = new AbortController();
    void window.client
      .request("/slow?key=abort", { signal: window.abort.signal })
      .catch(() => {});
  });
  await expect
    .poll(
      async () => (await (await request.get("/control/calls")).json()).length,
    )
    .toBe(1);
  await page.evaluate(() => window.abort!.abort());
  await second.evaluate(() => {
    void window.coord.transition("logout", () =>
      window.client.request("/auth/sessions/revoke", {
        method: "POST",
        authTransition: true,
      }),
    );
  });
  await expect
    .poll(() => second.evaluate(() => window.coord.state().phase))
    .toBe("transition");
  expect(await (await request.get("/control/calls")).json()).toHaveLength(1);
  await request.get("/control/release?key=abort");
  await expect
    .poll(
      async () => (await (await request.get("/control/calls")).json()).length,
    )
    .toBe(2);
  await request.get("/control/release?key=logout");
});
test("closed login tab leaves a barrier until explicit recovery", async ({
  context,
  page,
}) => {
  await ready(page);
  await page.evaluate(() => window.coord.transition("login", async () => {}));
  await page.close();
  const next = await context.newPage();
  await ready(next);
  expect(
    await next.evaluate(() =>
      window.client.request("/late").then(
        () => "wrong",
        (error) => error.code,
      ),
    ),
  ).toBe("busy");
  expect(
    await next.evaluate(() =>
      window.coord
        .transition("login", async () => {})
        .then(
          () => "wrong",
          (error) => error.code,
        ),
    ),
  ).toBe("busy");
  await next.evaluate(() =>
    window.coord.transition(
      "login",
      async () => {
        await fetch("/control/login");
      },
      true,
    ),
  );
  await next.evaluate(() =>
    window.coord.completeLogin(() =>
      window.client.request("/auth/users/me", { authTransition: true }),
    ),
  );
  expect(await next.evaluate(() => window.coord.state().phase)).toBe("active");
});
