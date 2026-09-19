import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const OUT = "out";
const ROUTES = [
  "",
  "login/",
  "logout/",
  "projects/",
  "projects/trash/",
  "projects/guide/",
  "workspace/",
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

const files = walk(OUT);
const htmlFiles = files.filter((file) => file.endsWith(".html"));

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  for (const [, ref] of html.matchAll(/(?:src|href)="(\/_next\/[^"?#]+)/g)) {
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
  `정적 export 검증 통과: 라우트 ${ROUTES.length}개, HTML ${htmlFiles.length}개, 파일 ${files.length}개`,
);
