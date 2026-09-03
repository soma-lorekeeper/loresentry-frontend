import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { ACCOUNT_GLOBAL_SCREEN_STATES } from "@/features/account/account-global-states";
import { LOGIN_SCREEN_STATES } from "@/features/auth/auth-states";
import { HELP_SCREEN_STATES } from "@/features/help/help-states";
import { PROJECT_LIST_SCREEN_STATES } from "@/features/projects/project-list-states";
import { PROJECT_TRASH_SCREEN_STATES } from "@/features/projects/project-trash-states";
import { PROPERTY_DOCUMENT_SCREEN_STATES } from "@/features/property/property-document-states";
import { SETTINGS_SCREEN_STATES } from "@/features/settings/settings-states";
import { TIMELINE_SCREEN_STATES } from "@/features/timeline/timeline-states";

import pencilScreenCatalog from "./pencil-screen-catalog.json";
import {
  PENCIL_SCREEN_COUNT,
  SCREEN_IMPLEMENTATION_REGISTRY,
} from "./screen-registry";

const runtimeStateRegistries = [
  ...PROPERTY_DOCUMENT_SCREEN_STATES,
  ...TIMELINE_SCREEN_STATES,
  ...SETTINGS_SCREEN_STATES,
  ...HELP_SCREEN_STATES,
  ...PROJECT_LIST_SCREEN_STATES,
  ...PROJECT_TRASH_SCREEN_STATES,
  ...ACCOUNT_GLOBAL_SCREEN_STATES,
  ...LOGIN_SCREEN_STATES,
];

const routePages: Record<string, string> = {
  "/login": "src/app/login/page.tsx",
  "/projects": "src/app/projects/page.tsx",
  "/projects/guide": "src/app/projects/guide/page.tsx",
  "/projects/trash": "src/app/projects/trash/page.tsx",
  "/workspace": "src/app/workspace/page.tsx",
};

describe("Pencil screen implementation registry", () => {
  it("maps all 136 top-level Pencil screens with no missing historic numbers", () => {
    const expectedNumbers = Array.from(
      { length: 137 },
      (_, index) => index + 8,
    ).filter((screenNumber) => screenNumber !== 20);

    expect(PENCIL_SCREEN_COUNT).toBe(136);
    expect(
      SCREEN_IMPLEMENTATION_REGISTRY.map(({ screenNumber }) => screenNumber),
    ).toEqual(expectedNumbers);
  });

  it("matches the checked-in Pencil catalog without ID or name drift", () => {
    expect(
      SCREEN_IMPLEMENTATION_REGISTRY.map(
        ({ name, pencilNodeId, screenNumber }) => ({
          name,
          pencilNodeId,
          screenNumber,
        }),
      ),
    ).toEqual(pencilScreenCatalog.screens);
  });

  it.each(["screenNumber", "pencilNodeId", "stateId"] as const)(
    "has no duplicate %s mapping",
    (field) => {
      const values = SCREEN_IMPLEMENTATION_REGISTRY.map(
        (screen) => screen[field],
      );
      expect(new Set(values).size).toBe(values.length);
    },
  );

  it("preserves every existing feature-state mapping", () => {
    for (const state of runtimeStateRegistries) {
      expect(
        SCREEN_IMPLEMENTATION_REGISTRY.find(
          ({ screenNumber }) => screenNumber === state.screenNumber,
        ),
      ).toMatchObject({
        pencilNodeId: state.pencilNodeId,
        screenNumber: state.screenNumber,
        stateId: state.id,
      });
    }
  });

  it("uses only implemented routes and shared feature components", () => {
    const pathnames = new Set(
      SCREEN_IMPLEMENTATION_REGISTRY.map(
        ({ route }) => new URL(route, "https://lorekeeper.local").pathname,
      ),
    );

    expect([...pathnames].sort()).toEqual(Object.keys(routePages).sort());
    for (const pathname of pathnames) {
      expect(existsSync(join(process.cwd(), routePages[pathname]))).toBe(true);
    }
    expect(pathnames.size).toBeLessThan(SCREEN_IMPLEMENTATION_REGISTRY.length);
    expect(
      SCREEN_IMPLEMENTATION_REGISTRY.every(
        ({ featureComponent, owner }) =>
          featureComponent.startsWith(`${owner}/`) && owner.length > 0,
      ),
    ).toBe(true);
  });
});
