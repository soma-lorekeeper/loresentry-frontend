import { readFileSync, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";

/**
 * dist/ 를 CloudFront 처럼 서빙한다. 같은 함수(docs/deploy/cloudfront-rewrite.js)로 주소를 바꾸므로
 * 배포 전에 언어 고르기를 그대로 확인할 수 있다. 나라는 COUNTRY 환경변수로 흉내 낸다.
 *
 *   pnpm build:locales && COUNTRY=US pnpm serve:locales
 *
 * CONFIG_DELAY_MS 를 주면 config.json 만 그만큼 늦게 준다. 화면은 설정보다 먼저 그려지므로
 * (src/app/providers.tsx), 설정이 늦을 때 화면이 밀리거나 요청이 먼저 나가지 않는지 볼 때 쓴다.
 *
 *   CONFIG_DELAY_MS=4000 pnpm serve:locales
 */
const PORT = Number(process.env.PORT ?? 4000);
const COUNTRY = process.env.COUNTRY;
const CONFIG_DELAY_MS = Number(process.env.CONFIG_DELAY_MS ?? 0);
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
  const send = () => {
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(readFileSync(file));
  };
  if (CONFIG_DELAY_MS > 0 && file.endsWith("config.json"))
    setTimeout(send, CONFIG_DELAY_MS);
  else send();
}).listen(PORT, () => {
  console.log(`http://localhost:${PORT} (country: ${COUNTRY ?? "unknown"})`);
});
