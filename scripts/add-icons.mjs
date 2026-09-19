import { readFile, writeFile } from "node:fs/promises";

const REGISTRY = new URL(
  "../src/design-system/icons/icon-registry.ts",
  import.meta.url,
);
const source = await readFile(REGISTRY, "utf8");
const existing = [...source.matchAll(/^\s+"?([a-z0-9-]+)"?:\s/gm)].map(
  (m) => m[1],
);
const names = [...new Set([...existing, ...process.argv.slice(2)])].sort();
const pascal = (name) =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
const lines = [
  "import {",
  ...names.map((name) => `  ${pascal(name)},`),
  "  type LucideIcon,",
  '} from "lucide-react";',
  "",
  "export const ICONS = {",
  ...names.map((name) => `  "${name}": ${pascal(name)},`),
  "} satisfies Record<string, LucideIcon>;",
  "",
  "export type IconName = keyof typeof ICONS;",
  "",
];
await writeFile(REGISTRY, lines.join("\n"));
console.log(`${names.length} icons registered.`);
