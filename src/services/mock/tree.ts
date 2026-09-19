import type { FileNode } from "@/domain/models";

import type { MockDb } from "./db";

export function byRank(a: FileNode, b: FileNode) {
  return Number(a.rank) - Number(b.rank);
}

export function activeFiles(db: MockDb, projectId: string) {
  const trashed = new Set(
    db.files
      .filter((node) => node.projectId === projectId && node.trashedAt)
      .map((node) => node.id),
  );
  const isHidden = (node: FileNode): boolean => {
    if (trashed.has(node.id)) return true;
    if (!node.parentId) return false;
    const parent = db.files.find((candidate) => candidate.id === node.parentId);
    return parent ? isHidden(parent) : false;
  };
  return db.files.filter(
    (node) => node.projectId === projectId && !isHidden(node),
  );
}

export function orderedTree(nodes: FileNode[]) {
  const children = new Map<string | null, FileNode[]>();
  for (const node of nodes) {
    const list = children.get(node.parentId) ?? [];
    list.push(node);
    children.set(node.parentId, list);
  }
  const ordered: FileNode[] = [];
  const visit = (parentId: string | null) => {
    for (const node of (children.get(parentId) ?? []).sort(byRank)) {
      ordered.push(node);
      visit(node.id);
    }
  };
  visit(null);
  return ordered;
}

export function pathOf(db: MockDb, node: FileNode): string[] {
  const path: string[] = [];
  let parentId = node.parentId;
  while (parentId) {
    const parent = db.files.find((candidate) => candidate.id === parentId);
    if (!parent) break;
    path.unshift(parent.title);
    parentId = parent.parentId;
  }
  return ["파일", ...path];
}

export function descendantsOf(db: MockDb, id: string): FileNode[] {
  const direct = db.files.filter((node) => node.parentId === id);
  return direct.flatMap((node) => [node, ...descendantsOf(db, node.id)]);
}

export function nextRank(
  db: MockDb,
  parentId: string | null,
  projectId: string,
) {
  const siblings = db.files.filter(
    (node) => node.parentId === parentId && node.projectId === projectId,
  );
  const max = siblings.reduce((m, node) => Math.max(m, Number(node.rank)), 0);
  return String(max + 1024);
}
