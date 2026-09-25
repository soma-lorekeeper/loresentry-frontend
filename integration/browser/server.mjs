import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
const pending = new Map();
const calls = [];
const root = path.resolve("src/services");
const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  const send = (body, cookie) => {
    res.setHeader("Content-Type", "application/json");
    if (cookie) res.setHeader("Set-Cookie", cookie);
    res.end(JSON.stringify(body));
  };
  if (url.pathname === "/") {
    res.setHeader("Content-Type", "text/html");
    res.end(`<script type="module">
      import {ApiClient} from '/modules/api/http';
      window.client=new ApiClient('/api');window.coord=window.client.coordinator;
      window.events=[];window.coord.subscribe(()=>window.events.push(window.coord.state().phase));
      window.ready=true;
    </script>`);
    return;
  }
  if (url.pathname.startsWith("/modules/")) {
    const file = path.resolve(root, url.pathname.slice(9) + ".ts");
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
      res.writeHead(404).end();
      return;
    }
    res.setHeader("Content-Type", "text/javascript");
    res.end(
      ts.transpileModule(fs.readFileSync(file, "utf8"), {
        compilerOptions: {
          target: ts.ScriptTarget.ES2022,
          module: ts.ModuleKind.ES2022,
        },
      }).outputText,
    );
    return;
  }
  if (url.pathname === "/control/reset") {
    calls.length = 0;
    send({});
    return;
  }
  if (url.pathname === "/control/calls") {
    send(calls);
    return;
  }
  if (url.pathname === "/control/release") {
    pending.get(url.searchParams.get("key"))?.();
    send({});
    return;
  }
  if (url.pathname === "/control/login") {
    send({}, "ls_session=new-session; HttpOnly; SameSite=Strict; Path=/");
    return;
  }
  if (!url.pathname.startsWith("/api/")) {
    res.writeHead(404).end();
    return;
  }
  calls.push(url.pathname + url.search);
  if (url.pathname === "/api/slow") {
    const key = url.searchParams.get("key");
    pending.set(key, () => {
      pending.delete(key);
      send(
        { done: true },
        "ls_session=old-session; HttpOnly; SameSite=Strict; Path=/",
      );
    });
    return;
  }
  if (url.pathname === "/api/auth/sessions/revoke") {
    pending.set("logout", () => {
      pending.delete("logout");
      send(
        { session_revocation: "confirmed" },
        "ls_session=; Max-Age=0; HttpOnly; SameSite=Strict; Path=/",
      );
    });
    return;
  }
  if (url.pathname === "/api/auth/users/me") {
    send({ id: "user", display_name: "writer", email: null });
    return;
  }
  send({ done: true });
});
server.listen(3199, "127.0.0.1");
