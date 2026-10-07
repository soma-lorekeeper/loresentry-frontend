import { spawnSync } from "node:child_process";

for (const locale of ["ko", "en"]) {
  const result = spawnSync(
    "node",
    ["scripts/validate-static-export.mjs", `dist/${locale}`, `/${locale}`],
    { stdio: "inherit" },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
