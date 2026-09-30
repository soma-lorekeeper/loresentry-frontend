/* Run by the BFF isolated runner. Only Google and static asset delivery are fixtures. */
import { createRequire } from "node:module";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import http from "node:http";
const loadModule = createRequire(import.meta.url);
const { chromium } = loadModule(
  process.env.PLAYWRIGHT_MODULE || "playwright-core",
);

(async () => {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const config = JSON.parse(input);
  const frontendOrigin = "http://localhost:3000";
  // A browser-only forward proxy preserves the product's fixed local origins
  // while routing to isolated processes, without using the running dev server.
  const proxy = http.createServer(async (request, response) => {
    const url = new URL(request.url);
    if (url.origin === "http://localhost:8000") {
      const upstream = http.request(
        {
          hostname: "127.0.0.1",
          port: config.bffPort,
          path: url.pathname + url.search,
          method: request.method,
          headers: request.headers,
        },
        (result) => {
          response.writeHead(result.statusCode, result.headers);
          result.pipe(response);
        },
      );
      upstream.on("error", () => {
        response.writeHead(502);
        response.end();
      });
      request.pipe(upstream);
      return;
    }
    if (url.origin !== frontendOrigin) {
      response.writeHead(403);
      response.end();
      return;
    }
    if (url.pathname === "/config.json") {
      response.setHeader("Content-Type", "application/json");
      response.end(
        JSON.stringify({
          dataSource: "api",
          apiBaseUrl: "http://localhost:8000",
        }),
      );
      return;
    }
    const file = path.resolve(
      config.output,
      decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html",
    );
    if (!file.startsWith(path.resolve(config.output) + path.sep)) {
      response.writeHead(403);
      response.end();
      return;
    }
    try {
      const stat = await fs.stat(file);
      const target = stat.isDirectory() ? path.join(file, "index.html") : file;
      const contentType =
        {
          ".html": "text/html",
          ".js": "text/javascript",
          ".css": "text/css",
          ".svg": "image/svg+xml",
          ".json": "application/json",
          ".woff2": "font/woff2",
          ".txt": "text/plain",
        }[path.extname(target)] || "application/octet-stream";
      response.writeHead(200, { "Content-Type": contentType });
      response.end(await fs.readFile(target));
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  // No external traffic. The observed Google authorization URL supplies the fixture inputs below.
  const tunnels = new Set();
  proxy.on("connect", (_request, socket) => {
    // Keep the fixture provider navigation pending until the explicit callback.
    // An immediate proxy error can otherwise race that callback navigation.
    tunnels.add(socket);
    socket.on("error", () => {});
    socket.on("close", () => tunnels.delete(socket));
  });
  await new Promise((resolve, reject) => {
    proxy.once("error", reject);
    proxy.listen(config.frontendPort, "127.0.0.1", resolve);
  });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE,
    headless: true,
    proxy: {
      server: `http://127.0.0.1:${config.frontendPort}`,
      bypass: "<-loopback>",
    },
    args: ["--no-sandbox"],
  });
  const checks = [];
  try {
    const context = await browser.newContext();
    let subject = "browser-new-user";
    const page = await context.newPage();
    page.on("response", (response) => {
      const url = new URL(response.url());
      if (url.pathname.startsWith("/auth/"))
        console.log(
          response.request().method(),
          url.pathname,
          response.status(),
        );
    });
    const goLogin = () => page.goto(`${frontendOrigin}/login/`);
    const login = async () => {
      const request = page.waitForRequest((request) =>
        request
          .url()
          .startsWith("https://accounts.google.com/o/oauth2/v2/auth?"),
      );
      await page
        .getByRole("button", { name: "Google로 계속하기", exact: true })
        .click({ noWaitAfter: true });
      const query = new URL((await request).url()).searchParams;
      console.log("observed provider request");
      const code = Buffer.from(
        JSON.stringify({
          subject,
          nonce: query.get("nonce"),
          challenge: query.get("code_challenge"),
        }),
      ).toString("base64url");
      const callback = new URL(query.get("redirect_uri"));
      callback.searchParams.set("state", query.get("state"));
      callback.searchParams.set("code", code);
      // External provider boundary: submit the fixture authorization code to the real callback.
      await page.goto(callback.toString());
    };
    console.log("open login");
    await goLogin();
    console.log("start OAuth");
    await login();
    console.log("returned from OAuth");
    console.log("wait for consent dialog");
    await page.getByRole("dialog").waitFor();
    assert.equal(
      new URL(page.url()).searchParams.get("result"),
      "terms_required",
    );
    let cookies = await context.cookies();
    const consent = cookies.find((cookie) => cookie.name === "ls_consent");
    assert(consent && consent.httpOnly && consent.sameSite === "Strict");
    assert(!cookies.some((cookie) => cookie.name === "ls_session"));
    assert(
      !(await page.evaluate(() => document.cookie)).includes("ls_consent"),
    );
    const protectedStatus = await page.evaluate(
      async () =>
        (
          await fetch("http://localhost:8000/auth/users/me", {
            credentials: "include",
          })
        ).status,
    );
    assert.equal(protectedStatus, 401);
    const csrfStatus = await page.evaluate(
      async () =>
        (
          await fetch("http://localhost:8000/auth/terms/accept", {
            method: "POST",
            credentials: "include",
          })
        ).status,
    );
    assert.equal(csrfStatus, 403);
    assert(
      await page.getByRole("button", { name: "동의하고 계속" }).isDisabled(),
    );
    checks.push(
      "Google fixture return: pending HttpOnly Strict cookie, no login, protected API denied, CSRF denied",
    );
    await page.getByRole("button", { name: "약관 닫기" }).click();
    await page.waitForURL((url) => !url.searchParams.has("result"));
    assert(
      (await context.cookies()).some((cookie) => cookie.name === "ls_consent"),
    );
    await page.goto(`${frontendOrigin}/login/?result=terms_required`);
    console.log("wait for consent dialog");
    await page.getByRole("dialog").waitFor();
    const accepted = page.waitForResponse(
      (response) =>
        response.url().endsWith("/auth/terms/accept") &&
        response.request().method() === "POST",
    );
    const me = page.waitForResponse(
      (response) =>
        response.url().endsWith("/auth/users/me") && response.status() === 200,
    );
    void accepted.catch(() => {});
    void me.catch(() => {});
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "동의하고 계속" }).click();
    const completion = await accepted;
    assert.equal(completion.status(), 204);
    // HTTP contract tests check the empty payload; Chromium need not retain a 204 body.
    assert.equal(completion.headers()["content-length"] ?? "0", "0");
    const user = await (await me).json();
    assert(user.id);
    await page.waitForURL(/\/projects/);
    cookies = await context.cookies();
    assert(
      cookies.some((cookie) => cookie.name === "ls_session" && cookie.httpOnly),
    );
    assert(!cookies.some((cookie) => cookie.name === "ls_consent"));
    checks.push(
      "close preserves pending; reentry reads terms; explicit consent 204; fresh me before project navigation",
    );
    const logout = await page.evaluate(
      async () =>
        (
          await fetch("http://localhost:8000/auth/sessions/revoke", {
            method: "POST",
            headers: { "X-LS-CSRF": "1" },
            credentials: "include",
          })
        ).status,
    );
    assert.equal(logout, 200);
    assert(
      !(await context.cookies()).some((cookie) => cookie.name === "ls_session"),
    );
    console.log("open login");
    await goLogin();
    console.log("start OAuth");
    await login();
    console.log("returned from OAuth");
    await page.waitForURL(/\/projects/);
    assert.equal(await page.getByRole("dialog").count(), 0);
    checks.push("logout and already-consented Google relogin bypass consent");
    await fs.writeFile(
      config.report,
      JSON.stringify(
        { checks, google: "fixture", browser: "Chromium", production: false },
        null,
        2,
      ),
    );
    console.log("PASS", checks);
  } catch (error) {
    console.error(
      "scenario",
      error.name,
      error.message.split("\n")[0].replace(/https?:\/\/[^\s"]+/g, (value) => {
        try {
          const url = new URL(value);
          return url.origin + url.pathname;
        } catch {
          return "[URL]";
        }
      }),
    );
    throw error;
  } finally {
    await browser.close();
    for (const socket of tunnels) socket.destroy();
    proxy.closeAllConnections();
    await new Promise((resolve) => proxy.close(resolve));
  }
})().catch((error) => {
  console.error(
    error.name,
    error.message.split("\n")[0].replace(/https?:\/\/[^\s"]+/g, (value) => {
      try {
        const url = new URL(value);
        return url.origin + url.pathname;
      } catch {
        return "[URL]";
      }
    }),
    error.stack?.split("\n").filter((line) => line.includes("terms.mjs")),
  );
  process.exitCode = 1;
});
