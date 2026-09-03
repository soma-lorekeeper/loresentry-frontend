import { describe, expect, it } from "vitest";

import {
  projectFixtureIds,
  projectFixtures,
} from "@/features/projects/project-model";

import { workspaceMockFixtures } from "./workspace-fixtures";

describe("workspaceMockFixtures", () => {
  it("defines one typed workspace fixture for every project fixture", () => {
    expect(Object.keys(workspaceMockFixtures)).toEqual(projectFixtureIds);
    expect(projectFixtures.map((project) => project.id)).toEqual(
      projectFixtureIds,
    );

    for (const projectId of projectFixtureIds) {
      expect(workspaceMockFixtures[projectId].project.id).toBe(projectId);
    }
  });

  it.each(projectFixtureIds)(
    "keeps the %s file tree, documents, and initial tabs internally consistent",
    (projectId) => {
      const fixture = workspaceMockFixtures[projectId];
      const itemIds = fixture.fileItems.map((item) => item.id);
      const contentIds = fixture.fileItems.flatMap((item) =>
        "contentId" in item ? [item.contentId] : [],
      );
      const documentIds = fixture.initialDocuments.map(
        (document) => document.id,
      );

      expect(fixture.project.name).not.toHaveLength(0);
      expect(fixture.fileItems.length).toBeGreaterThan(0);
      expect(fixture.initialDocuments.length).toBeGreaterThan(0);
      expect(fixture.initialTabs.length).toBeGreaterThan(0);
      expect(itemIds).toContain(fixture.selectedItemId);
      expect(fixture.favoriteItemIds.every((id) => itemIds.includes(id))).toBe(
        true,
      );
      expect(documentIds.every((id) => contentIds.includes(id))).toBe(true);
      expect(
        fixture.initialTabs.every((tab) => documentIds.includes(tab.id)),
      ).toBe(true);
    },
  );

  it("keeps project fixtures distinct", () => {
    const fixtures = Object.values(workspaceMockFixtures);

    expect(new Set(fixtures.map((fixture) => fixture.project.name)).size).toBe(
      fixtures.length,
    );
    expect(
      new Set(fixtures.map((fixture) => fixture.initialDocuments[0].body)).size,
    ).toBe(fixtures.length);
  });
});
