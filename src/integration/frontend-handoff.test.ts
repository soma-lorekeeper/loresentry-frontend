import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  PENCIL_SCREEN_COUNT,
  PENCIL_SCREEN_SOURCES,
} from "@/design-system/screen-registry";

import { UNRESOLVED_API_BOUNDARIES } from "./api-boundaries";
import { APP_ROUTES } from "./app-routes";

const handoffPath = "docs/frontend-implementation-handoff.md";
const handoff = readFileSync(join(process.cwd(), handoffPath), "utf8");
const publishedRoutes = [
  APP_ROUTES.serviceEntry,
  APP_ROUTES.login,
  APP_ROUTES.projectList,
  APP_ROUTES.projectGuide,
  APP_ROUTES.projectTrash,
  APP_ROUTES.workspace,
  "/design-system",
] as const;

describe("frontend implementation handoff", () => {
  it("keeps the published route count and mapping aligned with code", () => {
    expect(new Set(publishedRoutes).size).toBe(7);
    expect(handoff).toContain(`게시 경로: ${publishedRoutes.length}개`);
    for (const route of publishedRoutes)
      expect(handoff).toContain(`\`${route}`);
  });

  it("keeps the Pencil screen count and source links aligned with code", () => {
    expect(handoff).toContain(`화면 상태: ${PENCIL_SCREEN_COUNT}개`);
    for (const source of PENCIL_SCREEN_SOURCES) {
      expect(handoff).toContain(`\`${source}\``);
      expect(existsSync(join(process.cwd(), source))).toBe(true);
    }
  });

  it("keeps every unresolved backend boundary explicit without guessing HTTP details", () => {
    expect(handoff).toContain(
      `백엔드 연결 경계: ${UNRESOLVED_API_BOUNDARIES.length}개`,
    );
    for (const boundary of UNRESOLVED_API_BOUNDARIES) {
      expect(handoff).toContain(`\`${boundary.id}\``);
      expect(handoff).toContain(`\`${boundary.frontendPort}\``);
    }
    expect(
      UNRESOLVED_API_BOUNDARIES.every(
        (boundary) => !("endpoint" in boundary) && !("method" in boundary),
      ),
    ).toBe(true);
  });

  it("links the current component and token implementation standards", () => {
    for (const [target, documentReference] of [
      [
        "docs/design/frontend-component-map.md",
        "./design/frontend-component-map.md",
      ],
      ["docs/design/component-library.md", "./design/component-library.md"],
      [
        "src/design-system/pencil-registry.json",
        "src/design-system/pencil-registry.json",
      ],
      ["src/design-system/tokens.css", "src/design-system/tokens.css"],
      ["public/config.json", "public/config.json"],
    ] as const) {
      expect(handoff).toContain(documentReference);
      expect(existsSync(join(process.cwd(), target))).toBe(true);
    }
    expect(handoff).toContain("33개 토큰");
    expect(handoff).toContain("109개 컴포넌트");
  });
});
