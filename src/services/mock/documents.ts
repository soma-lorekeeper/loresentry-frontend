import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type {
  DocumentContent,
  DocumentDraft,
  DocumentNode,
  DocumentVersion,
  VersionKind,
} from "@/domain/models";

import { ServiceError } from "../errors";
import {
  ConflictError,
  type DocumentService,
  type VersionService,
} from "../ports";

import { simulate } from "./control";
import { getDb, isDocumentNode, nextId, persistDb } from "./db";

export const AUTO_VERSION_INTERVAL_MS = 5 * 60_000;
const RECEIPT_LIMIT = 50;

function requireDocument(fileId: string): DocumentNode {
  const node = getDb().files.find((candidate) => candidate.id === fileId);
  if (!node || !isDocumentNode(node)) {
    throw new ServiceError("not-found", "문서를 찾을 수 없어요.");
  }
  return node;
}

export function readDocument(fileId: string): DocumentContent {
  const node = requireDocument(fileId);
  const stored = getDb().documents[fileId] ?? { bodyMd: "", properties: [] };
  return {
    fileId,
    projectId: node.projectId,
    title: node.title,
    docType: node.docType,
    bodyMd: stored.bodyMd,
    properties: stored.properties,
    locked: node.locked,
    revisionNo: node.revisionNo,
    updatedAt: node.updatedAt,
  };
}

function snapshot(fileId: string): DocumentVersion["snapshot"] {
  const current = readDocument(fileId);
  return {
    title: current.title,
    docType: current.docType,
    bodyMd: current.bodyMd,
    properties: current.properties,
  };
}

function addVersion(fileId: string, kind: VersionKind) {
  const version: DocumentVersion = {
    id: nextId("ver"),
    fileId,
    kind,
    label: null,
    createdAt: new Date().toISOString(),
    snapshot: snapshot(fileId),
  };
  getDb().versions.push(version);
  return version;
}

export function writeDocument(fileId: string, draft: DocumentDraft) {
  const db = getDb();
  const node = requireDocument(fileId);
  const title = draft.title.trim();
  if (title) node.title = title;
  db.documents[fileId] = { bodyMd: draft.bodyMd, properties: draft.properties };
  node.revisionNo += 1;
  node.updatedAt = new Date().toISOString();
  const project = db.projects.find((p) => p.id === node.projectId);
  if (project) {
    project.lastWorkedAt = node.updatedAt;
    project.lastFile = { id: node.id, title: node.title };
  }
}

function maybeAutoVersion(fileId: string) {
  const latestAuto = getDb()
    .versions.filter((v) => v.fileId === fileId && v.kind === "AUTO")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const due =
    !latestAuto ||
    Date.now() - new Date(latestAuto.createdAt).getTime() >=
      AUTO_VERSION_INTERVAL_MS;
  if (due) addVersion(fileId, "AUTO");
}

function toMarkdown(content: DocumentContent) {
  const lines = [
    `# ${content.title}`,
    "",
    `- 분류: ${DOCUMENT_TYPE_META[content.docType].label}`,
  ];
  const db = getDb();
  for (const property of content.properties) {
    if (property.kind === "text") {
      lines.push(`- ${property.label}: ${property.value}`);
    } else {
      const titles = property.targetIds
        .map((id) => {
          const title = db.files.find((f) => f.id === id)?.title;
          if (!title) return null;
          const description = property.descriptions?.[id];
          return description ? `${title}(${description})` : title;
        })
        .filter(Boolean);
      lines.push(`- ${property.label}: ${titles.join(", ")}`);
    }
  }
  lines.push("", content.bodyMd, "");
  return lines.join("\n");
}

export const mockDocuments: DocumentService = {
  get: (fileId) => simulate("documents.get", () => readDocument(fileId)),

  save: (fileId, { draft, ifMatchRevision, saveId }) =>
    simulate("documents.save", () => {
      const db = getDb();
      if (db.saveReceipts[saveId] !== undefined) return readDocument(fileId);
      const node = requireDocument(fileId);
      if (node.locked) {
        throw new ServiceError("locked", "잠긴 문서는 편집할 수 없어요.");
      }
      if (node.revisionNo !== ifMatchRevision) {
        throw new ConflictError(readDocument(fileId), null);
      }
      writeDocument(fileId, draft);
      maybeAutoVersion(fileId);
      db.saveReceipts[saveId] = node.revisionNo;
      const receipts = Object.keys(db.saveReceipts);
      for (const stale of receipts.slice(
        0,
        Math.max(0, receipts.length - RECEIPT_LIMIT),
      )) {
        delete db.saveReceipts[stale];
      }
      persistDb();
      return readDocument(fileId);
    }),

  setLocked: (fileId, locked) =>
    simulate("documents.lock", () => {
      requireDocument(fileId).locked = locked;
      persistDb();
      return readDocument(fileId);
    }),

  export: (fileId, format) =>
    simulate("documents.export", () => {
      const content = readDocument(fileId);
      const baseName = content.title.replace(/[\\/:*?"<>|]/g, "_");
      const fileName = `${baseName}.${format}`;
      // 서버 가정: PDF·DOCX·HWP는 서버가 만든다. mock은 텍스트 형식만 실제 파일을 만든다.
      if (format !== "md" && format !== "txt") return { fileName, url: "" };
      const text =
        format === "md"
          ? toMarkdown(content)
          : `${content.title}\n\n${content.bodyMd}\n`;
      const url =
        typeof URL.createObjectURL === "function"
          ? URL.createObjectURL(
              new Blob([text], { type: "text/plain;charset=utf-8" }),
            )
          : "";
      return { fileName, url };
    }),
};

export const mockVersions: VersionService = {
  list: (fileId) =>
    simulate("versions.list", () =>
      getDb()
        .versions.filter((v) => v.fileId === fileId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    ),

  saveNamed: (fileId) =>
    simulate("versions.save", () => {
      if (requireDocument(fileId).locked) {
        throw new ServiceError(
          "locked",
          "잠긴 문서는 새 버전을 저장할 수 없어요.",
        );
      }
      const version = addVersion(fileId, "NAMED");
      persistDb();
      return version;
    }),

  restore: (fileId, versionId, ifMatchRevision) =>
    simulate("versions.restore", () => {
      const node = requireDocument(fileId);
      if (node.locked) {
        throw new ServiceError(
          "locked",
          "잠긴 문서는 버전을 복원할 수 없어요.",
        );
      }
      if (node.revisionNo !== ifMatchRevision) {
        throw new ConflictError(readDocument(fileId), null);
      }
      const version = getDb().versions.find((v) => v.id === versionId);
      if (!version)
        throw new ServiceError("not-found", "버전을 찾을 수 없어요.");
      addVersion(fileId, "PRE_RESTORE");
      writeDocument(fileId, version.snapshot);
      addVersion(fileId, "RESTORE");
      persistDb();
      return readDocument(fileId);
    }),
};
