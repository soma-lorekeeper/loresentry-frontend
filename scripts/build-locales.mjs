import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, renameSync, rmSync } from "node:fs";

/**
 * 한국어판과 영어판을 차례로 export 해 dist/ko, dist/en 에 둔다. 문구는 빌드 때 굳으므로 언어마다
 * 따로 빌드한다. 자산 주소에 언어를 붙여(/ko/_next/...) 두 판이 같은 버킷에서 섞이지 않게 한다.
 * public-<언어>/ 가 있으면 그 판에만 덮어쓴다 — 약관·개인정보처리방침처럼 언어마다 다른 정적 파일이다.
 */
const LOCALES = ["ko", "en"];
const DIST = "dist";

rmSync(DIST, { recursive: true, force: true });
mkdirSync(DIST);

for (const locale of LOCALES) {
  console.log(`\n▶ ${locale} 빌드`);
  const result = spawnSync("pnpm", ["build"], {
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_LOCALE: locale,
      NEXT_PUBLIC_ASSET_PREFIX: `/${locale}`,
    },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  renameSync("out", `${DIST}/${locale}`);
  const overlay = `public-${locale}`;
  if (existsSync(overlay))
    cpSync(overlay, `${DIST}/${locale}`, { recursive: true });
}
