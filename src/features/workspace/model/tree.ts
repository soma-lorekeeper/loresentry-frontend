import type { DocumentType } from "@/domain/document-types";
import type { DocumentNode, FileNode, FolderNode } from "@/domain/models";

export interface TreeItem {
  node: FileNode;
  depth: number;
  children: TreeItem[];
}

export function buildTree(nodes: readonly FileNode[]): TreeItem[] {
  const byParent = new Map<string | null, FileNode[]>();
  for (const node of nodes) {
    const list = byParent.get(node.parentId) ?? [];
    list.push(node);
    byParent.set(node.parentId, list);
  }
  const build = (parentId: string | null, depth: number): TreeItem[] =>
    (byParent.get(parentId) ?? []).map((node) => ({
      node,
      depth,
      children: build(node.id, depth + 1),
    }));
  return build(null, 0);
}

export function isDocument(node: FileNode | undefined): node is DocumentNode {
  return node?.kind === "document";
}

export function isFolder(node: FileNode | undefined): node is FolderNode {
  return node?.kind === "folder";
}

export function indexNodes(nodes: readonly FileNode[]) {
  return new Map(nodes.map((node) => [node.id, node]));
}

export function ancestorsOf(
  index: Map<string, FileNode>,
  id: string,
): FileNode[] {
  const ancestors: FileNode[] = [];
  let current = index.get(id);
  while (current?.parentId) {
    const parent = index.get(current.parentId);
    if (!parent) break;
    ancestors.unshift(parent);
    current = parent;
  }
  return ancestors;
}

export function episodeOf(
  index: Map<string, FileNode>,
  id: string,
): FolderNode | null {
  return (
    ancestorsOf(index, id).find(
      (node): node is FolderNode =>
        node.kind === "folder" && node.role === "episode",
    ) ?? null
  );
}

export function categoryFolderOf(
  nodes: readonly FileNode[],
  type: DocumentType,
): FolderNode | undefined {
  return nodes.find(
    (node): node is FolderNode =>
      node.kind === "folder" &&
      node.role === "category" &&
      node.category === type,
  );
}

export function documentsOf(nodes: readonly FileNode[]): DocumentNode[] {
  return nodes.filter(isDocument);
}

export function descendantIds(
  index: Map<string, FileNode>,
  id: string,
): string[] {
  const result: string[] = [];
  for (const node of index.values()) {
    if (
      node.id !== id &&
      ancestorsOf(index, node.id).some((a) => a.id === id)
    ) {
      result.push(node.id);
    }
  }
  return result;
}
