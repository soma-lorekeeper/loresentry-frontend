import { DOCUMENT_TYPE_META, relationKeyOf } from "@/domain/document-types";
import type {
  DocumentContent,
  DocumentDraft,
  DocumentNode,
  DocumentProperty,
  DocumentVersion,
  RelationProperty,
  VersionKind,
} from "@/domain/models";
import { t } from "@/i18n";

import { ServiceError } from "../errors";
import {
  ConflictError,
  type DocumentService,
  type VersionService,
} from "../ports";

import { simulate } from "./control";
import { getDb, isDocumentNode, nextId, persistDb } from "./db";
import { bodyToPlainText, emptyBody } from "@/domain/document-body";
import { bodyToMarkdown } from "@/features/documents/editor/body-markdown";

export const AUTO_VERSION_INTERVAL_MS = 5 * 60_000;
const RECEIPT_LIMIT = 50;

function requireDocument(fileId: string): DocumentNode {
  const node = getDb().files.find((candidate) => candidate.id === fileId);
  if (!node || !isDocumentNode(node)) {
    throw new ServiceError("not-found", t("문서를 찾을 수 없어요."));
  }
  return node;
}

export function readDocument(fileId: string): DocumentContent {
  const node = requireDocument(fileId);
  const stored = getDb().documents[fileId] ?? {
    body: emptyBody(),
    properties: [],
  };
  return {
    fileId,
    projectId: node.projectId,
    title: node.title,
    docType: node.docType,
    body: stored.body,
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
    body: current.body,
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

/**
 * 이 문서가 가리키는 대상들. 같은 문서를 여러 관계 속성으로 가리켜도 연결은 하나이므로 한 번만
 * 담고, 설명이 적힌 쪽을 남긴다. 서버의 `replaceRelations` 와 같은 규칙이다.
 */
function relationTargets(properties: DocumentProperty[]): Map<string, string> {
  const targets = new Map<string, string>();
  for (const property of properties) {
    if (property.kind !== "relation") continue;
    for (const targetId of property.targetIds) {
      if (!targets.get(targetId)) {
        targets.set(targetId, property.descriptions[targetId] ?? "");
      }
    }
  }
  return targets;
}

/**
 * 관계에는 방향이 없다. A 에서 B 를 이으면 B 에서도 A 가 보여야 한다.
 *
 * <p>서버는 한 쌍을 한 행으로 두므로 맞춰 줄 것이 없다. mock 은 문서마다 속성 목록을 따로 들고
 * 있어서 그렇게 할 수 없고, 대신 저장할 때 반대쪽 목록을 함께 고친다. **보이는 결과가 서버와 같아야
 * 한다** — mock 에서만 한쪽에서 안 보이면, 고쳐야 할 것이 없는데도 서버를 의심하게 된다.
 *
 * <p>반대쪽에서 쓰는 키는 **이 문서의 분류**가 정한다. B 에서 A 를 볼 때 A 는 A 의 종류로 보인다.
 */
function mirrorRelations(
  fileId: string,
  before: Map<string, string>,
  after: Map<string, string>,
) {
  const db = getDb();
  const self = requireDocument(fileId);
  const key = relationKeyOf(self.docType);

  for (const targetId of new Set([...before.keys(), ...after.keys()])) {
    const target = db.files.find((file) => file.id === targetId);
    if (!target || !isDocumentNode(target)) continue;

    const stored = (db.documents[targetId] ??= {
      body: emptyBody(),
      properties: [],
    });
    const row = stored.properties.find(
      (property): property is RelationProperty =>
        property.kind === "relation" && property.key === key,
    );
    const description = after.get(targetId);

    if (description === undefined) {
      if (!row) continue;
      row.targetIds = row.targetIds.filter((id) => id !== fileId);
      delete row.descriptions[fileId];
      // 남은 칩이 없으면 빈 줄만 남는다. 사용자가 더하지 않은 줄이므로 지운다.
      if (row.targetIds.length === 0) {
        stored.properties = stored.properties.filter(
          (property) => property !== row,
        );
      }
      continue;
    }

    if (!row) {
      stored.properties.push({
        id: `${targetId}:${key}`,
        kind: "relation",
        key,
        label: DOCUMENT_TYPE_META[self.docType].relationLabel,
        targetType: self.docType,
        targetIds: [fileId],
        descriptions: description ? { [fileId]: description } : {},
      });
      continue;
    }
    if (!row.targetIds.includes(fileId)) row.targetIds.push(fileId);
    // 설명은 대상 문서의 것이 아니라 연결의 것이라 양쪽이 같아야 한다.
    if (description) row.descriptions[fileId] = description;
    else delete row.descriptions[fileId];
  }
}

export function writeDocument(fileId: string, draft: DocumentDraft) {
  const db = getDb();
  const node = requireDocument(fileId);
  const title = draft.title.trim();
  if (title) node.title = title;
  const before = relationTargets(db.documents[fileId]?.properties ?? []);
  db.documents[fileId] = { body: draft.body, properties: draft.properties };
  mirrorRelations(fileId, before, relationTargets(draft.properties));
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
  const kindLabel = t("mock::분류");
  const lines = [
    `# ${content.title}`,
    "",
    `- ${kindLabel}: ${DOCUMENT_TYPE_META[content.docType].label}`,
  ];
  const db = getDb();
  for (const property of content.properties) {
    if (property.kind === "text") {
      lines.push(`- ${property.label}: ${property.value}`);
    } else {
      const titles = property.targetIds
        .map((id) => db.files.find((f) => f.id === id)?.title)
        .filter(Boolean);
      lines.push(`- ${property.label}: ${titles.join(", ")}`);
    }
  }
  lines.push("", bodyToMarkdown(content.body), "");
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
        throw new ServiceError(
          "locked",
          t("mock::잠긴 문서는 편집할 수 없어요."),
        );
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
          : `${content.title}\n\n${bodyToPlainText(content.body)}\n`;
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
          t("잠긴 문서는 새 버전을 저장할 수 없어요."),
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
          t("잠긴 문서는 버전을 복원할 수 없어요."),
        );
      }
      if (node.revisionNo !== ifMatchRevision) {
        throw new ConflictError(readDocument(fileId), null);
      }
      const version = getDb().versions.find((v) => v.id === versionId);
      if (!version)
        throw new ServiceError("not-found", t("버전을 찾을 수 없어요."));
      addVersion(fileId, "PRE_RESTORE");
      writeDocument(fileId, version.snapshot);
      addVersion(fileId, "RESTORE");
      persistDb();
      return readDocument(fileId);
    }),
};
