import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const registryUrl = new URL(
  "../src/design-system/pencil-registry.json",
  import.meta.url,
);
const registry = JSON.parse(await readFile(registryUrl, "utf8"));

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
assert.equal(registry.tokens.length, 33, "Pencil token count must stay at 33");
assert.equal(
  registry.tokens.filter((token) => token.type === "color").length,
  13,
  "Pencil themed color count must stay at 13",
);
assert.equal(
  registry.tokens.filter((token) => token.type === "number").length,
  19,
  "Pencil number token count must stay at 19",
);
assert.equal(
  registry.tokens.filter((token) => token.type === "string").length,
  1,
  "Pencil string token count must stay at 1",
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
    assert.match(token.value.dark, /^#[0-9A-F]{6}$/);
    assert.match(token.value.light, /^#[0-9A-F]{6}$/);
  }
}

assert.equal(
  registry.components.length,
  109,
  "Pencil component count must stay at 109",
);
assert.deepEqual(countBy(registry.components, "kind"), { base: 42, state: 67 });
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

console.log(
  `Validated ${registry.tokens.length} tokens and ${registry.components.length} components (${registry.components.filter((component) => component.kind === "base").length} base, ${registry.components.filter((component) => component.kind === "state").length} state).`,
);
