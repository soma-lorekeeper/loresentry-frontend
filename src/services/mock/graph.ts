import type {
  Episode,
  GraphEdge,
  GraphNode,
  ProjectGraph,
} from "@/domain/models";

import type { GraphService, WorkspaceStateService } from "../ports";

import { simulate } from "./control";
import { getDb, isDocumentNode, persistDb, type MockDb } from "./db";
import { activeFiles, orderedTree } from "./tree";

export function buildProjectGraph(db: MockDb, projectId: string): ProjectGraph {
  const files = orderedTree(activeFiles(db, projectId));
  const documents = files.filter(isDocumentNode);
  const active = new Set(documents.map((d) => d.id));
  const nodes: GraphNode[] = documents.map((doc) => {
    const description = db.documents[doc.id]?.properties.find(
      (p) => p.kind === "text" && p.key === "description",
    );
    return {
      id: doc.id,
      title: doc.title,
      docType: doc.docType,
      description: description?.kind === "text" ? description.value : "",
      imageUrl: doc.imageUrl ?? null,
    };
  });
  // 관계는 양쪽 문서에 한 행씩 저장되지만 엣지는 **한 쌍에 하나**다(GraphEdge 주석). 서버가
  // 그렇게 주므로 mock 도 맞춘다 — 둘을 다 내보내면 같은 자리에 선이 겹쳐 그려진다.
  const byPair = new Map<string, GraphEdge>();
  for (const doc of documents) {
    for (const property of db.documents[doc.id]?.properties ?? []) {
      if (property.kind !== "relation") continue;
      for (const target of property.targetIds) {
        if (!active.has(target)) continue;
        const pair = [doc.id, target].sort().join("|");
        const description = property.descriptions[target] ?? "";
        const seen = byPair.get(pair);
        if (seen) {
          // 한쪽에만 설명이 적혀 있으면 그것을 쓴다.
          if (!seen.description) seen.description = description;
          continue;
        }
        byPair.set(pair, {
          id: `${doc.id}->${target}`,
          source: doc.id,
          target,
          key: property.key,
          description,
          origin: "USER",
        });
      }
    }
  }
  const edges = [...byPair.values()];
  const episodes: Episode[] = files
    .filter((f) => f.kind === "folder" && f.role === "episode")
    .map((folder) => ({
      id: folder.id,
      title: folder.title,
      chapterIds: documents
        .filter((d) => d.parentId === folder.id && d.docType === "manuscript")
        .map((d) => d.id),
    }));
  return { nodes, edges, episodes };
}

export const mockGraph: GraphService = {
  getProjectGraph: (projectId) =>
    simulate("graph.get", () => buildProjectGraph(getDb(), projectId)),
};

export const mockWorkspaceState: WorkspaceStateService = {
  load: (projectId) =>
    simulate(
      "workspace.load",
      () => getDb().workspaceStates[projectId] ?? null,
      {
        latencyMs: 80,
      },
    ),
  save: (projectId, layout) =>
    simulate(
      "workspace.save",
      () => {
        getDb().workspaceStates[projectId] = layout;
        persistDb();
      },
      { latencyMs: 0 },
    ),
};
