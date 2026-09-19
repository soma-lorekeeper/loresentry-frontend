import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CATALOG_URL = new URL(
  "../src/design-system/screens/pencil-screen-catalog.json",
  import.meta.url,
);
const VARIABLES_URL = new URL(
  "../src/design-system/tokens/pencil-variables.json",
  import.meta.url,
);
const SCREEN_SOURCE = "docs/design/lorekeeper.pen";
const LIGHT_SUFFIX = " · Light";

const SNIPPETS = {
  screens: `const found = Get(n => (n.type === "frame" && /^\\d+ · /.test(n.name || "") && n.width === 1440 && n.height === 900) ? {id: n.id, name: n.name} : undefined);
const list = (Array.isArray(found) ? found : [found]).flat().filter(Boolean);
const unique = [...new Map(list.map(x => [x.id, x])).values()];
unique.sort((a, b) => parseInt(a.name) - parseInt(b.name) || a.name.localeCompare(b.name));
Print(unique.map(x => x.id + "\\t" + x.name).join("\\n"));`,
  variables: `const v = GetVariables();
const out = { themes: {}, variables: {} };
for (const [axis, values] of Object.entries(v.themes || {})) out.themes[axis.replace(/^b:/, "")] = values;
for (const [name, def] of Object.entries(v.variables || {})) {
  const value = Array.isArray(def.value)
    ? def.value.map(e => ({ value: e.value, theme: Object.fromEntries(Object.entries(e.theme || {}).map(([k, t]) => [k.replace(/^b:/, ""), t])) }))
    : def.value;
  out.variables[name.replace(/^b:/, "")] = { type: def.type, value };
}
Print(JSON.stringify(out));`,
};

export function buildScreenCatalog(tsv, syncedAt) {
  const rows = tsv
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [pencilNodeId, frameName] = line.split("\t");
      if (!pencilNodeId || !frameName) {
        throw new Error(`Malformed Pencil screen row: ${line}`);
      }
      return { frameName, pencilNodeId };
    });

  const frameNames = new Set(rows.map((row) => row.frameName));
  const screens = new Map();

  for (const { frameName, pencilNodeId } of rows) {
    const isLightPair =
      frameName.endsWith(LIGHT_SUFFIX) &&
      frameNames.has(frameName.slice(0, -LIGHT_SUFFIX.length));
    const baseName = isLightPair
      ? frameName.slice(0, -LIGHT_SUFFIX.length)
      : frameName;
    const [numberPart, ...nameParts] = baseName.split(" · ");
    const screenNumber = Number.parseInt(numberPart, 10);
    const name = nameParts.join(" · ");
    if (!Number.isInteger(screenNumber) || !name) {
      throw new Error(`Screen name must start with a number: ${frameName}`);
    }

    const screen = screens.get(screenNumber) ?? { screenNumber, name };
    if (screen.name !== name) {
      throw new Error(`Screen ${screenNumber} has two different names`);
    }
    if (isLightPair) screen.lightPencilNodeId = pencilNodeId;
    else screen.pencilNodeId = pencilNodeId;
    screens.set(screenNumber, screen);
  }

  const ordered = [...screens.values()]
    .sort((a, b) => a.screenNumber - b.screenNumber)
    .map(({ screenNumber, name, pencilNodeId, lightPencilNodeId }) => {
      if (!pencilNodeId) {
        throw new Error(`Screen ${screenNumber} has no primary frame`);
      }
      return {
        screenNumber,
        name,
        pencilNodeId,
        ...(lightPencilNodeId ? { lightPencilNodeId } : {}),
      };
    });

  return {
    screenCount: ordered.length,
    source: SCREEN_SOURCE,
    syncedAt,
    screens: ordered,
  };
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function writeJson(url, value) {
  await writeFile(url, `${JSON.stringify(value, null, 2)}\n`);
}

async function main([command, target]) {
  if (command === "snippet" && target in SNIPPETS) {
    console.log(SNIPPETS[target]);
    return;
  }
  const syncedAt = new Date().toISOString().slice(0, 10);
  if (command === "screens") {
    const catalog = buildScreenCatalog(await readStdin(), syncedAt);
    await writeJson(CATALOG_URL, catalog);
    console.log(`Wrote ${catalog.screenCount} screens.`);
    return;
  }
  if (command === "variables") {
    const parsed = JSON.parse(await readStdin());
    await writeJson(VARIABLES_URL, { syncedAt, ...parsed });
    console.log(
      `Wrote ${Object.keys(parsed.variables).length} variables. Run pnpm tokens next.`,
    );
    return;
  }
  console.error(
    [
      "Usage:",
      "  node scripts/sync-pencil.mjs snippet <screens|variables>",
      "  node scripts/sync-pencil.mjs screens   < pencil-output.tsv",
      "  node scripts/sync-pencil.mjs variables < pencil-output.json",
    ].join("\n"),
  );
  process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === resolve(process.argv[1] ?? "")) {
  await main(process.argv.slice(2));
}
