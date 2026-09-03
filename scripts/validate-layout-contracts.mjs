import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const contracts = [
  {
    file: "src/features/workspace/components/workspace.module.css",
    declarations: [
      "min-height: 100svh",
      "grid-template-columns: 236px minmax(0, 1fr)",
      "overflow: hidden",
    ],
  },
  {
    file: "src/features/projects/components/project-list.module.css",
    declarations: [
      "min-height: 100vh",
      "grid-template-columns: 236px minmax(0, 1fr)",
      "min-width: 0",
      "text-overflow: ellipsis",
    ],
  },
  {
    file: "src/features/auth/components/login-page.module.css",
    declarations: ["min-height: 100svh", "width: min(360px, 100%)"],
  },
  {
    file: "src/features/property/components/property-document.module.css",
    declarations: ["min-width: 0", "overflow-x: hidden", "overflow-y: auto"],
  },
];

for (const contract of contracts) {
  const source = await readFile(
    new URL(`../${contract.file}`, import.meta.url),
    "utf8",
  );
  for (const declaration of contract.declarations) {
    assert.ok(
      source.includes(declaration),
      `${contract.file} lost layout guard: ${declaration}`,
    );
  }
}

console.log(
  `Validated ${contracts.length} representative layout contracts for clipping, overflow, and boundary guards.`,
);
