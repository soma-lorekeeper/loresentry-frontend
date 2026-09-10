import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const registryUrl = new URL(
  "../src/design-system/pencil-registry.json",
  import.meta.url,
);
const registry = JSON.parse(await readFile(registryUrl, "utf8"));
const tokenCss = await readFile(
  new URL("../src/design-system/tokens.css", import.meta.url),
  "utf8",
);
const sourceRoot = new URL("../src/", import.meta.url);

const unique = (values) => new Set(values).size === values.length;
const countBy = (items, key) =>
  Object.fromEntries(
    [...new Set(items.map((item) => item[key]))]
      .sort()
      .map((value) => [
        value,
        items.filter((item) => item[key] === value).length,
      ]),
  );

assert.deepEqual(registry.themes, { mode: ["dark", "light"] });
assert.equal(registry.tokens.length, 64, "Pencil token count must stay at 64");
assert.equal(
  registry.tokens.filter((token) => token.type === "color").length,
  38,
  "Pencil themed color count must stay at 38",
);
assert.equal(
  registry.tokens.filter((token) => token.type === "number").length,
  24,
  "Pencil number token count must stay at 24",
);
assert.equal(
  registry.tokens.filter((token) => token.type === "string").length,
  2,
  "Pencil string token count must stay at 2",
);
assert.ok(
  unique(registry.tokens.map((token) => token.name)),
  "duplicate token name",
);
assert.ok(
  unique(registry.tokens.map((token) => token.cssVariable)),
  "duplicate CSS variable",
);

for (const token of registry.tokens) {
  assert.match(token.cssVariable, /^--lk-[a-z0-9-]+$/);
  if (token.type === "color") {
    assert.deepEqual(Object.keys(token.value).sort(), ["dark", "light"]);
    // 알파 채널을 쓰는 그림자·스크림 토큰이 있어 8자리도 받는다
    assert.match(token.value.dark, /^#[0-9A-F]{6}([0-9A-F]{2})?$/);
    assert.match(token.value.light, /^#[0-9A-F]{6}([0-9A-F]{2})?$/);
    assert.match(
      tokenCss,
      new RegExp(`${token.cssVariable}: ${token.value.dark}`, "i"),
    );
    assert.match(
      tokenCss,
      new RegExp(`${token.cssVariable}: ${token.value.light}`, "i"),
    );
  } else {
    const expectedValue =
      token.type === "string"
        ? JSON.stringify(token.value)
        : `${token.value}${token.unit ?? ""}`;
    assert.match(
      tokenCss,
      new RegExp(`${token.cssVariable}: ${expectedValue}`, "i"),
    );
  }
}

const declaredTokenNames = [
  ...new Set(tokenCss.match(/--lk-[a-z0-9-]+(?=\s*:)/g) ?? []),
].sort();
assert.deepEqual(
  declaredTokenNames,
  registry.tokens.map((token) => token.cssVariable).sort(),
  "CSS token declarations must match the Pencil registry",
);

assert.equal(
  registry.components.length,
  115,
  "Pencil component count must stay at 115",
);
assert.deepEqual(countBy(registry.components, "kind"), { base: 51, state: 64 });
assert.ok(
  unique(registry.components.map((component) => component.id)),
  "duplicate Pencil component id",
);
assert.ok(
  unique(registry.components.map((component) => component.name)),
  "duplicate Pencil component name",
);

for (const component of registry.components) {
  assert.ok(
    registry.owners[component.owner],
    `unknown owner: ${component.owner}`,
  );
}

const allowedCssColors = new Set([
  "#00000000",
  "#00000055",
  "#00000066",
  "#00000088",
  "#00000099",
]);
const allowedGoogleColors = new Set([
  "#36a857",
  "#428af2",
  "#ea4336",
  "#f9bb07",
]);
const sourceEntries = await readdir(sourceRoot, {
  recursive: true,
  withFileTypes: true,
});
const colorFailures = [];

for (const entry of sourceEntries) {
  if (!entry.isFile()) continue;
  const relativePath =
    `${entry.parentPath.slice(new URL(sourceRoot).pathname.length)}/${entry.name}`.replace(
      /^\//,
      "",
    );
  if (
    relativePath === "design-system/tokens.css" ||
    relativePath.includes(".test.") ||
    (!relativePath.endsWith(".css") && !relativePath.endsWith(".tsx"))
  ) {
    continue;
  }

  const source = await readFile(new URL(relativePath, sourceRoot), "utf8");
  const colors =
    source.match(/#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\([^)]*\)/gi) ?? [];
  for (const rawColor of colors) {
    const color = rawColor.toLowerCase();
    const allowed =
      allowedCssColors.has(color) ||
      (relativePath === "features/auth/components/login-page.tsx" &&
        allowedGoogleColors.has(color));
    if (!allowed) colorFailures.push(`${relativePath}: ${rawColor}`);
  }
}

assert.deepEqual(
  colorFailures,
  [],
  "direct colors must be a documented shadow/overlay or Google brand color",
);

console.log(
  `Validated ${registry.tokens.length} tokens, ${registry.components.length} components (${registry.components.filter((component) => component.kind === "base").length} base, ${registry.components.filter((component) => component.kind === "state").length} state), and direct color exceptions.`,
);
