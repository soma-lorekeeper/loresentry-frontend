import { readFileSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";

/**
 * dist/ 를 CloudFront 처럼 서빙한다. 같은 함수(docs/deploy/cloudfront-rewrite.js)로 주소를 바꾸므로
 * 배포 전에 언어 고르기를 그대로 확인할 수 있다. 나라는 COUNTRY 환경변수로 흉내 낸다.
 *
 *   pnpm build:locales && COUNTRY=US pnpm serve:locales
 */
const PORT = Number(process.env.PORT ?? 4000);
const COUNTRY = process.env.COUNTRY;
const source = readFileSync("docs/deploy/cloudfront-rewrite.js", "utf8");
const handler = new Function(`${source}; return handler;`)();

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
};

function cookiesOf(header = "") {
  const cookies = {};
  for (const part of header.split(";")) {
    const [name, value] = part.trim().split("=");
    if (name) cookies[name] = { value };
  }
  return cookies;
}

createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const headers = { host: { value: "loresentry.com" } };
  if (COUNTRY) headers["cloudfront-viewer-country"] = { value: COUNTRY };
  if (req.headers["accept-language"])
    headers["accept-language"] = { value: req.headers["accept-language"] };
  const result = handler({
    request: {
      uri: decodeURIComponent(url.pathname),
      headers,
      cookies: cookiesOf(req.headers.cookie),
      querystring: {},
    },
  });
  const file = join("dist", result.uri);
  if (!existsSync(file) || statSync(file).isDirectory()) {
    res.writeHead(404, { "content-type": "text/plain" }).end("not found");
    return;
  }
  res.writeHead(200, {
    "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    "cache-control": "no-store",
  });
  res.end(readFileSync(file));
}).listen(PORT, () => {
  console.log(`http://localhost:${PORT} (country: ${COUNTRY ?? "unknown"})`);
});
