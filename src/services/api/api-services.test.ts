import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyDataSourceOverride,
  DEFAULT_RUNTIME_CONFIG,
} from "@/config/runtime-config";

import { createServices } from "../create-services";
import { isServiceError } from "../errors";
import { ConflictError } from "../ports";

import { createApiServices } from ".";

const BASE = "https://api.test.invalid";

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  credentials?: RequestCredentials;
  body: unknown;
}

let calls: Call[];
let responses: Array<{ status: number; body?: unknown }>;

function reply(status: number, body?: unknown) {
  responses.push({ status, body });
}

beforeEach(() => {
  calls = [];
  responses = [];
  window.localStorage.clear();
  window.sessionStorage.clear();

  vi.stubGlobal("fetch", (input: string, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      method: init.method ?? "GET",
      headers: (init.headers ?? {}) as Record<string, string>,
      credentials: init.credentials,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    const next = responses.shift();
    if (!next)
      throw new Error(`unexpected request: ${init.method ?? "GET"} ${input}`);
    return Promise.resolve(
      new Response(next.body === undefined ? null : JSON.stringify(next.body), {
        status: next.status,
        headers:
          next.body === undefined ? {} : { "Content-Type": "application/json" },
      }),
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const services = () => createApiServices(BASE);

const apiProject = {
  id: "p-1",
  name: "유리 정원의 기록",
  description: "온실",
  last_worked_at: "2026-09-24T00:00:00Z",
  trashed_at: null,
  created_at: "2026-09-01T00:00:00Z",
  last_file: null,
};

describe("identity and transport", () => {
  it("sends cookies instead of an identity header", async () => {
    reply(200, { projects: [apiProject] });
    await services().projects!.list();

    expect(calls[0].url).toBe(`${BASE}/projects`);
    // 토큰은 HttpOnly 쿠키로만 오간다. 개발 신원 헤더는 더 이상 없다.
    expect(calls[0].credentials).toBe("include");
    expect(calls[0].headers["X-User-Id"]).toBeUndefined();
  });

  it("marks state-changing requests for CSRF but leaves reads alone", async () => {
    reply(200, { projects: [] });
    await services().projects!.list();
    expect(calls[0].headers["X-LS-CSRF"]).toBeUndefined();

    reply(201, apiProject);
    await services().projects!.create({ title: "x", description: "" });
    expect(calls[1].headers["X-LS-CSRF"]).toBe("1");

    reply(204);
    await services().projects!.moveToTrash("p-1");
    expect(calls[2].headers["X-LS-CSRF"]).toBe("1");
  });

  it("turns a failed fetch into a network error rather than letting it escape", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("offline")));

    const error = await services()
      .projects!.list()
      .catch((cause: unknown) => cause);

    expect(isServiceError(error) && error.code).toBe("network");
  });

  it("maps server codes onto the codes the screens branch on", async () => {
    const cases: Array<[number, string, string]> = [
      [409, "PROJECT_NAME_TAKEN", "duplicate"],
      [404, "PROJECT_NOT_FOUND", "not-found"],
      [400, "INVALID_PROJECT_NAME", "validation"],
      [409, "DOCUMENT_LOCKED", "locked"],
      [502, "UPSTREAM_UNAVAILABLE", "network"],
      [503, "CONTENT_UNAVAILABLE", "network"],
      [401, "ACCESS_TOKEN_EXPIRED", "unauthenticated"],
      [401, "SESSION_INVALID", "unauthenticated"],
    ];

    for (const [status, code, expected] of cases) {
      reply(status, {
        code,
        message: "diagnostic english",
        next_action: "NONE",
      });
      // 재발급 대상 코드는 클라이언트가 재발급을 한 번 시도한다. 그 시도가 실패해야
      // 원래 오류가 화면까지 온다.
      if (code === "ACCESS_TOKEN_EXPIRED")
        reply(401, { code: "INVALID_REFRESH_TOKEN" });
      const error = await services()
        .projects!.get("p-1")
        .catch((cause: unknown) => cause);
      expect(isServiceError(error) && error.code, code).toBe(expected);
      // 서버 메시지는 진단용 영어다. 화면에 그대로 띄우지 않는다.
      expect(isServiceError(error) && error.message).not.toContain(
        "diagnostic",
      );
    }
  });

  it("falls back on the status when the code is one it has never seen", async () => {
    reply(409, { code: "SOMETHING_NEW_FROM_THE_SERVER" });
    const error = await services()
      .projects!.get("p-1")
      .catch((cause: unknown) => cause);

    expect(isServiceError(error) && error.code).toBe("duplicate");
  });
});

describe("token refresh", () => {
  it("refreshes once and replays the rejected request", async () => {
    // AT 는 15분이다. 그것만으로 사용자를 로그아웃시키면 글을 쓰는 중에 저장이 실패한다.
    reply(401, { code: "ACCESS_TOKEN_EXPIRED", next_action: "REFRESH" });
    reply(204);
    reply(200, { projects: [] });

    await expect(services().projects!.list()).resolves.toEqual([]);

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      `GET ${BASE}/projects`,
      `POST ${BASE}/auth/tokens/refresh`,
      `GET ${BASE}/projects`,
    ]);
    // 재발급도 상태를 바꾸는 요청이다.
    expect(calls[1].headers["X-LS-CSRF"]).toBe("1");
  });

  it("gives up after one refresh instead of looping", async () => {
    reply(401, { code: "ACCESS_TOKEN_EXPIRED" });
    reply(204);
    reply(401, { code: "ACCESS_TOKEN_EXPIRED" });

    const error = await services()
      .projects!.list()
      .catch((cause: unknown) => cause);

    expect(isServiceError(error) && error.code).toBe("unauthenticated");
    expect(calls.filter((call) => call.url.endsWith("/refresh"))).toHaveLength(
      1,
    );
  });

  it("leaves a dead session alone", async () => {
    // SESSION_INVALID 는 재로그인이다. 재발급을 시도하면 끝난 세션을 두고 계속 두드린다.
    reply(401, { code: "SESSION_INVALID" });

    const error = await services()
      .projects!.list()
      .catch((cause: unknown) => cause);

    expect(isServiceError(error) && error.code).toBe("unauthenticated");
    expect(calls).toHaveLength(1);
  });

  it("makes concurrent failures share a single refresh", async () => {
    // 탭 하나에서 동시에 거절된 요청들이 각자 재발급하면 RT 를 회전시키는 서버에서 서로를 망친다.
    responses.push(
      { status: 401, body: { code: "ACCESS_TOKEN_EXPIRED" } },
      { status: 401, body: { code: "ACCESS_TOKEN_EXPIRED" } },
      { status: 204 },
      { status: 200, body: { projects: [] } },
      { status: 200, body: { projects: [] } },
    );

    const wired = services();
    await Promise.all([wired.projects!.list(), wired.projects!.list()]);

    expect(calls.filter((call) => call.url.endsWith("/refresh"))).toHaveLength(
      1,
    );
  });
});

describe("projects", () => {
  it("translates between the server's name and the screen's title", async () => {
    reply(200, { projects: [apiProject] });
    const [project] = await services().projects!.list();

    expect(project.title).toBe("유리 정원의 기록");
    expect(project.trashedAt).toBeNull();
  });

  it("derives a stable icon from the id, since the server does not store one", async () => {
    reply(200, { projects: [apiProject] });
    reply(200, { projects: [apiProject] });

    const first = (await services().projects!.list())[0].icon;
    const second = (await services().projects!.list())[0].icon;

    expect(first).toBe(second);
  });

  it("sends the title as name when creating", async () => {
    reply(201, apiProject);
    await services().projects!.create({
      title: "새 프로젝트",
      description: "설명",
    });

    expect(calls[0].method).toBe("POST");
    expect(calls[0].body).toEqual({ name: "새 프로젝트", description: "설명" });
  });

  it("reads settings from the project itself rather than a separate endpoint", async () => {
    reply(200, apiProject);
    const settings = await services().projects!.getSettings("p-1");

    expect(calls[0].url).toBe(`${BASE}/projects/p-1`);
    expect(settings).toEqual({
      title: "유리 정원의 기록",
      description: "온실",
    });
  });
});

const apiTree = {
  folders: [
    { code: "MANUSCRIPT", name: "원고", position: 40 },
    { code: "CHARACTER", name: "캐릭터", position: 20 },
    { code: "LOCATION", name: "장소", position: 30 },
  ],
  episodes: [{ id: "ep-1", name: "1부", rank: "a0" }],
  documents: [
    {
      id: "d-1",
      title: "1화",
      folder_code: "MANUSCRIPT",
      episode_id: "ep-1",
      rank: "a0",
      locked: false,
      char_count: 0,
      revision_no: 3,
      trashed_at: null,
      updated_at: "2026-09-24T00:00:00Z",
    },
    {
      id: "d-2",
      title: "유중혁",
      folder_code: "CHARACTER",
      episode_id: null,
      rank: "a1",
      locked: true,
      char_count: 12,
      revision_no: 7,
      trashed_at: null,
      updated_at: "2026-09-24T00:00:00Z",
    },
  ],
};

describe("files", () => {
  it("builds the tree the sidebar needs out of three flat lists", async () => {
    reply(200, apiTree);
    const nodes = await services().files!.tree("p-1");

    const category = nodes.find(
      (node) => node.kind === "folder" && node.role === "category",
    );
    const episode = nodes.find((node) => node.id === "ep-1");
    const chapter = nodes.find((node) => node.id === "d-1");
    const character = nodes.find((node) => node.id === "d-2");

    expect(category).toBeTruthy();
    // 에피소드는 원고 분류 아래에, 회차는 에피소드 아래에 붙는다.
    expect(episode?.parentId).toBe(nodes.find((n) => n.title === "원고")?.id);
    expect(chapter?.parentId).toBe("ep-1");
    expect(character?.parentId).toBe(
      nodes.find((n) => n.title === "캐릭터")?.id,
    );
  });

  it("maps LOCATION onto the place document type", async () => {
    reply(200, apiTree);
    const nodes = await services().files!.tree("p-1");

    expect(nodes.find((n) => n.title === "장소")).toMatchObject({
      category: "place",
    });
  });

  it("carries the revision and lock the editor needs", async () => {
    reply(200, apiTree);
    const nodes = await services().files!.tree("p-1");

    expect(nodes.find((n) => n.id === "d-2")).toMatchObject({
      locked: true,
      revisionNo: 7,
    });
  });

  it("turns a category node id back into the folder code when creating", async () => {
    reply(200, apiTree);
    const files = services().files!;
    const nodes = await files.tree("p-1");
    const characterFolder = nodes.find((n) => n.title === "캐릭터")!;

    reply(201, { ...apiTree.documents[1], id: "d-3", title: "김독자" });
    await files.create({
      projectId: "p-1",
      parentId: characterFolder.id,
      kind: "document",
      title: "김독자",
    });

    expect(calls[1].body).toMatchObject({
      kind: "document",
      folder_code: "CHARACTER",
      episode_id: null,
    });
  });

  it("creates a folder only as an episode under the manuscript category", async () => {
    reply(200, apiTree);
    const files = services().files!;
    const nodes = await files.tree("p-1");
    const manuscript = nodes.find((n) => n.title === "원고")!;
    const character = nodes.find((n) => n.title === "캐릭터")!;

    reply(201, { id: "ep-2", name: "2부", rank: "a1" });
    await files.create({
      projectId: "p-1",
      parentId: manuscript.id,
      kind: "folder",
      title: "2부",
    });
    expect(calls[1].body).toEqual({ kind: "episode", title: "2부" });

    // 에피소드 폴더는 원고 아래에만 만들 수 있다(요구사항 §4.1).
    const error = await files
      .create({
        projectId: "p-1",
        parentId: character.id,
        kind: "folder",
        title: "안 되는 폴더",
      })
      .catch((cause: unknown) => cause);
    expect(isServiceError(error) && error.code).toBe("validation");
  });

  it("renames an episode through its own path, not the file path", async () => {
    reply(200, apiTree);
    const files = services().files!;
    await files.tree("p-1");

    reply(200, { id: "ep-1", name: "1부 수정", rank: "a0" });
    await files.rename("ep-1", "1부 수정");
    expect(calls[1].url).toBe(`${BASE}/episodes/ep-1`);

    reply(200, { ...apiTree.documents[1], title: "김독자" });
    await files.rename("d-2", "김독자");
    expect(calls[2].url).toBe(`${BASE}/files/d-2`);
  });

  it("names the sibling to insert before and lets the server pick the rank", async () => {
    reply(200, apiTree);
    const files = services().files!;
    const nodes = await files.tree("p-1");
    const characterFolder = nodes.find((n) => n.title === "캐릭터")!;

    reply(200, apiTree.documents[1]);
    await files.move("d-2", characterFolder.id, "d-9");

    expect(calls[1].url).toBe(`${BASE}/files/d-2/position`);
    expect(calls[1].body).toEqual({
      folder_code: "CHARACTER",
      episode_id: null,
      before_file_id: "d-9",
    });
    // 순서 값은 클라이언트가 계산하지 않는다.
    expect(calls[1].body).not.toHaveProperty("rank");
  });

  it("keeps favorites on the server now that a table exists", async () => {
    const files = services().files!;

    reply(200, { file_ids: [] });
    expect(await files.favorites("p-1")).toEqual([]);
    expect(calls[0].url).toBe(`${BASE}/projects/p-1/favorites`);

    // 추가·제거가 본문 없는 PUT·DELETE 이고 둘 다 전체 목록을 돌려준다.
    reply(200, { file_ids: ["d-2"] });
    expect(await files.setFavorite("p-1", "d-2", true)).toEqual(["d-2"]);
    expect(calls[1].method).toBe("PUT");
    expect(calls[1].body).toBeUndefined();

    reply(200, { file_ids: [] });
    expect(await files.setFavorite("p-1", "d-2", false)).toEqual([]);
    expect(calls[2].method).toBe("DELETE");
  });

  it("refuses user sections instead of pretending to store them", async () => {
    const error = await services()
      .files!.createSection("p-1", "내 섹션")
      .catch((cause: unknown) => cause);

    expect(isServiceError(error) && error.code).toBe("validation");
    expect(calls).toHaveLength(0);
  });
});

const apiContent = {
  id: "d-2",
  project_id: "p-1",
  title: "유중혁",
  folder_code: "CHARACTER",
  episode_id: null,
  body_md: "회귀를 반복한다.",
  properties: [{ key: "description", value: "세 번째 등장인물" }],
  relations: [{ relation_key: "related_character", target_document_id: "d-9" }],
  locked: false,
  char_count: 9,
  revision_no: 4,
  updated_at: "2026-09-24T00:00:00Z",
};

describe("trash", () => {
  it("can restore a file it only ever saw in the trash list", async () => {
    // 휴지통 항목은 트리에 없다. 새로 고침 직후 휴지통에서 바로 복원하는 것이 그 경로다.
    const wired = services();
    reply(200, {
      files: [
        {
          id: "d-5",
          title: "버린 문서",
          folder_code: "CHARACTER",
          episode_name: null,
          trashed_at: "2026-09-25T00:00:00Z",
        },
      ],
    });
    await wired.files!.listTrash("p-1");

    reply(200, { ...apiContent, id: "d-5", title: "버린 문서" });
    const restored = await wired.files!.restore("d-5");

    expect(restored.projectId).toBe("p-1");
    expect(calls[1].url).toBe(`${BASE}/files/d-5/restore`);
  });
});

describe("documents", () => {
  it("merges the server's two property lists into one the editor understands", async () => {
    reply(200, apiContent);
    const content = await services().documents!.get("d-2");

    expect(content.properties).toEqual([
      {
        id: "text:description",
        kind: "text",
        key: "description",
        label: "설명",
        value: "세 번째 등장인물",
      },
      {
        id: "relation:related_character",
        kind: "relation",
        key: "related_character",
        label: "관련 캐릭터",
        targetType: "character",
        targetIds: ["d-9"],
      },
    ]);
  });

  it("splits them back apart when saving, and sends the conditional headers", async () => {
    reply(200, apiContent);
    const documents = services().documents!;
    const content = await documents.get("d-2");

    reply(200, apiContent);
    await documents.save("d-2", {
      draft: {
        title: content.title,
        bodyMd: content.bodyMd,
        properties: content.properties,
      },
      ifMatchRevision: 4,
      saveId: "save-1",
    });

    expect(calls[1].method).toBe("PUT");
    expect(calls[1].headers["If-Match"]).toBe('"4"');
    expect(calls[1].headers["X-Save-Id"]).toBe("save-1");
    expect(calls[1].body).toMatchObject({
      properties: [{ key: "description", value: "세 번째 등장인물" }],
      relations: [
        { relation_key: "related_character", target_document_id: "d-9" },
      ],
    });
  });

  it("turns a save conflict into the error the editor merges from", async () => {
    reply(409, {
      code: "DOCUMENT_CONFLICT",
      message: "Document was saved elsewhere first.",
      next_action: "NONE",
      current: { ...apiContent, body_md: "다른 탭이 쓴 본문", revision_no: 5 },
      base: {
        title: "유중혁",
        body_md: "공통 조상",
        properties: [],
        relations: [],
      },
    });

    const error = await services()
      .documents!.save("d-2", {
        draft: { title: "유중혁", bodyMd: "내 본문", properties: [] },
        ifMatchRevision: 4,
        saveId: "save-2",
      })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(ConflictError);
    const conflict = error as ConflictError;
    expect(conflict.current.bodyMd).toBe("다른 탭이 쓴 본문");
    expect(conflict.base?.bodyMd).toBe("공통 조상");
  });

  it("leaves base null when no version kept that revision", async () => {
    reply(409, {
      code: "DOCUMENT_CONFLICT",
      current: { ...apiContent, revision_no: 5 },
      base: null,
    });

    const error = await services()
      .documents!.save("d-2", {
        draft: { title: "유중혁", bodyMd: "내 본문", properties: [] },
        ifMatchRevision: 4,
        saveId: "save-3",
      })
      .catch((cause: unknown) => cause);

    expect((error as ConflictError).base).toBeNull();
  });

  it("does not mistake a lock for a conflict", async () => {
    // 둘 다 409 다. 코드로 갈라야 화면이 맞는 안내를 낸다.
    reply(409, { code: "DOCUMENT_LOCKED" });

    const error = await services()
      .documents!.save("d-2", {
        draft: { title: "유중혁", bodyMd: "x", properties: [] },
        ifMatchRevision: 4,
        saveId: "save-4",
      })
      .catch((cause: unknown) => cause);

    expect(error).not.toBeInstanceOf(ConflictError);
    expect(isServiceError(error) && error.code).toBe("locked");
  });

  it("writes markdown in the browser, naming relation targets", async () => {
    reply(200, apiContent);
    reply(200, {
      folders: [],
      episodes: [],
      documents: [
        { id: "d-9", title: "한수영" },
        { id: "d-2", title: "유중혁" },
      ],
    });
    const captured: string[] = [];
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: (blob: Blob) => {
        captured.push((blob as Blob & { __text?: string }).__text ?? "");
        return "blob:md";
      },
    });
    vi.stubGlobal(
      "Blob",
      class {
        __text: string;
        constructor(parts: string[]) {
          this.__text = parts.join("");
        }
      },
    );

    const result = await services().documents!.export("d-2", "md");

    expect(result).toEqual({ fileName: "유중혁.md", url: "blob:md" });
    expect(captured[0]).toContain("# 유중혁");
    expect(captured[0]).toContain("- 설명: 세 번째 등장인물");
    // 서버는 대상 id 만 준다. 제목으로 적으려면 파일 목록을 한 번 더 불러야 한다.
    expect(captured[0]).toContain("한수영");
    expect(calls[1].url).toBe(`${BASE}/projects/p-1/files`);
  });

  it("asks for no file list when the document has no relations", async () => {
    reply(200, { ...apiContent, relations: [] });
    const result = await services().documents!.export("d-2", "txt");

    expect(result.fileName).toBe("유중혁.txt");
    expect(calls).toHaveLength(1);
  });

  it("carries relation keys it does not understand back on save", async () => {
    // 화면 모델에는 자리가 없어 버려지는 관계다. 저장할 때 다시 실어 보내지 않으면
    // 그 저장이 서버에서 그 관계를 지운다 — 화면은 자기가 모르는 것을 지울 권한이 없다.
    reply(200, {
      ...apiContent,
      relations: [
        { relation_key: "related_character", target_document_id: "d-9" },
        { relation_key: "related_episode", target_document_id: "d-7" },
      ],
    });
    const documents = services().documents!;
    const content = await documents.get("d-2");

    expect(content.properties.some((p) => p.kind === "relation")).toBe(true);

    reply(200, apiContent);
    await documents.save("d-2", {
      draft: {
        title: content.title,
        bodyMd: content.bodyMd,
        properties: content.properties,
      },
      ifMatchRevision: 4,
      saveId: "save-5",
    });

    expect((calls[1].body as { relations: unknown[] }).relations).toEqual([
      { relation_key: "related_character", target_document_id: "d-9" },
      { relation_key: "related_episode", target_document_id: "d-7" },
    ]);
  });

  it("reports an unbuilt format as pending, not as a failure", async () => {
    // 거절하면 화면이 "잠시 후 다시 시도해 주세요" 를 띄운다. 영원히 성공하지 않는 재시도다.
    reply(200, apiContent);
    const result = await services().documents!.export("d-2", "docx");

    expect(result).toEqual({ fileName: "유중혁.docx", url: "" });
  });
});

describe("versions", () => {
  const apiVersion = {
    id: "v-1",
    file_id: "d-2",
    kind: "RESTORE",
    label: "복원 전",
    source_revision_no: 4,
    created_at: "2026-09-24T00:00:00Z",
    snapshot: {
      title: "유중혁",
      body_md: "옛 본문",
      properties: [],
      relations: [],
    },
  };

  it("renames the server's RESTORE kind to the screen's PRE_RESTORE", async () => {
    reply(200, apiContent);
    reply(200, { versions: [apiVersion] });

    const [version] = await services().versions!.list("d-2");

    expect(version.kind).toBe("PRE_RESTORE");
    expect(version.snapshot).toMatchObject({
      bodyMd: "옛 본문",
      docType: "character",
    });
  });

  it("requires the revision when restoring, the same as a save", async () => {
    reply(200, apiContent);
    await services().versions!.restore("d-2", "v-1", 4);

    expect(calls[0].headers["If-Match"]).toBe('"4"');
  });
});

describe("versions and the document memory", () => {
  const apiVersion = {
    id: "v-1",
    file_id: "d-2",
    kind: "AUTO",
    label: null,
    source_revision_no: 3,
    created_at: "2026-09-24T00:00:00Z",
    snapshot: {
      title: "유중혁",
      body_md: "옛 본문",
      properties: [],
      relations: [],
    },
  };

  it("does not refetch the document just to learn its kind", async () => {
    const wired = services();
    reply(200, apiContent);
    await wired.documents!.get("d-2");

    // 버전 목록만 요청해야 한다. 종류는 방금 읽은 문서에서 이미 안다.
    reply(200, { versions: [apiVersion] });
    const versions = await wired.versions!.list("d-2");

    expect(versions[0].snapshot.docType).toBe("character");
    expect(calls).toHaveLength(2);
    expect(calls[1].url).toBe(`${BASE}/files/d-2/versions`);
  });

  it("falls back to reading the document when it has not seen it", async () => {
    const wired = services();
    reply(200, apiContent);
    reply(200, { versions: [apiVersion] });
    const versions = await wired.versions!.list("d-2");

    expect(versions[0].snapshot.docType).toBe("character");
    expect(calls[0].url).toBe(`${BASE}/files/d-2/content`);
  });
});

describe("search", () => {
  it("keeps the snippet the server cut and reports where the hit lives", async () => {
    reply(200, {
      hits: [
        {
          file_id: "d-2",
          title: "유중혁",
          folder_code: "CHARACTER",
          episode_name: null,
          snippet: { before: "앞", match: "회귀", after: "뒤" },
          updated_at: "2026-09-24T00:00:00Z",
        },
      ],
    });

    const [hit] = await services().search!.search("p-1", "회귀");

    expect(calls[0].url).toBe(
      `${BASE}/projects/p-1/search?q=%ED%9A%8C%EA%B7%80`,
    );
    expect(hit).toMatchObject({ docType: "character", path: ["캐릭터"] });
    expect(hit.snippet).toEqual({ before: "앞", match: "회귀", after: "뒤" });
  });
});

describe("wiring", () => {
  it("refuses the ports the server does not serve, rather than faking them", async () => {
    const wired = createServices({
      ...DEFAULT_RUNTIME_CONFIG,
      dataSource: "api",
      apiBaseUrl: BASE,
    });

    // mock 을 그대로 두면 그럴듯한 가짜 그래프·대화·가이드를 진짜처럼 보여 준다.
    const asked = [
      wired.graph.getProjectGraph("p-1"),
      wired.refresh.current("p-1"),
      wired.chat.sessions("p-1"),
      wired.help.guides(),
    ];

    for (const promise of asked) {
      const error = await promise.catch((cause: unknown) => cause);
      expect(isServiceError(error) && error.code).toBe("unavailable");
    }
    // 요청을 보내지도 않는다. 서버에 그 경로가 없다.
    expect(calls).toHaveLength(0);
  });

  it("moves the ports the server does serve onto HTTP", () => {
    const wired = createServices({
      ...DEFAULT_RUNTIME_CONFIG,
      dataSource: "api",
      apiBaseUrl: BASE,
    });
    const mock = createServices(DEFAULT_RUNTIME_CONFIG);

    // 옮긴 포트는 다른 구현이고,
    expect(wired.projects).not.toBe(mock.projects);
    expect(wired.files).not.toBe(mock.files);
    expect(wired.documents).not.toBe(mock.documents);
    expect(wired.search).not.toBe(mock.search);
    // 아직 서버에 없는 포트는 mock 그대로다. 그래서 화면 전체가 계속 동작한다.
    expect(wired.memos).not.toBe(mock.memos);
    expect(wired.workspaceState).not.toBe(mock.workspaceState);
    expect(wired.auth).not.toBe(mock.auth);
    expect(wired.account).not.toBe(mock.account);
    // 서버에 없는 포트는 mock 이 아니다. 거절하는 구현으로 바뀐다.
    expect(wired.chat).not.toBe(mock.chat);
    expect(wired.graph).not.toBe(mock.graph);
    expect(wired.refresh).not.toBe(mock.refresh);
    expect(wired.help).not.toBe(mock.help);
  });

  it("stays on mock when the base url is missing, rather than requesting nowhere", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const wired = createServices({
      ...DEFAULT_RUNTIME_CONFIG,
      dataSource: "api",
    });

    expect(wired.projects).toBe(
      createServices(DEFAULT_RUNTIME_CONFIG).projects,
    );
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("memos", () => {
  const apiMemo = {
    id: "m-1",
    project_id: "p-1",
    scope: "project" as const,
    document_id: null,
    title: null,
    body: "작품 메모",
    created_at: "2026-09-26T00:00:00Z",
    updated_at: "2026-09-26T00:00:00Z",
  };

  it("asks for the scope and fills the title the server may omit", async () => {
    reply(200, { memos: [apiMemo] });
    const [memo] = await services().memos!.list("p-1", "project");

    expect(calls[0].url).toBe(`${BASE}/projects/p-1/memos?scope=project`);
    // 화면 모델의 title 은 문자열이다. 서버가 비워 둔 값을 여기서 메운다.
    expect(memo).toMatchObject({ title: "", body: "작품 메모", fileId: null });
  });

  it("carries the document only for file memos", async () => {
    reply(200, { memos: [] });
    await services().memos!.list("p-1", "file", "d-2");
    expect(calls[0].url).toBe(
      `${BASE}/projects/p-1/memos?scope=file&document_id=d-2`,
    );

    reply(200, { memos: [] });
    await services().memos!.list("p-1", "project", "d-2");
    // scope=project 에 document_id 를 실으면 서버가 무엇을 달라는지 알 수 없다.
    expect(calls[1].url).toBe(`${BASE}/projects/p-1/memos?scope=project`);
  });

  it("sends null for the document when the memo belongs to the project", async () => {
    reply(201, apiMemo);
    await services().memos!.create({
      projectId: "p-1",
      scope: "project",
      fileId: "d-2",
      body: "새 메모",
    });

    expect(calls[0].body).toEqual({
      scope: "project",
      document_id: null,
      body: "새 메모",
    });
  });

  it("updates and removes by memo id", async () => {
    reply(200, { ...apiMemo, body: "고침" });
    await services().memos!.update("m-1", "고침");
    expect(calls[0].url).toBe(`${BASE}/memos/m-1`);
    expect(calls[0].method).toBe("PATCH");

    reply(204);
    await services().memos!.remove("m-1");
    expect(calls[1].method).toBe("DELETE");
  });
});

describe("workspace state", () => {
  it("treats a first visit as nothing to restore rather than an error", async () => {
    reply(200, { layout: null });
    expect(await services().workspaceState!.load("p-1")).toBeNull();
  });

  it("round-trips the layout without reshaping it", async () => {
    const layout = { sidebarOpen: true, panes: [{ activeTabId: "t1" }] };

    reply(200, { layout });
    expect(await services().workspaceState!.load("p-1")).toEqual(layout);

    reply(204);
    await services().workspaceState!.save("p-1", layout as never);
    expect(calls[1].method).toBe("PUT");
    expect(calls[1].body).toEqual({ layout });
  });
});

describe("auth", () => {
  const profile = { id: "u-1", display_name: "서윤", email: "a@b.c" };

  it("asks the server who is signed in, because the cookie cannot be read", async () => {
    reply(200, profile);
    const user = await services().auth!.getSession();

    expect(calls[0].url).toBe(`${BASE}/auth/users/me`);
    expect(user).toMatchObject({ displayName: "서윤" });
  });

  it("reports nobody signed in rather than failing", async () => {
    // 로그인하지 않은 상태는 오류가 아니다. 화면은 null 을 받아 로그인 화면을 보여 준다.
    reply(401, { code: "ACCESS_TOKEN_MISSING" });
    // 토큰이 아예 없는 것과 만료된 것을 401 코드로 구별할 수 없으므로 재발급을 한 번 시도한다.
    reply(401, { code: "INVALID_REFRESH_TOKEN" });
    expect(await services().auth!.getSession()).toBeNull();
  });

  it("still reports a real failure", async () => {
    reply(503, { code: "CONTENT_UNAVAILABLE" });
    const error = await services()
      .auth!.getSession()
      .catch((cause: unknown) => cause);
    expect(isServiceError(error) && error.code).toBe("network");
  });

  it("navigates for login and never finishes, so the caller cannot cancel it", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });

    const started = services().auth!.startGoogleLogin("/workspace");
    // `assign` 은 이동을 예약할 뿐이다. 이 프로미스가 풀리면 호출자가 다음 줄에서 클라이언트
    // 라우팅을 해 **그 이동을 취소한다** — 화면이 "Google 로그인으로 이동 중" 에서 멈춘다.
    const settled = await Promise.race([
      started.then(() => "settled"),
      new Promise((resolve) => setTimeout(() => resolve("still going"), 20)),
    ]);

    // fetch 로 부르면 302 를 브라우저가 따라가지 않아 Google 로 가지 못한다.
    expect(assign).toHaveBeenCalledWith(`${BASE}/auth/oauth/google/prepare`);
    expect(calls).toHaveLength(0);
    expect(settled).toBe("still going");
  });

  it("changes only the display name on the account", async () => {
    reply(200, { ...profile, display_name: "새 이름" });
    await services().account!.updateDisplayName("새 이름");

    expect(calls[0].method).toBe("PATCH");
    expect(calls[0].body).toEqual({ display_name: "새 이름" });
  });
});

describe("data source override", () => {
  it("switches on ?data= so the deployed default does not have to change", () => {
    const base = { ...DEFAULT_RUNTIME_CONFIG, apiBaseUrl: BASE };

    window.history.replaceState({}, "", "/workspace/?data=api");
    expect(applyDataSourceOverride(base).dataSource).toBe("api");

    window.history.replaceState({}, "", "/workspace/?data=mock");
    expect(
      applyDataSourceOverride({ ...base, dataSource: "api" }).dataSource,
    ).toBe("mock");

    // 모르는 값은 무시한다. 오타가 조용히 출처를 바꾸면 안 된다.
    window.sessionStorage.clear();
    window.history.replaceState({}, "", "/workspace/?data=nonsense");
    expect(applyDataSourceOverride(base).dataSource).toBe("mock");

    window.history.replaceState({}, "", "/workspace/");
  });

  it("survives the Google login round trip, which returns without the query", () => {
    const base = { ...DEFAULT_RUNTIME_CONFIG, apiBaseUrl: BASE };

    window.history.replaceState({}, "", "/workspace/?data=api");
    expect(applyDataSourceOverride(base).dataSource).toBe("api");

    // BFF 는 고정된 /login?result=success 로 돌려보낸다. 쿼리만 믿으면 여기서 mock 으로 떨어지고,
    // 실제 계정으로 로그인했는데 화면은 mock 씨앗 사용자를 보여 준다.
    window.history.replaceState({}, "", "/login/?result=success");
    expect(applyDataSourceOverride(base).dataSource).toBe("api");

    window.history.replaceState({}, "", "/workspace/");
  });

  it("goes back to mock when asked, and forgets the override", () => {
    const base = { ...DEFAULT_RUNTIME_CONFIG, apiBaseUrl: BASE };

    window.history.replaceState({}, "", "/workspace/?data=api");
    applyDataSourceOverride(base);
    window.history.replaceState({}, "", "/workspace/?data=mock");
    expect(applyDataSourceOverride(base).dataSource).toBe("mock");

    window.history.replaceState({}, "", "/workspace/");
    expect(applyDataSourceOverride(base).dataSource).toBe("mock");
  });
});
