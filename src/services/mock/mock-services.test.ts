import { beforeEach, describe, expect, it } from "vitest";

import { ConflictError } from "../ports";
import { isServiceError } from "../errors";

import { clearMockRules, setMockLatency, setMockRule } from "./control";
import { GLASS_GARDEN_ID, getDb, resetDb } from "./db";
import { createMockServices } from "./index";
import { EXTRACTION_MS } from "./refresh";
import {
  bodyFromParagraphs,
  bodyFromPlainText,
  bodyToPlainText,
} from "@/domain/document-body";
import { relationKeyOf } from "@/domain/document-types";
import type { RelationProperty } from "@/domain/models";

const services = createMockServices();
const chapter12 = `${GLASS_GARDEN_ID}:ch-12`;
const seoyun = `${GLASS_GARDEN_ID}:c-seoyun`;

async function rejection(promise: Promise<unknown>) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

beforeEach(() => {
  resetDb();
  clearMockRules();
  setMockLatency(0);
});

describe("mock projects", () => {
  it("lists active projects by most recent work", async () => {
    const projects = await services.projects.list();
    expect(projects[0].id).toBe(GLASS_GARDEN_ID);
    expect(projects.every((p) => p.trashedAt === null)).toBe(true);
  });

  it("rejects blank and case-insensitive duplicate titles", async () => {
    expect(
      isServiceError(
        await rejection(
          services.projects.create({ title: "  ", description: "" }),
        ),
      ),
    ).toBe(true);
    const duplicate = await rejection(
      services.projects.create({
        title: "  유리 정원의 기록 ",
        description: "",
      }),
    );
    expect(isServiceError(duplicate) && duplicate.code).toBe("duplicate");
  });

  it("creates the seven default category folders", async () => {
    const project = await services.projects.create({
      title: "새 이야기",
      description: "",
    });
    const tree = await services.files.tree(project.id);
    expect(tree.map((node) => node.title)).toEqual([
      "원고",
      "캐릭터",
      "장소",
      "조직",
      "아이템",
      "이벤트",
      "세계관",
    ]);
  });

  it("keeps trashed projects out of the list until restored", async () => {
    await services.projects.moveToTrash(GLASS_GARDEN_ID);
    expect(
      (await services.projects.list()).some((p) => p.id === GLASS_GARDEN_ID),
    ).toBe(false);
    await services.projects.restore(GLASS_GARDEN_ID);
    expect((await services.projects.list())[0].id).toBe(GLASS_GARDEN_ID);
  });
});

describe("mock documents", () => {
  /**
   * Markdown 으로 저장하던 동안 이런 문단은 다시 열 때 제목·목록·밑줄로 바뀌었다. 저장 형식이
   * JSON 이 된 이유이고, 저장 경로에서 그 일이 다시 일어나지 않는지 본다.
   */
  it("keeps plain text that looks like markdown", async () => {
    const services = createMockServices();
    const fileId = `${GLASS_GARDEN_ID}:ch-12`;
    const before = await services.documents.get(fileId);

    const texts = [
      "# 해시로 시작하는 문장",
      "1. 번호처럼 보이는 문장",
      "++더하기로 감싼 문장++",
      "*별표로 감싼 문장*",
    ];
    for (const [index, text] of texts.entries()) {
      const current = await services.documents.get(fileId);
      await services.documents.save(fileId, {
        draft: {
          title: before.title,
          body: bodyFromParagraphs(text),
          properties: current.properties,
        },
        ifMatchRevision: current.revisionNo,
        saveId: `plain-${index}`,
      });

      const again = await services.documents.get(fileId);
      expect((again.body.doc.content ?? [])[0]).toMatchObject({
        type: "paragraph",
      });
      expect(bodyToPlainText(again.body)).toBe(text);
    }
  });

  it("saves with the current revision and rejects a stale one", async () => {
    const doc = await services.documents.get(chapter12);
    const saved = await services.documents.save(chapter12, {
      draft: {
        title: doc.title,
        body: bodyFromPlainText("새 본문"),
        properties: doc.properties,
      },
      ifMatchRevision: doc.revisionNo,
      saveId: "save-1",
    });
    expect(saved.revisionNo).toBe(doc.revisionNo + 1);
    const stale = await rejection(
      services.documents.save(chapter12, {
        draft: {
          title: doc.title,
          body: bodyFromPlainText("다른 탭의 본문"),
          properties: doc.properties,
        },
        ifMatchRevision: doc.revisionNo,
        saveId: "save-2",
      }),
    );
    expect(stale).toBeInstanceOf(ConflictError);
    expect(bodyToPlainText((stale as ConflictError).current.body)).toBe(
      "새 본문",
    );
  });

  it("treats a retried save id as the same save", async () => {
    const doc = await services.documents.get(chapter12);
    const input = {
      draft: {
        title: doc.title,
        body: bodyFromPlainText("한 번만"),
        properties: doc.properties,
      },
      ifMatchRevision: doc.revisionNo,
      saveId: "retry-me",
    };
    const first = await services.documents.save(chapter12, input);
    const second = await services.documents.save(chapter12, input);
    expect(second.revisionNo).toBe(first.revisionNo);
  });

  it("blocks saves, new versions and restores while locked", async () => {
    const doc = await services.documents.setLocked(chapter12, true);
    const save = await rejection(
      services.documents.save(chapter12, {
        draft: {
          title: doc.title,
          body: bodyFromPlainText("x"),
          properties: doc.properties,
        },
        ifMatchRevision: doc.revisionNo,
        saveId: "locked",
      }),
    );
    expect(isServiceError(save) && save.code).toBe("locked");
    expect(
      isServiceError(await rejection(services.versions.saveNamed(chapter12))),
    ).toBe(true);
  });

  it("records the current state before restoring a version", async () => {
    const lena = `${GLASS_GARDEN_ID}:c-lena`;
    const [latest] = await services.versions.list(lena);
    const before = await services.documents.get(lena);
    const restored = await services.versions.restore(
      lena,
      latest.id,
      before.revisionNo,
    );
    const kinds = (await services.versions.list(lena)).map((v) => v.kind);
    expect(kinds).toContain("PRE_RESTORE");
    expect(kinds).toContain("RESTORE");
    expect(restored.body).toEqual(latest.snapshot.body);
  });
});

describe("mock files", () => {
  it("refuses to rename or trash a category folder", async () => {
    const folder = `${GLASS_GARDEN_ID}:folder:character`;
    expect(
      isServiceError(await rejection(services.files.rename(folder, "인물"))),
    ).toBe(true);
    expect(
      isServiceError(await rejection(services.files.moveToTrash(folder))),
    ).toBe(true);
  });

  it("allows episode folders only directly under manuscripts", async () => {
    const underPlace = await rejection(
      services.files.create({
        projectId: GLASS_GARDEN_ID,
        parentId: `${GLASS_GARDEN_ID}:folder:place`,
        kind: "folder",
        title: "에피소드",
      }),
    );
    expect(isServiceError(underPlace)).toBe(true);
    const episode = await services.files.create({
      projectId: GLASS_GARDEN_ID,
      parentId: `${GLASS_GARDEN_ID}:folder:manuscript`,
      kind: "folder",
      title: "Episode 5. 다음 이야기",
    });
    expect(episode.kind === "folder" && episode.role).toBe("episode");
  });

  it("restores to the category folder when the original parent is gone", async () => {
    const lighthouse = `${GLASS_GARDEN_ID}:trash-lighthouse`;
    const restored = await services.files.restore(lighthouse);
    expect(restored.parentId).toBe(`${GLASS_GARDEN_ID}:folder:place`);
  });

  it("returns chapters to the manuscript folder when an episode is deleted", async () => {
    const episodeId = `${GLASS_GARDEN_ID}:ep-4`;
    await services.files.deleteEpisode(episodeId);
    const tree = await services.files.tree(GLASS_GARDEN_ID);
    expect(tree.some((node) => node.id === episodeId)).toBe(false);
    expect(tree.find((node) => node.id === chapter12)?.parentId).toBe(
      `${GLASS_GARDEN_ID}:folder:manuscript`,
    );
  });

  it("changes a document type when it moves into another category", async () => {
    const lena = `${GLASS_GARDEN_ID}:c-lena`;
    const moved = await services.files.move(
      lena,
      `${GLASS_GARDEN_ID}:folder:organization`,
      null,
    );
    expect(moved.kind === "document" && moved.docType).toBe("organization");
  });

  it("allows plain folders at the files root but keeps settings out of episodes", async () => {
    const folder = await services.files.create({
      projectId: GLASS_GARDEN_ID,
      parentId: null,
      kind: "folder",
      title: "참고 자료",
    });
    expect(folder.kind === "folder" && folder.role).toBe("folder");
    const wrong = await rejection(
      services.files.move(
        `${GLASS_GARDEN_ID}:c-lena`,
        `${GLASS_GARDEN_ID}:ep-1`,
        null,
      ),
    );
    expect(isServiceError(wrong)).toBe(true);
  });

  it("hides trashed items and their children from the tree", async () => {
    const tree = await services.files.tree(GLASS_GARDEN_ID);
    expect(tree.some((node) => node.trashedAt)).toBe(false);
    const trash = await services.files.listTrash(GLASS_GARDEN_ID);
    expect(trash.map((entry) => entry.node.title)).toContain("옛 프롤로그");
  });
});

describe("mock search and graph", () => {
  it("builds directed edges only between active documents", async () => {
    const graph = await services.graph.getProjectGraph(GLASS_GARDEN_ID);
    const ids = new Set(graph.nodes.map((node) => node.id));
    expect(graph.nodes.length).toBeGreaterThan(40);
    expect(
      graph.edges.every((edge) => ids.has(edge.source) && ids.has(edge.target)),
    ).toBe(true);
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        source: chapter12,
        target: `${GLASS_GARDEN_ID}:c-lena`,
      }),
    );
    expect(graph.episodes[3].chapterIds).toContain(chapter12);
  });
});

describe("mock graph refresh", () => {
  it("refuses a second run while extracting and becomes ready later", async () => {
    const run = await services.refresh.start(GLASS_GARDEN_ID);
    expect(run.status).toBe("RUNNING");
    const busy = await rejection(services.refresh.start(GLASS_GARDEN_ID));
    expect(isServiceError(busy) && busy.code).toBe("busy");
    const stored = getDb().refreshRuns[GLASS_GARDEN_ID] as unknown as {
      readyAt: number;
    };
    stored.readyAt = Date.now() - EXTRACTION_MS;
    const ready = await services.refresh.current(GLASS_GARDEN_ID);
    expect(ready.status).toBe("READY");
    expect(ready.proposals.map((p) => p.kind)).toEqual([
      "modified",
      "added",
      "removed",
      "modified",
    ]);
  });

  it("does not touch documents until every proposal is resolved", async () => {
    await services.refresh.start(GLASS_GARDEN_ID);
    (
      getDb().refreshRuns[GLASS_GARDEN_ID] as unknown as { readyAt: number }
    ).readyAt = 0;
    const ready = await services.refresh.current(GLASS_GARDEN_ID);
    const harin = ready.proposals[0];
    const partial = await rejection(
      services.refresh.apply(GLASS_GARDEN_ID, ready.id, {
        [harin.id]: harin.proposed,
      }),
    );
    expect(isServiceError(partial)).toBe(true);
    const unchanged = await services.documents.get(harin.fileId);
    expect(unchanged.body).toEqual(harin.current?.body);
  });
});

describe("mock control", () => {
  it("fails an operation on demand without affecting others", async () => {
    setMockRule("projects.list", "fail");
    expect(isServiceError(await rejection(services.projects.list()))).toBe(
      true,
    );
    expect((await services.projects.listTrash()).length).toBeGreaterThan(0);
  });

  it("fails only once when asked", async () => {
    setMockRule("projects.list", "once");
    expect(isServiceError(await rejection(services.projects.list()))).toBe(
      true,
    );
    expect((await services.projects.list()).length).toBeGreaterThan(0);
  });
});

/**
 * 관계에는 방향이 없다. 서버는 한 쌍을 한 행으로 두고, mock 은 문서마다 속성을 따로 들고 있으므로
 * 저장할 때 반대쪽을 함께 고친다. 둘의 **보이는 결과가 같아야** QA 가 mock 에서 본 것을 그대로
 * 서버에 옮겨 말할 수 있다.
 */
describe("mock relations have no direction", () => {
  const relationsOf = async (fileId: string, key: string) =>
    (await services.documents.get(fileId)).properties.find(
      (property): property is RelationProperty =>
        property.kind === "relation" && property.key === key,
    );

  const saveRelations = async (fileId: string, targetIds: string[]) => {
    const doc = await services.documents.get(fileId);
    const key = relationKeyOf("character");
    const properties = doc.properties.filter(
      (property) => !(property.kind === "relation" && property.key === key),
    );
    if (targetIds.length) {
      properties.push({
        id: `${fileId}:${key}`,
        kind: "relation",
        key,
        label: "관련 캐릭터",
        targetType: "character",
        targetIds,
        descriptions: { [targetIds[0]]: "첫 등장" },
      });
    }
    await services.documents.save(fileId, {
      draft: { title: doc.title, body: doc.body, properties },
      ifMatchRevision: doc.revisionNo,
      saveId: `relation-${targetIds.length}`,
    });
  };

  it("shows the manuscript on the character it names", async () => {
    await saveRelations(chapter12, [seoyun]);

    const back = await relationsOf(seoyun, relationKeyOf("manuscript"));
    expect(back?.targetIds).toContain(chapter12);
    // 설명은 대상 문서의 것이 아니라 연결의 것이라 양쪽이 같다.
    expect(back?.descriptions[chapter12]).toBe("첫 등장");
  });

  it("drops it from the other document when the relation goes away", async () => {
    await saveRelations(chapter12, [seoyun]);
    await saveRelations(chapter12, []);

    const back = await relationsOf(seoyun, relationKeyOf("manuscript"));
    expect(back?.targetIds ?? []).not.toContain(chapter12);
  });
});
