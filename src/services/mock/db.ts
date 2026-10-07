import {
  DOCUMENT_TYPE_META,
  DOCUMENT_TYPES,
  relationKeyOf,
  type DocumentType,
  type SettingDocumentType,
} from "@/domain/document-types";
import type {
  ChatMessage,
  ChatSession,
  DocumentNode,
  DocumentProperty,
  DocumentVersion,
  FileNode,
  FolderNode,
  Memo,
  Project,
  RefreshRun,
  User,
} from "@/domain/models";
import type { WorkspaceLayout } from "@/features/workspace/model/layout";

import {
  bodyFromParagraphs,
  bodyFromPlainText,
  bodyToPlainText,
  emptyBody,
  type DocumentBody,
} from "@/domain/document-body";

import { LOCALE, t } from "@/i18n";

import { SEED } from "./seed-world";
import type { MockSeed, SeedOtherProject } from "./seed-types";

export const MOCK_DB_VERSION = 10;
const STORAGE_KEY =
  LOCALE === "ko" ? "loresentry.mock.db" : `loresentry.mock.db.${LOCALE}`;

export interface StoredDocument {
  body: DocumentBody;
  properties: DocumentProperty[];
}

export interface MockDb {
  version: number;
  user: User;
  signedIn: boolean;
  projects: Project[];
  files: FileNode[];
  documents: Record<string, StoredDocument>;
  favorites: Record<string, string[]>;
  memos: Memo[];
  versions: DocumentVersion[];
  chatSessions: ChatSession[];
  chatMessages: ChatMessage[];
  workspaceStates: Record<string, WorkspaceLayout>;
  refreshRuns: Record<string, RefreshRun>;
  saveReceipts: Record<string, number>;
  sequence: number;
}

export const GLASS_GARDEN_ID = "glass-garden";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const minutes = (now: number, n: number) =>
  new Date(now - n * 60_000).toISOString();

function pickSome<T>(
  rand: () => number,
  items: readonly T[],
  min: number,
  max: number,
) {
  const count = min + Math.floor(rand() * (max - min + 1));
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    picked.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  }
  return picked;
}

function descriptionProperty(fileId: string, value: string): DocumentProperty {
  return {
    id: `${fileId}:description`,
    kind: "text",
    key: "description",
    label: t("mock::설명"),
    value,
  };
}

function relationProperty(
  fileId: string,
  targetType: DocumentType,
  targetIds: string[],
): DocumentProperty {
  return {
    id: `${fileId}:${relationKeyOf(targetType)}`,
    kind: "relation",
    key: relationKeyOf(targetType),
    label: DOCUMENT_TYPE_META[targetType].relationLabel,
    targetType,
    targetIds,
    descriptions: {},
  };
}

function categoryFolders(projectId: string): FolderNode[] {
  return DOCUMENT_TYPES.map((type, index) => ({
    kind: "folder",
    id: `${projectId}:folder:${type}`,
    projectId,
    parentId: null,
    title: DOCUMENT_TYPE_META[type].label,
    role: "category",
    category: type,
    rank: String((index + 1) * 1024),
    trashedAt: null,
  }));
}

function buildGlassGarden(
  now: number,
  db: MockDb,
  seed: MockSeed,
  projectId = GLASS_GARDEN_ID,
) {
  const rand = mulberry32(20260918);
  const folders = categoryFolders(projectId);
  db.files.push(...folders);
  const folderOf = (type: DocumentType) =>
    folders.find((folder) => folder.category === type)!.id;

  const docId = (key: string) => `${projectId}:${key}`;
  const docTypeByKey = new Map<string, DocumentType>();
  const descriptions = new Map<string, string>();
  const bodies = new Map<string, string>();
  const relations = new Map<string, Map<DocumentType, Set<string>>>();

  const relate = (from: string, to: string) => {
    if (from === to) return;
    const type = docTypeByKey.get(to)!;
    const byType = relations.get(from) ?? new Map<DocumentType, Set<string>>();
    const targets = byType.get(type) ?? new Set<string>();
    targets.add(docId(to));
    byType.set(type, targets);
    relations.set(from, byType);
  };

  let minuteOffset = 18;
  const chapterKeys: string[] = [];
  seed.episodes.forEach((episode, episodeIndex) => {
    const episodeId = docId(episode.key);
    db.files.push({
      kind: "folder",
      id: episodeId,
      projectId,
      parentId: folderOf("manuscript"),
      title: episode.title,
      role: "episode",
      category: "manuscript",
      rank: String((episodeIndex + 1) * 1024),
      trashedAt: null,
    });
    episode.chapters.forEach((chapter, chapterIndex) => {
      docTypeByKey.set(chapter.key, "manuscript");
      descriptions.set(chapter.key, chapter.description);
      bodies.set(
        chapter.key,
        chapter.body ?? seed.draftBody(chapter.description),
      );
      chapterKeys.push(chapter.key);
      db.files.push({
        kind: "document",
        id: docId(chapter.key),
        projectId,
        parentId: episodeId,
        title: chapter.title,
        docType: "manuscript",
        rank: String((chapterIndex + 1) * 1024),
        locked: false,
        revisionNo: 1 + Math.floor(rand() * 30),
        updatedAt: minutes(
          now,
          chapter.number === 12 ? 18 : (minuteOffset += 97),
        ),
        trashedAt: null,
      });
    });
  });

  const settingKeys: Record<SettingDocumentType, string[]> = {
    character: [],
    place: [],
    organization: [],
    item: [],
    event: [],
    worldview: [],
  };
  (Object.keys(seed.settings) as SettingDocumentType[]).forEach((type) => {
    seed.settings[type].forEach((entity, index) => {
      docTypeByKey.set(entity.key, type);
      descriptions.set(entity.key, entity.description);
      bodies.set(
        entity.key,
        entity.body ?? seed.settingBody(entity.description),
      );
      settingKeys[type].push(entity.key);
      db.files.push({
        kind: "document",
        id: docId(entity.key),
        projectId,
        parentId: folderOf(type),
        title: entity.title,
        docType: type,
        rank: String((index + 1) * 1024),
        locked: false,
        revisionNo: 1 + Math.floor(rand() * 12),
        updatedAt: minutes(now, (minuteOffset += 131)),
        trashedAt: null,
      });
    });
  });

  for (const key of chapterKeys) {
    for (const target of pickSome(rand, settingKeys.character, 2, 3))
      relate(key, target);
    for (const target of pickSome(rand, settingKeys.place, 1, 2))
      relate(key, target);
    for (const target of pickSome(rand, settingKeys.organization, 0, 1))
      relate(key, target);
    for (const target of pickSome(rand, settingKeys.item, 0, 2))
      relate(key, target);
    for (const target of pickSome(rand, settingKeys.event, 1, 2))
      relate(key, target);
    for (const target of pickSome(rand, settingKeys.worldview, 0, 1))
      relate(key, target);
  }
  const settingTypes = Object.keys(settingKeys) as SettingDocumentType[];
  for (const type of settingTypes) {
    for (const key of settingKeys[type]) {
      const others = settingTypes.filter((t) => t !== type);
      for (const otherType of pickSome(rand, others, 1, 2)) {
        for (const target of pickSome(rand, settingKeys[otherType], 1, 1))
          relate(key, target);
      }
      for (const target of pickSome(rand, chapterKeys, 1, 2))
        relate(key, target);
    }
  }

  relations.set("ch-12", new Map());
  relate("ch-12", "c-lena");
  relate("ch-12", "p-north");
  relations.set("c-lena", new Map());
  for (const target of ["o-fleet", "ch-12", "ch-11", "p-range", "e-awaken"])
    relate("c-lena", target);
  relations.set("o-fleet", new Map());
  relate("o-fleet", "c-lena");

  for (const key of docTypeByKey.keys()) {
    const id = docId(key);
    const byType = relations.get(key);
    const properties: DocumentProperty[] = [
      descriptionProperty(id, descriptions.get(key) ?? ""),
    ];
    for (const targetType of DOCUMENT_TYPES) {
      const targets = byType?.get(targetType);
      if (targets?.size)
        properties.push(relationProperty(id, targetType, [...targets]));
    }
    db.documents[id] = {
      body: bodyFromParagraphs(bodies.get(key) ?? ""),
      properties,
    };
  }

  const trashFolderId = docId("trash-folder");
  db.files.push(
    {
      kind: "document",
      id: docId("trash-prologue"),
      projectId,
      parentId: folderOf("manuscript"),
      title: seed.trash.prologue.title,
      docType: "manuscript",
      rank: "99999",
      locked: false,
      revisionNo: 3,
      updatedAt: minutes(now, 60 * 30),
      trashedAt: minutes(now, 2),
    },
    {
      kind: "folder",
      id: trashFolderId,
      projectId,
      parentId: null,
      title: seed.trash.folderTitle,
      role: "section",
      category: null,
      rank: "99999",
      trashedAt: minutes(now, 60 * 24),
    },
    {
      kind: "document",
      id: docId("trash-lighthouse"),
      projectId,
      parentId: trashFolderId,
      title: seed.trash.lighthouse.title,
      docType: "place",
      rank: "1024",
      locked: false,
      revisionNo: 2,
      updatedAt: minutes(now, 60 * 24 * 5),
      trashedAt: minutes(now, 60 * 24 * 3),
    },
  );
  db.documents[docId("trash-prologue")] = {
    body: bodyFromPlainText(seed.trash.prologue.body),
    properties: [
      descriptionProperty(
        docId("trash-prologue"),
        seed.trash.prologue.description,
      ),
    ],
  };
  db.documents[docId("trash-lighthouse")] = {
    body: bodyFromPlainText(seed.trash.lighthouse.body),
    properties: [
      descriptionProperty(
        docId("trash-lighthouse"),
        seed.trash.lighthouse.description,
      ),
    ],
  };

  db.favorites[projectId] = [docId("ch-12")];

  seed.projectMemos.forEach(({ title, body }, index) => {
    db.memos.push({
      id: `memo-p-${index + 1}`,
      projectId,
      scope: "project",
      fileId: null,
      title,
      body,
      updatedAt: minutes(now, 60 * (index + 1)),
    });
  });
  db.memos.push(
    {
      id: "memo-f-1",
      projectId,
      scope: "file",
      fileId: docId("ch-12"),
      title: "",
      body: seed.fileMemos.chapter,
      updatedAt: minutes(now, 40),
    },
    {
      id: "memo-f-2",
      projectId,
      scope: "file",
      fileId: docId("c-lena"),
      title: "",
      body: seed.fileMemos.lena,
      updatedAt: minutes(now, 60 * 20),
    },
  );

  const lenaId = docId("c-lena");
  const lena = db.documents[lenaId];
  const snapshotOf = (
    description: string,
    body: DocumentBody,
    dropChapter11: boolean,
  ) => ({
    title: seed.settings.character.find((c) => c.key === "c-lena")!.title,
    docType: "character" as const,
    body,
    properties: lena.properties.map((property) => {
      if (property.kind === "text") return { ...property, value: description };
      if (dropChapter11 && property.targetType === "manuscript") {
        return {
          ...property,
          targetIds: property.targetIds.filter((id) => id !== docId("ch-11")),
          descriptions: {},
        };
      }
      return property;
    }),
  });
  const history = seed.lenaHistory;
  const olderBody = bodyFromPlainText(
    bodyToPlainText(lena.body).replace(
      history.earlierPhrase.now,
      history.earlierPhrase.before,
    ),
  );
  const at = (minutesAgo: number) => now - minutesAgo * 60_000;
  db.versions.push(
    {
      id: "ver-lena-4",
      fileId: lenaId,
      kind: "NAMED",
      label: null,
      createdAt: new Date(at(42)).toISOString(),
      snapshot: snapshotOf(history.versionDescriptions[0], olderBody, true),
    },
    {
      id: "ver-lena-3",
      fileId: lenaId,
      kind: "AUTO",
      label: null,
      createdAt: new Date(at(60 * 5 + 20)).toISOString(),
      snapshot: snapshotOf(history.versionDescriptions[1], olderBody, true),
    },
    {
      id: "ver-lena-2",
      fileId: lenaId,
      kind: "NAMED",
      label: null,
      createdAt: new Date(at(60 * 27 + 10)).toISOString(),
      snapshot: snapshotOf(history.versionDescriptions[2], olderBody, true),
    },
    {
      id: "ver-lena-1",
      fileId: lenaId,
      kind: "AUTO",
      label: null,
      createdAt: new Date(at(60 * 24 * 15 + 90)).toISOString(),
      snapshot: snapshotOf(history.versionDescriptions[3], olderBody, true),
    },
  );
  const lenaProps = db.documents[lenaId].properties;
  const description = lenaProps.find((p) => p.kind === "text");
  if (description && description.kind === "text") {
    description.value = history.currentDescription;
  }

  const chatSessions: Array<[string, string, number]> = [
    ["chat-crack", seed.chat.sessions.crack, 5],
    ["chat-lena", seed.chat.sessions.lena, 60 * 26],
    ["chat-title", seed.chat.sessions.title, 60 * 24 * 4],
  ];
  const chapter12 = {
    id: docId("ch-12"),
    title: db.files.find((file) => file.id === docId("ch-12"))!.title,
  };
  for (const [id, title, ago] of chatSessions) {
    db.chatSessions.push({
      id,
      projectId,
      title,
      updatedAt: minutes(now, ago),
    });
  }
  db.chatMessages.push(
    {
      id: "msg-1",
      sessionId: "chat-crack",
      role: "user",
      content: seed.chat.question,
      createdAt: minutes(now, 6),
      contextFile: { ...chapter12 },
    },
    {
      id: "msg-2",
      sessionId: "chat-crack",
      role: "assistant",
      content: seed.chat.answer,
      createdAt: minutes(now, 5),
      contextFile: { ...chapter12 },
    },
  );

  db.projects.push({
    id: projectId,
    title: seed.project.title,
    description: seed.project.description,
    icon: "book-open",
    createdAt: minutes(now, 60 * 24 * 120),
    lastWorkedAt: minutes(now, 3),
    lastFile: { ...chapter12 },
    trashedAt: null,
  });
}

function buildOtherProject(now: number, db: MockDb, seed: SeedOtherProject) {
  const folders = categoryFolders(seed.id);
  db.files.push(...folders);
  const lastFileId = `${seed.id}:last`;
  db.files.push({
    kind: "document",
    id: lastFileId,
    projectId: seed.id,
    parentId: folders.find((f) => f.category === seed.lastFileType)!.id,
    title: seed.lastFileTitle,
    docType: seed.lastFileType,
    rank: "1024",
    locked: false,
    revisionNo: 1,
    updatedAt: minutes(now, seed.lastWorkedMinutesAgo),
    trashedAt: null,
  });
  db.documents[lastFileId] = {
    body: emptyBody(),
    properties: [descriptionProperty(lastFileId, "")],
  };
  db.favorites[seed.id] = [];
  db.projects.push({
    id: seed.id,
    title: seed.title,
    description: seed.description,
    icon: seed.icon,
    createdAt: minutes(now, seed.lastWorkedMinutesAgo + 60 * 24 * 30),
    lastWorkedAt: minutes(now, seed.lastWorkedMinutesAgo),
    lastFile: { id: lastFileId, title: seed.lastFileTitle },
    trashedAt: null,
  });
}

export function buildSeedDb(now = Date.now(), seed = SEED): MockDb {
  const db: MockDb = {
    version: MOCK_DB_VERSION,
    user: {
      id: "user-1",
      displayName: seed.account.displayName,
      email: "seoyunju@lore.kr",
      onboardingCompleted: true,
    },
    signedIn: false,
    projects: [],
    files: [],
    documents: {},
    favorites: {},
    memos: [],
    versions: [],
    chatSessions: [],
    chatMessages: [],
    workspaceStates: {},
    refreshRuns: {},
    saveReceipts: {},
    sequence: 1000,
  };
  buildGlassGarden(now, db, seed);
  for (const other of seed.otherProjects) buildOtherProject(now, db, other);
  for (const trashed of seed.trashedProjects) {
    db.projects.push({
      id: trashed.id,
      title: trashed.title,
      description: "",
      icon: trashed.icon,
      createdAt: minutes(now, 60 * 24 * 200),
      lastWorkedAt: minutes(now, 60 * 24 * (trashed.trashedDaysAgo + 10)),
      lastFile: null,
      trashedAt: minutes(now, 60 * 24 * trashed.trashedDaysAgo),
    });
  }
  return db;
}

/**
 * 예시 프로젝트를 새 id 로 한 벌 더 만든다. 서버의 `POST /projects/sample` 처럼 원고·설정·관계·
 * 메모가 채워진 프로젝트이고, AI 챗 기록은 넣지 않는다.
 */
export function addSampleProject(db: MockDb, projectId: string, title: string) {
  const scratch = buildSeedDb();
  const staged: MockDb = {
    ...scratch,
    projects: [],
    files: [],
    documents: {},
    favorites: {},
    memos: [],
    versions: [],
  };
  buildGlassGarden(Date.now(), staged, SEED, projectId);
  const project = staged.projects.find((p) => p.id === projectId)!;
  db.projects.push({ ...project, title });
  db.files.push(...staged.files);
  Object.assign(db.documents, staged.documents);
  db.favorites[projectId] = staged.favorites[projectId] ?? [];
  db.memos.push(
    ...staged.memos.map((memo) => ({ ...memo, id: nextId("memo") })),
  );
  db.versions.push(
    ...staged.versions.map((version) => ({
      ...version,
      id: nextId("version"),
    })),
  );
  return db.projects[db.projects.length - 1];
}

function isMockDb(value: unknown): value is MockDb {
  return (
    !!value &&
    typeof value === "object" &&
    (value as MockDb).version === MOCK_DB_VERSION &&
    Array.isArray((value as MockDb).projects)
  );
}

let current: MockDb | null = null;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function readStored(): MockDb | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isMockDb(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function getDb(): MockDb {
  if (current) return current;
  current = (typeof window !== "undefined" && readStored()) || buildSeedDb();
  return current;
}

export function persistDb() {
  if (typeof window === "undefined" || !current) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {}
  }, 150);
}

export function resetDb(seed?: MockDb) {
  current = seed ?? buildSeedDb();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {}
  persistDb();
  return current;
}

export function nextId(prefix: string) {
  const db = getDb();
  db.sequence += 1;
  return `${prefix}-${db.sequence.toString(36)}`;
}

export function isDocumentNode(node: FileNode): node is DocumentNode {
  return node.kind === "document";
}
