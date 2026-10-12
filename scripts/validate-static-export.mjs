import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

// 인자 없이 부르면 pnpm build 결과(out/)를, `dist/ko /ko` 처럼 부르면 언어판 하나를 본다.
// 언어판은 자산 주소 앞에 언어가 붙는다(next.config.ts 의 assetPrefix).
const OUT = process.argv[2] ?? "out";
const PREFIX = process.argv[3] ?? "";
const ROUTES = [
  "",
  "login/",
  "logout/",
  "welcome/",
  "goodbye/",
  "projects/",
  "projects/trash/",
  "projects/guide/",
  "workspace/",
  "policies/terms/",
  "policies/privacy/",
];
const MAX_ASSET_BYTES = 2_500_000;

const errors = [];

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

if (!existsSync(OUT)) {
  console.error(`${OUT}/ 가 없습니다. 먼저 pnpm build 를 실행하세요.`);
  process.exit(1);
}

// CloudFront 함수(docs/deploy/cloudfront-rewrite.js)는 /path/ 를 /path/index.html 로 바꾼다.
for (const route of ROUTES) {
  if (!existsSync(join(OUT, route, "index.html")))
    errors.push(`라우트 /${route} 의 index.html 이 없습니다.`);
}
if (!existsSync(join(OUT, "404.html"))) errors.push("404.html 이 없습니다.");

const configPath = join(OUT, "config.json");
if (!existsSync(configPath)) {
  errors.push("config.json 이 없습니다. 런타임 설정을 읽지 못합니다.");
} else {
  try {
    const config = JSON.parse(readFileSync(configPath, "utf8"));
    if (config.dataSource && !["mock", "api"].includes(config.dataSource))
      errors.push(
        `config.json 의 dataSource 값이 잘못됐습니다: ${config.dataSource}`,
      );
  } catch {
    errors.push("config.json 을 JSON 으로 읽을 수 없습니다.");
  }
}

// 검색 로봇과 공유 미리보기가 찾는 파일. public/ 에서 그대로 복사된다(og-image.png 는 영어판만
// public-en/ 의 것으로 덮인다).
for (const file of [
  "robots.txt",
  "sitemap.xml",
  "og-image.png",
  "icon.svg",
  "favicon.ico",
]) {
  if (!existsSync(join(OUT, file))) errors.push(`${file} 이 없습니다.`);
}

// 색인 규칙. 색인은 기본으로 닫혀 있고(src/app/layout.tsx), 검색에 내보낼 페이지만 publicPage() 로
// 연다(src/app/site-metadata.ts). sitemap.xml 에 적은 주소와 실제로 열린 페이지가 같아야 한다.
//   - sitemap 에 있는데 noindex 면: 내보내려던 페이지가 검색에서 사라진다(메인이 여기에 해당한다).
//   - sitemap 에 없는데 열려 있으면: 로그인해야 보이는 빈 화면이 색인된다.
const SITE = "https://loresentry.com";
// 인자 없이 부르면(out/) 한국어판이다. 언어의 기본값이 ko 다(src/i18n/locale.ts).
const localeBase = `${SITE}/${PREFIX.slice(1) || "ko"}/`;
const sitemapPath = join(OUT, "sitemap.xml");
const publicRoutes = existsSync(sitemapPath)
  ? [...readFileSync(sitemapPath, "utf8").matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map(([, loc]) => loc)
      // sitemap 은 두 언어판이 함께 쓰는 파일이라, 이 언어판의 주소만 본다.
      .filter((loc) => loc.startsWith(localeBase))
      .map((loc) => loc.slice(localeBase.length))
  : [];

for (const route of publicRoutes) {
  if (!ROUTES.includes(route))
    errors.push(`sitemap.xml 의 /${route} 는 검사하는 라우트 목록에 없습니다.`);
}
for (const route of ROUTES) {
  const page = join(OUT, route, "index.html");
  // 파일이 없는 경우는 위에서 이미 보고했다.
  if (!existsSync(page)) continue;
  const html = readFileSync(page, "utf8");
  const noindex = /<meta name="robots" content="[^"]*noindex/.test(html);
  if (!publicRoutes.includes(route)) {
    if (!noindex)
      errors.push(
        `sitemap.xml 에 없는 /${route} 가 색인에 열려 있습니다. publicPage() 를 빼거나 sitemap.xml 에 적으세요.`,
      );
    continue;
  }
  if (noindex)
    errors.push(
      `sitemap.xml 에 있는 /${route} 가 noindex 입니다. 그 page 의 metadata 에 publicPage() 가 있는지 확인하세요.`,
    );
  // canonical 이 sitemap 의 주소와 다르면 검색엔진이 두 주소를 다른 문서로 본다.
  const canonical = /<link rel="canonical" href="([^"]+)"/.exec(html)?.[1];
  if (canonical !== `${localeBase}${route}`)
    errors.push(
      `/${route} 의 canonical(${canonical ?? "없음"})이 sitemap.xml 의 주소(${localeBase}${route})와 다릅니다.`,
    );
  // 검색에 내보내는 페이지는 본문이 HTML 에 들어 있어야 한다. 스크립트를 실행하지 않는 로봇은
  // HTML 만 읽는다. 화면 전체가 설정을 기다리던 때에는 이 본문이 비어 있었다(src/app/providers.tsx).
  // 스크립트 안에도 같은 글이 데이터로 들어 있으므로, 스크립트와 스타일을 걷어 내고 본다.
  const body = html
    .slice(html.indexOf("<body"))
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/g, "");
  const text = body
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!/<h1[\s>]/.test(body) || text.length < 200)
    errors.push(
      `sitemap.xml 에 있는 /${route} 의 HTML 에 본문이 없습니다(<h1> ${/<h1[\s>]/.test(body) ? "있음" : "없음"}, 글자 ${text.length}자). 빌드 때 화면이 그려지지 않았습니다.`,
    );
}

const files = walk(OUT);
const htmlFiles = files.filter((file) => file.endsWith(".html"));

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  const assetRef = new RegExp(`(?:src|href)="${PREFIX}(/_next/[^"?#]+)`, "g");
  for (const [, ref] of html.matchAll(assetRef)) {
    if (!existsSync(join(OUT, ref)))
      errors.push(`${relative(OUT, file)} 가 없는 자산을 가리킵니다: ${ref}`);
  }
}

for (const file of files) {
  if (/\.(map|env)$|\.env\./.test(file))
    errors.push(`배포하면 안 되는 파일이 있습니다: ${relative(OUT, file)}`);
  if (file.includes(`${join(OUT, "api")}`))
    errors.push(
      `정적 export 에 API 라우트가 섞였습니다: ${relative(OUT, file)}`,
    );
  const size = statSync(file).size;
  if (file.endsWith(".js") && size > MAX_ASSET_BYTES)
    errors.push(
      `스크립트가 너무 큽니다(${(size / 1e6).toFixed(1)}MB): ${relative(OUT, file)}`,
    );
}

if (errors.length > 0) {
  console.error(`정적 export 검증 실패 (${errors.length}건)`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(
  `정적 export 검증 통과(${OUT}): 라우트 ${ROUTES.length}개, HTML ${htmlFiles.length}개, 파일 ${files.length}개`,
);
