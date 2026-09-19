import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { DocumentNode, FileNode, FolderNode } from "@/domain/models";

import { ServiceError } from "../errors";
import type { FileService } from "../ports";

import { simulate } from "./control";
import { getDb, nextId, persistDb } from "./db";
import {
  activeFiles,
  descendantsOf,
  nextRank,
  orderedTree,
  pathOf,
} from "./tree";

export const FILE_TITLE_MAX = 100;

function requireNode(fileId: string) {
  const node = getDb().files.find((candidate) => candidate.id === fileId);
  if (!node) throw new ServiceError("not-found", "파일을 찾을 수 없어요.");
  return node;
}

function validateTitle(title: string) {
  const trimmed = title.trim();
  if (!trimmed) throw new ServiceError("validation", "이름을 입력해 주세요.");
  if (trimmed.length > FILE_TITLE_MAX) {
    throw new ServiceError(
      "validation",
      `이름은 ${FILE_TITLE_MAX}자 이하로 입력해 주세요.`,
    );
  }
  return trimmed;
}

function assertEditable(node: FileNode) {
  if (node.kind === "folder" && node.role === "category") {
    throw new ServiceError("validation", "기본 분류 폴더는 바꿀 수 없어요.");
  }
}

function categoryOf(node: FileNode | undefined): FolderNode | null {
  const db = getDb();
  let current = node;
  while (current) {
    if (current.kind === "folder" && current.role === "category")
      return current;
    current = db.files.find((candidate) => candidate.id === current?.parentId);
  }
  return null;
}

function touchProject(projectId: string, file?: DocumentNode) {
  const project = getDb().projects.find((p) => p.id === projectId);
  if (!project) return;
  project.lastWorkedAt = new Date().toISOString();
  if (file) project.lastFile = { id: file.id, title: file.title };
}

export const mockFiles: FileService = {
  tree: (projectId) =>
    simulate("files.tree", () => orderedTree(activeFiles(getDb(), projectId))),

  create: ({ projectId, parentId, kind, title, docType }) =>
    simulate("files.create", () => {
      const db = getDb();
      const parent = parentId ? requireNode(parentId) : null;
      if (parent && parent.kind !== "folder") {
        throw new ServiceError("validation", "폴더 안에만 만들 수 있어요.");
      }
      const category = parent ? categoryOf(parent) : null;
      const now = new Date().toISOString();
      if (kind === "folder") {
        if (parent?.role === "episode") {
          throw new ServiceError(
            "validation",
            "에피소드 안에는 폴더를 만들 수 없어요.",
          );
        }
        if (parent?.role === "category" && parent.category !== "manuscript") {
          throw new ServiceError(
            "validation",
            "에피소드 폴더는 원고 아래에만 만들 수 있어요.",
          );
        }
        const role = parent?.role === "category" ? "episode" : "folder";
        const folder: FolderNode = {
          kind: "folder",
          id: nextId("folder"),
          projectId,
          parentId,
          title: validateTitle(title),
          role,
          category: role === "episode" ? "manuscript" : null,
          rank: nextRank(db, parentId, projectId),
          trashedAt: null,
        };
        db.files.push(folder);
        persistDb();
        return folder;
      }
      if (!parent) {
        throw new ServiceError("validation", "문서는 폴더 안에 만들어 주세요.");
      }
      const type = docType ?? category?.category ?? "manuscript";
      if (parent.role === "episode" && type !== "manuscript") {
        throw new ServiceError(
          "validation",
          "에피소드에는 원고만 둘 수 있어요.",
        );
      }
      const document: DocumentNode = {
        kind: "document",
        id: nextId("doc"),
        projectId,
        parentId,
        title: validateTitle(title),
        docType: type,
        rank: nextRank(db, parentId, projectId),
        locked: false,
        revisionNo: 1,
        updatedAt: now,
        trashedAt: null,
      };
      db.files.push(document);
      db.documents[document.id] = {
        bodyMd: "",
        properties: [
          {
            id: `${document.id}:description`,
            kind: "text",
            key: "description",
            label: "설명",
            value: "",
          },
        ],
      };
      touchProject(projectId, document);
      persistDb();
      return document;
    }),

  rename: (fileId, title) =>
    simulate("files.rename", () => {
      const node = requireNode(fileId);
      assertEditable(node);
      node.title = validateTitle(title);
      if (node.kind === "document") {
        node.revisionNo += 1;
        node.updatedAt = new Date().toISOString();
      }
      persistDb();
      return node;
    }),

  move: (fileId, parentId, beforeId) =>
    simulate("files.move", () => {
      const db = getDb();
      const node = requireNode(fileId);
      assertEditable(node);
      const parent = requireNode(parentId);
      if (parent.kind !== "folder") {
        throw new ServiceError("validation", "폴더 안으로만 옮길 수 있어요.");
      }
      if (
        node.kind === "folder" &&
        (parent.role === "episode" || parent.role === "category")
      ) {
        throw new ServiceError(
          "validation",
          "이 폴더 안에는 폴더를 옮길 수 없어요.",
        );
      }
      if (
        parent.role === "episode" &&
        node.kind === "document" &&
        node.docType !== "manuscript"
      ) {
        throw new ServiceError(
          "validation",
          "에피소드에는 원고만 둘 수 있어요.",
        );
      }
      if (
        descendantsOf(db, fileId).some((child) => child.id === parentId) ||
        parentId === fileId
      ) {
        throw new ServiceError(
          "validation",
          "폴더를 자기 안으로 옮길 수 없어요.",
        );
      }
      const siblings = db.files
        .filter(
          (f) => f.parentId === parentId && f.id !== fileId && !f.trashedAt,
        )
        .sort((a, b) => Number(a.rank) - Number(b.rank));
      const beforeIndex = beforeId
        ? siblings.findIndex((f) => f.id === beforeId)
        : siblings.length;
      const prev = siblings[beforeIndex - 1];
      const next = siblings[beforeIndex];
      const low = prev ? Number(prev.rank) : 0;
      const high = next ? Number(next.rank) : low + 2048;
      node.parentId = parentId;
      node.rank = String((low + high) / 2);
      if (
        node.kind === "document" &&
        parent.role === "category" &&
        parent.category
      ) {
        node.docType = parent.category;
      }
      persistDb();
      return node;
    }),

  moveToTrash: (fileId) =>
    simulate("files.trash", () => {
      const node = requireNode(fileId);
      assertEditable(node);
      node.trashedAt = new Date().toISOString();
      const db = getDb();
      for (const [projectId, ids] of Object.entries(db.favorites)) {
        if (node.projectId === projectId) {
          const hidden = new Set([
            fileId,
            ...descendantsOf(db, fileId).map((d) => d.id),
          ]);
          db.favorites[projectId] = ids.filter((id) => !hidden.has(id));
        }
      }
      persistDb();
    }),

  listTrash: (projectId) =>
    simulate("files.listTrash", () => {
      const db = getDb();
      return db.files
        .filter((node) => node.projectId === projectId && node.trashedAt)
        .sort((a, b) => (b.trashedAt ?? "").localeCompare(a.trashedAt ?? ""))
        .map((node) => ({
          node,
          originalPath: pathOf(db, node),
          childCount: descendantsOf(db, node.id).length,
        }));
    }),

  restore: (fileId) =>
    simulate("files.restore", () => {
      const db = getDb();
      const node = requireNode(fileId);
      node.trashedAt = null;
      const parent = db.files.find(
        (candidate) => candidate.id === node.parentId,
      );
      const parentGone =
        node.parentId !== null && (!parent || parent.trashedAt);
      if (parentGone) {
        const category =
          node.kind === "document"
            ? db.files.find(
                (f) =>
                  f.projectId === node.projectId &&
                  f.kind === "folder" &&
                  f.role === "category" &&
                  f.category === node.docType,
              )
            : undefined;
        node.parentId = category?.id ?? null;
        node.rank = nextRank(db, node.parentId, node.projectId);
      }
      persistDb();
      return node;
    }),

  deletePermanently: (fileId) =>
    simulate("files.delete", () => {
      const db = getDb();
      const removed = new Set([
        fileId,
        ...descendantsOf(db, fileId).map((d) => d.id),
      ]);
      db.files = db.files.filter((node) => !removed.has(node.id));
      for (const id of removed) delete db.documents[id];
      db.memos = db.memos.filter(
        (memo) => !memo.fileId || !removed.has(memo.fileId),
      );
      persistDb();
    }),

  favorites: (projectId) =>
    simulate("files.favorites", () => getDb().favorites[projectId] ?? []),

  setFavorite: (projectId, fileId, favorite) =>
    simulate("files.setFavorite", () => {
      const db = getDb();
      const current = db.favorites[projectId] ?? [];
      db.favorites[projectId] = favorite
        ? current.includes(fileId)
          ? current
          : [...current, fileId]
        : current.filter((id) => id !== fileId);
      persistDb();
      return db.favorites[projectId];
    }),

  createSection: (projectId, title) =>
    simulate("files.createSection", () => {
      const db = getDb();
      const section: FolderNode = {
        kind: "folder",
        id: nextId("section"),
        projectId,
        parentId: null,
        title: validateTitle(title),
        role: "section",
        category: null,
        rank: nextRank(db, null, projectId),
        trashedAt: null,
      };
      db.files.push(section);
      persistDb();
      return section;
    }),

  deleteSection: (sectionId) =>
    simulate("files.deleteSection", () => {
      const node = requireNode(sectionId);
      if (node.kind !== "folder" || node.role !== "section") {
        throw new ServiceError("validation", "사용자 섹션만 삭제할 수 있어요.");
      }
      node.role = "folder";
      persistDb();
      return node;
    }),

  deleteEpisode: (episodeId) =>
    simulate("files.deleteEpisode", () => {
      const db = getDb();
      const node = requireNode(episodeId);
      if (node.kind !== "folder" || node.role !== "episode") {
        throw new ServiceError(
          "validation",
          "에피소드 폴더만 삭제할 수 있어요.",
        );
      }
      const children = db.files
        .filter((f) => f.parentId === episodeId)
        .sort((a, b) => Number(a.rank) - Number(b.rank));
      for (const child of children) {
        child.parentId = node.parentId;
        child.rank = nextRank(db, node.parentId, node.projectId);
      }
      db.files = db.files.filter((f) => f.id !== episodeId);
      persistDb();
    }),
};

export function typeLabelOf(node: FileNode) {
  return node.kind === "document"
    ? DOCUMENT_TYPE_META[node.docType].label
    : "폴더";
}
