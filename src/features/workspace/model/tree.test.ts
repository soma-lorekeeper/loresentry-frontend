import { describe, expect, it } from "vitest";

import type { FileNode } from "@/domain/models";

import { ancestorsOf, buildTree, episodeOf, indexNodes } from "./tree";

const folder = (
  id: string,
  parentId: string | null,
  role: "category" | "episode" = "category",
): FileNode => ({
  kind: "folder",
  id,
  projectId: "p",
  parentId,
  title: id,
  role,
  category: "manuscript",
  rank: "1",
  trashedAt: null,
});

const doc = (id: string, parentId: string): FileNode => ({
  kind: "document",
  id,
  projectId: "p",
  parentId,
  title: id,
  docType: "manuscript",
  rank: "1",
  locked: false,
  revisionNo: 1,
  updatedAt: "2026-09-18T00:00:00Z",
  trashedAt: null,
});

const nodes = [
  folder("manuscript", null),
  folder("ep-1", "manuscript", "episode"),
  doc("ch-1", "ep-1"),
];

describe("tree model", () => {
  it("nests nodes by parent while keeping service order", () => {
    const [root] = buildTree(nodes);
    expect(root.node.id).toBe("manuscript");
    expect(root.children[0].children[0]).toMatchObject({
      depth: 2,
      node: { id: "ch-1" },
    });
  });

  it("finds ancestors and the containing episode", () => {
    const index = indexNodes(nodes);
    expect(ancestorsOf(index, "ch-1").map((n) => n.id)).toEqual([
      "manuscript",
      "ep-1",
    ]);
    expect(episodeOf(index, "ch-1")?.id).toBe("ep-1");
  });
});
