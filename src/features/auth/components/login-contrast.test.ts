import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const tokenCss = readFileSync("src/design-system/tokens.css", "utf8");

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const channels = hex
    .slice(1)
    .match(/.{2}/g)
    ?.map((part) => channel(Number.parseInt(part, 16)));
  if (!channels || channels.length !== 3)
    throw new Error(`Invalid color ${hex}`);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(foreground: string, background: string) {
  const values = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function themeTokens(selector: string) {
  const body = tokenCss.match(
    new RegExp(`${selector}\\s*\\{([\\s\\S]*?)\\n\\}`),
  )?.[1];
  if (!body) throw new Error(`Missing token scope ${selector}`);
  return Object.fromEntries(
    Array.from(body.matchAll(/--lk-color-([\w-]+):\s*(#[0-9a-fA-F]{6})/g)).map(
      ([, name, value]) => [name, value],
    ),
  );
}

describe("login token contrast", () => {
  it.each([
    [':root\\[data-theme="dark"\\]', "dark"],
    [':root\\[data-theme="light"\\]', "light"],
  ])("keeps text, action, and focus colors accessible in %s", (selector) => {
    const tokens = themeTokens(selector);
    expect(
      contrast(tokens["text-primary"], tokens["surface-default"]),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(tokens["text-secondary"], tokens["surface-default"]),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(tokens["accent-primary"], tokens["surface-default"]),
    ).toBeGreaterThanOrEqual(3);
  });
});
