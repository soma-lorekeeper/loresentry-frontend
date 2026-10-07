import { beforeEach, describe, expect, it, vi } from "vitest";

import { DOCUMENT_TYPE_META, DOCUMENT_TYPES } from "@/domain/document-types";
import { LOCALE } from "@/i18n";

import { isServiceError } from "../errors";

import { clearMockRules, setMockLatency } from "./control";
import { buildSeedDb, GLASS_GARDEN_ID, getDb, resetDb } from "./db";
import { createMockServices } from "./index";
import { EN_SEED } from "./seed-world.en";
import { SEEDS } from "./seed-world";

const HANGUL = /[가-힣]/;
const NOW = Date.parse("2026-10-07T03:00:00Z");
const TEXT_FIELDS = new Set([
  "title",
  "description",
  "body",
  "text",
  "value",
  "content",
  "label",
  "displayName",
]);

const domainLabels = DOCUMENT_TYPES.flatMap((type) => [
  DOCUMENT_TYPE_META[type].label,
  DOCUMENT_TYPE_META[type].relationLabel,
]);

function hangulOutsideDomainLabels(value: unknown) {
  const found: string[] = [];
  const visit = (node: unknown) => {
    if (typeof node === "string") {
      if (HANGUL.test(node) && !domainLabels.includes(node)) found.push(node);
    } else if (Array.isArray(node)) {
      node.forEach(visit);
    } else if (node && typeof node === "object") {
      Object.values(node).forEach(visit);
    }
  };
  visit(value);
  return found;
}

function differencesOutsideText(a: unknown, b: unknown, path = "$"): string[] {
  if (typeof a !== typeof b) return [`${path}: ${typeof a} vs ${typeof b}`];
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return [`${path}: ${a.length} vs ${b.length}`];
    return a.flatMap((item, i) =>
      differencesOutsideText(item, b[i], `${path}[${i}]`),
    );
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a).sort();
    const keysB = Object.keys(b).sort();
    if (keysA.join() !== keysB.join())
      return [`${path}: {${keysA.join()}} vs {${keysB.join()}}`];
    return keysA.flatMap((key) => {
      const left = (a as Record<string, unknown>)[key];
      const right = (b as Record<string, unknown>)[key];
      if (typeof left === "string" && TEXT_FIELDS.has(key)) return [];
      return differencesOutsideText(left, right, `${path}.${key}`);
    });
  }
  return a === b ? [] : [`${path}: ${String(a)} vs ${String(b)}`];
}

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

const services = createMockServices();

beforeEach(() => {
  resetDb();
  clearMockRules();
  setMockLatency(0);
});

describe("English mock seed", () => {
  it("is built for English", () => {
    expect(LOCALE).toBe("en");
  });

  it("has no Hangul in the English story data", () => {
    expect(hangulOutsideDomainLabels(EN_SEED)).toEqual([]);
    expect(JSON.stringify(EN_SEED)).not.toMatch(HANGUL);
  });

  it("builds a database without Korean text", () => {
    expect(hangulOutsideDomainLabels(buildSeedDb(NOW))).toEqual([]);
  });

  it("keeps the same ids, structure and relations as the Korean seed", () => {
    const korean = buildSeedDb(NOW, SEEDS.ko);
    const english = buildSeedDb(NOW, SEEDS.en);
    expect(differencesOutsideText(korean, english)).toEqual([]);
  });

  it("names the sample world and the account in English", async () => {
    const projects = await services.projects.list();
    expect(projects[0]).toMatchObject({
      id: GLASS_GARDEN_ID,
      title: "The Glass Garden Records",
      lastFile: { title: "Ch. 12 · Night of the Fracture" },
    });
    const account = await services.account.getAccount();
    expect(account).toMatchObject({
      displayName: "Yunju Seo",
      email: "seoyunju@lore.kr",
    });
  });
});

describe("English mock services", () => {
  it("creates the sample project in English and de-duplicates its name", async () => {
    const first = await services.projects.createSample();
    const second = await services.projects.createSample();
    expect(first.title).toBe("The Glass Garden Records (2)");
    expect(second.title).toBe("The Glass Garden Records (3)");
    const tree = await services.files.tree(first.id);
    expect(tree.map((node) => node.title)).toContain(
      "Episode 1. Season of Glass",
    );
    expect(hangulOutsideDomainLabels(tree)).toEqual([]);
  });

  it("explains failures in English", async () => {
    const duplicate = await rejection(
      services.projects.create({
        title: " the glass garden records ",
        description: "",
      }),
    );
    expect(isServiceError(duplicate) && duplicate.message).toBe(
      "A project with this name already exists.",
    );
    const blank = await rejection(
      services.files.rename(`${GLASS_GARDEN_ID}:c-lena`, " "),
    );
    expect(isServiceError(blank) && blank.message).toBe("Enter a name.");
    const tooLong = await rejection(
      services.account.updateDisplayName("x".repeat(40)),
    );
    expect(isServiceError(tooLong) && tooLong.message).toBe(
      "Enter a display name between 1 and 20 characters.",
    );
  });

  it("shows English terms and trash paths", async () => {
    const terms = await services.auth.getTerms();
    expect(terms.title).toBe("Lore Sentry Terms of Service");
    expect(`${terms.title}${terms.content}`).not.toMatch(HANGUL);
    const trash = await services.files.listTrash(GLASS_GARDEN_ID);
    expect(trash.map((entry) => entry.node.title)).toContain("Old Prologue");
    expect(trash.every((entry) => entry.originalPath[0] === "Files")).toBe(
      true,
    );
  });

  it("proposes English graph refresh changes", async () => {
    await services.refresh.start(GLASS_GARDEN_ID);
    (
      getDb().refreshRuns[GLASS_GARDEN_ID] as unknown as { readyAt: number }
    ).readyAt = 0;
    const ready = await services.refresh.current(GLASS_GARDEN_ID);
    expect(ready.proposals.map((p) => p.title)).toEqual([
      "Harin",
      "The Ashen Lighthouse",
      "Lost Route",
      "Seoyun",
    ]);
    expect(hangulOutsideDomainLabels(ready.proposals)).toEqual([]);
  });
});

describe("English mock storage", () => {
  it("does not reuse a Korean database saved in the same browser", async () => {
    window.localStorage.clear();
    window.localStorage.setItem(
      "loresentry.mock.db",
      JSON.stringify({ ...buildSeedDb(NOW, SEEDS.ko), signedIn: true }),
    );
    vi.resetModules();
    const fresh = await import("./db");
    const db = fresh.getDb();
    expect(db.projects[0].title).toBe("The Glass Garden Records");
    expect(db.signedIn).toBe(false);
  });

  it("saves under its own key", async () => {
    vi.useFakeTimers();
    try {
      window.localStorage.clear();
      resetDb();
      vi.runAllTimers();
      expect(window.localStorage.getItem("loresentry.mock.db")).toBeNull();
      expect(window.localStorage.getItem("loresentry.mock.db.en")).toContain(
        "The Glass Garden Records",
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
