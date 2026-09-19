import { beforeEach, describe, expect, it } from "vitest";

import { ConflictError } from "../ports";
import { isServiceError } from "../errors";

import { clearMockRules, setMockLatency, setMockRule } from "./control";
import { GLASS_GARDEN_ID, getDb, resetDb } from "./db";
import { createMockServices } from "./index";
import { EXTRACTION_MS } from "./refresh";

const services = createMockServices();
const chapter12 = `${GLASS_GARDEN_ID}:ch-12`;

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
  it("saves with the current revision and rejects a stale one", async () => {
    const doc = await services.documents.get(chapter12);
    const saved = await services.documents.save(chapter12, {
      draft: {
        title: doc.title,
        bodyMd: "새 본문",
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
          bodyMd: "다른 탭의 본문",
          properties: doc.properties,
        },
        ifMatchRevision: doc.revisionNo,
        saveId: "save-2",
      }),
    );
    expect(stale).toBeInstanceOf(ConflictError);
    expect((stale as ConflictError).current.bodyMd).toBe("새 본문");
  });

  it("treats a retried save id as the same save", async () => {
    const doc = await services.documents.get(chapter12);
    const input = {
      draft: {
        title: doc.title,
        bodyMd: "한 번만",
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
        draft: { title: doc.title, bodyMd: "x", properties: doc.properties },
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
    expect(restored.bodyMd).toBe(latest.snapshot.bodyMd);
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

  it("hides trashed items and their children from the tree", async () => {
    const tree = await services.files.tree(GLASS_GARDEN_ID);
    expect(tree.some((node) => node.trashedAt)).toBe(false);
    const trash = await services.files.listTrash(GLASS_GARDEN_ID);
    expect(trash.map((entry) => entry.node.title)).toContain("옛 프롤로그");
  });
});

describe("mock search and graph", () => {
  it("ranks title matches above body-only matches", async () => {
    const hits = await services.search.search(GLASS_GARDEN_ID, "유리");
    const firstBodyOnly = hits.findIndex((hit) => !hit.title.includes("유리"));
    const lastTitle = hits
      .map((hit) => hit.title.includes("유리"))
      .lastIndexOf(true);
    expect(hits.length).toBeGreaterThan(0);
    expect(firstBodyOnly === -1 || firstBodyOnly > lastTitle).toBe(true);
    expect(hits[0].path[0]).toBe("파일");
  });

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
    expect(unchanged.bodyMd).toBe(harin.current?.bodyMd);
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
