import {
  DOCUMENT_TYPE_META,
  DOCUMENT_TYPES,
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
  GLASS_GARDEN_EPISODES,
  GLASS_GARDEN_SETTINGS,
  OTHER_PROJECTS,
  TRASHED_PROJECTS,
} from "./seed-world";

export const MOCK_DB_VERSION = 5;
const STORAGE_KEY = "loresentry.mock.db";

export interface StoredDocument {
  bodyMd: string;
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
    label: "설명",
    value,
  };
}

function relationKey(type: DocumentType) {
  return `related_${type}`;
}

function relationProperty(
  fileId: string,
  targetType: DocumentType,
  targetIds: string[],
): DocumentProperty {
  return {
    id: `${fileId}:${relationKey(targetType)}`,
    kind: "relation",
    key: relationKey(targetType),
    label: DOCUMENT_TYPE_META[targetType].relationLabel,
    targetType,
    targetIds,
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

function buildGlassGarden(now: number, db: MockDb) {
  const projectId = GLASS_GARDEN_ID;
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
  GLASS_GARDEN_EPISODES.forEach((episode, episodeIndex) => {
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
        chapter.body ??
          `${chapter.description}.\n\n이 회차의 초고는 아직 비어 있다. 장면의 순서와 인물의 동선만 메모로 남겨 두었다.`,
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
  (Object.keys(GLASS_GARDEN_SETTINGS) as SettingDocumentType[]).forEach(
    (type) => {
      GLASS_GARDEN_SETTINGS[type].forEach((entity, index) => {
        docTypeByKey.set(entity.key, type);
        descriptions.set(entity.key, entity.description);
        bodies.set(entity.key, entity.body ?? `${entity.description}.`);
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
    },
  );

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
    db.documents[id] = { bodyMd: bodies.get(key) ?? "", properties };
  }

  const trashFolderId = docId("trash-folder");
  db.files.push(
    {
      kind: "document",
      id: docId("trash-prologue"),
      projectId,
      parentId: folderOf("manuscript"),
      title: "옛 프롤로그",
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
      title: "보류한 설정",
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
      title: "사라진 등대",
      docType: "place",
      rank: "1024",
      locked: false,
      revisionNo: 2,
      updatedAt: minutes(now, 60 * 24 * 5),
      trashedAt: minutes(now, 60 * 24 * 3),
    },
  );
  db.documents[docId("trash-prologue")] = {
    bodyMd: "정원이 생기기 전의 이야기.",
    properties: [
      descriptionProperty(docId("trash-prologue"), "초기 구상의 프롤로그"),
    ],
  };
  db.documents[docId("trash-lighthouse")] = {
    bodyMd: "지도에서 지워진 등대.",
    properties: [
      descriptionProperty(docId("trash-lighthouse"), "초기 설정에만 있던 등대"),
    ],
  };

  db.favorites[projectId] = [docId("ch-12")];

  const projectMemoBodies = [
    "균열은 문이 아니라 기억의 방향이다. 다음 장면에서 유리 조각의 의미를 다시 연결한다.",
    "서윤과 하린이 처음 마주치는 장소는 북쪽 온실. 빛이 유리 벽을 통과하는 시간을 확인한다.",
    "세계관 용어는 ‘진향’으로 통일한다. 인물마다 잔향을 감지하는 방식이 다르다.",
    "후반부 사건 순서를 다시 검토한다. 축제 다음 날에 정전이 발생하도록 조정.",
    "표지 후보 문구: 기억은 언제나 빛이 지난 자리에 남는다.",
  ];
  projectMemoBodies.forEach((body, index) => {
    db.memos.push({
      id: `memo-p-${index + 1}`,
      projectId,
      scope: "project",
      fileId: null,
      title: "",
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
      body: "손잡이 진동 묘사는 한 번만 사용한다. ‘균열’이라는 단어는 마지막 문장까지 아껴 두기.",
      updatedAt: minutes(now, 40),
    },
    {
      id: "memo-f-2",
      projectId,
      scope: "file",
      fileId: docId("c-lena"),
      title: "",
      body: "레나의 말투는 항해 용어를 섞되 설명하지 않는다.",
      updatedAt: minutes(now, 60 * 20),
    },
  );

  const lenaId = docId("c-lena");
  const lena = db.documents[lenaId];
  const snapshotOf = (
    description: string,
    bodyMd: string,
    dropChapter11: boolean,
  ) => ({
    title: "레나 아르벨",
    docType: "character" as const,
    bodyMd,
    properties: lena.properties.map((property) => {
      if (property.kind === "text") return { ...property, value: description };
      if (dropChapter11 && property.targetType === "manuscript") {
        return {
          ...property,
          targetIds: property.targetIds.filter((id) => id !== docId("ch-11")),
        };
      }
      return property;
    }),
  });
  const olderBody = lena.bodyMd.replace(
    "한 번도 길을 잃지 않았다",
    "길을 잃지 않았다",
  );
  const today = new Date(now);
  const at = (daysAgo: number, hour: number, minute: number) => {
    const date = new Date(today);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(hour, minute, 0, 0);
    return Math.min(date.getTime(), now - 60_000);
  };
  db.versions.push(
    {
      id: "ver-lena-4",
      fileId: lenaId,
      kind: "NAMED",
      label: null,
      createdAt: new Date(at(0, 15, 4)).toISOString(),
      snapshot: snapshotOf(
        "타인의 기억이 남긴 방향을 감각으로 읽는 항해사",
        olderBody,
        true,
      ),
    },
    {
      id: "ver-lena-3",
      fileId: lenaId,
      kind: "AUTO",
      label: null,
      createdAt: new Date(at(0, 9, 22)).toISOString(),
      snapshot: snapshotOf(
        "타인의 기억이 남긴 방향을 감각으로 읽는 항해사",
        olderBody,
        true,
      ),
    },
    {
      id: "ver-lena-2",
      fileId: lenaId,
      kind: "NAMED",
      label: null,
      createdAt: new Date(at(1, 22, 19)).toISOString(),
      snapshot: snapshotOf("은빛 항해단의 항해사", olderBody, true),
    },
    {
      id: "ver-lena-1",
      fileId: lenaId,
      kind: "AUTO",
      label: null,
      createdAt: new Date(at(15, 17, 40)).toISOString(),
      snapshot: snapshotOf("항해사", olderBody, true),
    },
  );
  const lenaProps = db.documents[lenaId].properties;
  const description = lenaProps.find((p) => p.kind === "text");
  if (description && description.kind === "text") {
    description.value = "기억 항로를 읽어 내는 은빛 항해단의 항해사";
  }

  const chatSessions: Array<[string, string, number]> = [
    ["chat-crack", "균열 장면 다듬기", 5],
    ["chat-lena", "레나 설정 정리", 60 * 26],
    ["chat-title", "12화 제목 후보", 60 * 24 * 4],
  ];
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
      content: "문이 열리기 직전 장면의 긴장감을 더 높일 방법을 알려줘.",
      createdAt: minutes(now, 6),
      contextFile: { id: docId("ch-12"), title: "12화 · 균열의 밤" },
    },
    {
      id: "msg-2",
      sessionId: "chat-crack",
      role: "assistant",
      content:
        "문을 열기 전에 세 가지 감각을 짧게 쌓아 보세요. 손잡이의 진동, 등불이 흔들리는 소리, 그리고 문 너머의 목소리를 한 문장씩 좁혀 가면 독자가 서윤의 망설임을 함께 느낄 수 있습니다.",
      createdAt: minutes(now, 5),
      contextFile: { id: docId("ch-12"), title: "12화 · 균열의 밤" },
    },
  );

  db.projects.push({
    id: projectId,
    title: "유리 정원의 기록",
    description: "빛이 지난 자리에 남는 기억을 기록하는 사람들의 이야기",
    icon: "book-open",
    createdAt: minutes(now, 60 * 24 * 120),
    lastWorkedAt: minutes(now, 3),
    lastFile: { id: docId("ch-12"), title: "12화 · 균열의 밤" },
    trashedAt: null,
  });
}

function buildOtherProject(
  now: number,
  db: MockDb,
  seed: (typeof OTHER_PROJECTS)[number],
) {
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
    bodyMd: "",
    properties: [descriptionProperty(lastFileId, "")],
  };
  db.favorites[seed.id] = [];
  db.projects.push({
    id: seed.id,
    title: seed.title,
    description: "",
    icon: seed.icon,
    createdAt: minutes(now, seed.lastWorkedMinutesAgo + 60 * 24 * 30),
    lastWorkedAt: minutes(now, seed.lastWorkedMinutesAgo),
    lastFile: { id: lastFileId, title: seed.lastFileTitle },
    trashedAt: null,
  });
}

export function buildSeedDb(now = Date.now()): MockDb {
  const db: MockDb = {
    version: MOCK_DB_VERSION,
    user: { id: "user-1", displayName: "서윤주", email: "seoyunju@lore.kr" },
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
  buildGlassGarden(now, db);
  for (const seed of OTHER_PROJECTS) buildOtherProject(now, db, seed);
  for (const trashed of TRASHED_PROJECTS) {
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
