import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isServiceError } from "../errors";

import { createApiServices } from ".";

/**
 * 대표 이미지는 BFF 와 S3 를 오간다. 공용 테스트의 fetch 흉내는 본문을 JSON 으로만 읽어서, S3 로 가는
 * Blob 본문을 따로 받는다.
 */
const BASE = "https://api.test.invalid";
const S3 = "https://bucket.s3.test.invalid/projects/p-1/images/i-1.webp?sig=1";
const URL_OF_IMAGE = "https://media.test.invalid/projects/p-1/images/i-1.webp";

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
      body:
        init.body instanceof Blob
          ? init.body
          : init.body
            ? JSON.parse(String(init.body))
            : undefined,
    });
    const next = responses.shift();
    if (!next) throw new Error(`unexpected request: ${init.method} ${input}`);
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

const apiDocument = (imageUrl: string | null) => ({
  id: "d-1",
  title: "레나 아르벨",
  folder_code: "CHARACTER",
  episode_id: null,
  rank: "a0",
  locked: false,
  refresh_locked: false,
  char_count: 0,
  revision_no: 3,
  image_url: imageUrl,
  trashed_at: null,
  updated_at: "2026-10-27T00:00:00Z",
});

/** 트리를 한 번 읽어야 어댑터가 문서의 프로젝트를 안다. 화면도 언제나 트리를 먼저 읽는다 */
async function filesWithTree() {
  const files = createApiServices(BASE).files!;
  reply(200, {
    folders: [{ code: "CHARACTER", name: "캐릭터", position: 20 }],
    episodes: [],
    documents: [apiDocument(URL_OF_IMAGE)],
  });
  const nodes = await files.tree("p-1");
  calls = [];
  return { files, nodes };
}

describe("document image", () => {
  it("carries the image address on tree documents", async () => {
    const { nodes } = await filesWithTree();
    expect(nodes.find((node) => node.id === "d-1")).toMatchObject({
      imageUrl: URL_OF_IMAGE,
    });
  });

  it("carries the image address on relationship map nodes", async () => {
    reply(200, {
      nodes: [
        {
          id: "d-1",
          title: "레나 아르벨",
          folder_code: "CHARACTER",
          description: "",
          image_url: URL_OF_IMAGE,
        },
        {
          id: "d-2",
          title: "북쪽 온실",
          folder_code: "LOCATION",
          description: "",
          image_url: null,
        },
      ],
      edges: [],
      episodes: [],
    });
    const graph = await createApiServices(BASE).graph!.getProjectGraph("p-1");
    expect(graph.nodes.map((node) => node.imageUrl)).toEqual([
      URL_OF_IMAGE,
      null,
    ]);
  });

  it("uploads straight to storage, confirms it, then attaches it", async () => {
    const { files } = await filesWithTree();
    const image = new Blob(["webp"], { type: "image/webp" });
    reply(201, {
      image_id: "i-1",
      upload_url: S3,
      method: "PUT",
      headers: { "Content-Type": "image/webp", "Content-Length": "4" },
    });
    reply(200);
    reply(200, { image_id: "i-1", status: "COMMITTED" });
    reply(200, apiDocument(URL_OF_IMAGE));

    const node = await files.setImage("d-1", image);

    expect(calls.map((call) => `${call.method} ${call.url}`)).toEqual([
      `POST ${BASE}/projects/p-1/images`,
      `PUT ${S3}`,
      `POST ${BASE}/projects/p-1/images/i-1/complete`,
      `PUT ${BASE}/files/d-1/image`,
    ]);
    expect(calls[0].body).toEqual({
      file_name: "image.webp",
      content_type: "image/webp",
      size_bytes: 4,
    });
    // S3 는 다른 출처다. 쿠키·CSRF 헤더를 싣지 않고, Content-Length 는 브라우저가 정한다.
    expect(calls[1].credentials).toBe("omit");
    expect(calls[1].headers).toEqual({ "Content-Type": "image/webp" });
    expect(calls[1].body).toBe(image);
    expect(calls[3].body).toEqual({ image_id: "i-1" });
    expect(node).toMatchObject({ id: "d-1", imageUrl: URL_OF_IMAGE });
  });

  it("does not attach an image storage refused", async () => {
    const { files } = await filesWithTree();
    reply(201, {
      image_id: "i-1",
      upload_url: S3,
      method: "PUT",
      headers: { "Content-Type": "image/webp" },
    });
    reply(403);

    const error = await files
      .setImage("d-1", new Blob(["webp"], { type: "image/webp" }))
      .catch((cause: unknown) => cause);

    expect(isServiceError(error)).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it("removes the image", async () => {
    const { files } = await filesWithTree();
    reply(204);

    await files.clearImage("d-1");

    expect(calls[0]).toMatchObject({
      method: "DELETE",
      url: `${BASE}/files/d-1/image`,
      headers: { "X-LS-CSRF": "1" },
    });
  });
});
