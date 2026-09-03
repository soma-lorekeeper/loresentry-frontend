import assert from "node:assert/strict";
import { once } from "node:events";
import { access, readdir, readFile, stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const outputDirectory = fileURLToPath(new URL("../out", import.meta.url));
const requiredFiles = [
  "index.html",
  "design-system/index.html",
  "projects/index.html",
  "projects/guide/index.html",
  "projects/trash/index.html",
  "workspace/index.html",
  "config.json",
];

for (const file of requiredFiles) {
  await access(resolve(outputDirectory, file));
}

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? collectFiles(path) : path;
    }),
  );
  return files.flat();
}

const outputFiles = await collectFiles(outputDirectory);
assert.ok(
  outputFiles.some((file) => file.includes("/_next/static/")),
  "out/_next/static must contain browser assets",
);
assert.equal(
  outputFiles.some(
    (file) => file.endsWith("/server.js") || file.endsWith(".nft.json"),
  ),
  false,
  "static export must not contain a Node.js server artifact",
);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url ?? "/", "http://static.local").pathname,
    );
    const relativePath = pathname.replace(/^\/+/, "");
    let filePath = resolve(outputDirectory, relativePath || "index.html");

    assert.ok(
      filePath === outputDirectory ||
        filePath.startsWith(`${outputDirectory}/`),
      "request path must remain inside out",
    );

    if (!extname(filePath) && relativePath) {
      filePath = resolve(filePath, "index.html");
    } else if ((await stat(filePath)).isDirectory()) {
      filePath = resolve(filePath, "index.html");
    }

    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type":
        contentTypes[extname(filePath)] ?? "application/octet-stream",
    });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

server.listen(0, "127.0.0.1");
await once(server, "listening");

const routes = [
  "/",
  "/design-system/",
  "/projects?projectState=project-list-default",
  "/projects?globalState=account-settings-long-values-light",
  "/projects?globalState=feedback-open-error",
  "/projects/guide",
  "/projects/guide?topic=workspace-start",
  "/projects/trash?trashState=project-trash-default",
  "/workspace?projectId=glass-garden",
];

try {
  const address = server.address();
  assert.ok(address && typeof address === "object");

  for (const path of routes) {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    assert.equal(response.status, 200, `${path} must return HTTP 200`);
    assert.match(
      await response.text(),
      /<!DOCTYPE html>/i,
      `${path} must return HTML`,
    );
  }
} finally {
  await new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}

console.log(
  `Validated ${outputFiles.length} static files and ${routes.length} CDN-style HTTP routes.`,
);
