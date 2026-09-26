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
  it("keeps mock ports for everything the server does not serve yet", () => {
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
    // 아직 서버에 없는 포트는 mock 그대로다. 그래서 화면 전체가 계속 동작한다.
    expect(wired.chat).toBe(mock.chat);
    expect(wired.graph).toBe(mock.graph);
    expect(wired.refresh).toBe(mock.refresh);
    expect(wired.help).toBe(mock.help);
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
    expect(await services().auth!.getSession()).toBeNull();
  });

  it("still reports a real failure", async () => {
    reply(503, { code: "CONTENT_UNAVAILABLE" });
    const error = await services()
      .auth!.getSession()
      .catch((cause: unknown) => cause);
    expect(isServiceError(error) && error.code).toBe("network");
  });

  it("navigates for login instead of fetching it", async () => {
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });

    await services().auth!.startGoogleLogin("/workspace");

    // fetch 로 부르면 302 를 브라우저가 따라가지 않아 Google 로 가지 못한다.
    expect(assign).toHaveBeenCalledWith(`${BASE}/auth/oauth/google/prepare`);
    expect(calls).toHaveLength(0);
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
    window.history.replaceState({}, "", "/workspace/?data=nonsense");
    expect(applyDataSourceOverride(base).dataSource).toBe("mock");

    window.history.replaceState({}, "", "/workspace/");
  });
});
