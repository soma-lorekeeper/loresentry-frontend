import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isServiceError } from "../errors";
import type { ChatSendInput } from "../ports";

import { createApiChat } from "./chat";
import { ApiClient } from "./http";

const BASE = "https://api.test.invalid";

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

type Reply = Response | ((signal?: AbortSignal | null) => Response);

let calls: Call[];
let replies: Reply[];

beforeEach(() => {
  calls = [];
  replies = [];
  vi.stubGlobal("fetch", (input: string, init: RequestInit = {}) => {
    calls.push({
      url: String(input),
      method: init.method ?? "GET",
      headers: (init.headers ?? {}) as Record<string, string>,
      body: init.body ? JSON.parse(String(init.body)) : undefined,
    });
    const next = replies.shift();
    if (!next) throw new Error(`unexpected request: ${input}`);
    return Promise.resolve(
      typeof next === "function" ? next(init.signal) : next,
    );
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sse(chunks: string[], hold = false) {
  return (signal?: AbortSignal | null) =>
    new Response(
      new ReadableStream({
        start(controller) {
          const encoder = new TextEncoder();
          for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
          if (!hold) controller.close();
          signal?.addEventListener("abort", () =>
            controller.error(new DOMException("aborted", "AbortError")),
          );
        },
      }),
      { status: 200, headers: { "Content-Type": "text/event-stream" } },
    );
}

const chat = () => createApiChat(new ApiClient(BASE));

const input: ChatSendInput = {
  content: "북쪽 문은 누가 열었어?",
  intent: "explain",
  quote: {
    fileId: "f-12",
    title: "12화 · 균열의 밤",
    docType: "manuscript",
    text: "문을 밀었다",
  },
  replaces: null,
};

const question = {
  id: "q-1",
  session_id: "s-1",
  role: "user",
  content: "북쪽 문은 누가 열었어?",
  intent: "explain",
  quote: {
    file_id: "f-12",
    title: "12화 · 균열의 밤",
    doc_type: "manuscript",
    text: "문을 밀었다",
  },
  citations: [],
  created_at: "2026-10-14T03:00:00.000Z",
};

const citation = {
  kind: "document",
  file_id: "f-12",
  title: "12화 · 균열의 밤",
  doc_type: "manuscript",
  quote: "문을 밀었다",
};

const answer = {
  id: "a-1",
  session_id: "s-1",
  role: "assistant",
  content: "서윤이에요. [[1]]",
  intent: null,
  quote: null,
  citations: [
    citation,
    { kind: "memo", memo_id: "m-1", title: "균열", quote: null },
  ],
  created_at: "2026-10-14T03:00:05.000Z",
};

function handlers() {
  const seen: string[] = [];
  return {
    seen,
    onPhase: (phase: string) => seen.push(`phase:${phase}`),
    onCitation: (index: number, value: { title: string }) =>
      seen.push(`citation:${index}:${value.title}`),
    onDelta: (text: string) => seen.push(`delta:${text}`),
    onActivity: (activity: { kind: string }) =>
      seen.push(`activity:${activity.kind}`),
  };
}

describe("chat over the API", () => {
  it("reads today's usage and the usage that comes with a finished answer", async () => {
    const usage = {
      used: 120_000,
      limit: 450_000,
      resets_at: "2026-10-22T15:00:00Z",
    };
    replies.push(json(200, usage));
    replies.push(
      sse([
        `event: done\ndata: ${JSON.stringify({ question, answer, usage })}\n\n`,
      ]),
    );

    expect(await chat().usage()).toEqual({
      used: 120_000,
      limit: 450_000,
      resetsAt: "2026-10-22T15:00:00Z",
    });
    const turn = await chat().send(
      "s-1",
      input,
      handlers(),
      new AbortController().signal,
    );

    expect(calls[0].url).toBe(`${BASE}/chat/usage`);
    expect(turn.usage).toEqual({
      used: 120_000,
      limit: 450_000,
      resetsAt: "2026-10-22T15:00:00Z",
    });
  });

  it("turns a used-up day into a readable error", async () => {
    replies.push(
      json(429, {
        code: "CHAT_DAILY_LIMIT_REACHED",
        message: "x",
        next_action: "NONE",
      }),
    );

    const error = await chat()
      .send("s-1", input, handlers(), new AbortController().signal)
      .catch((caught: unknown) => caught);

    expect(isServiceError(error) && error.message).toBe(
      "오늘 AI 챗 사용량을 다 썼어요.",
    );
  });

  it("streams events split across chunks and returns the saved turn", async () => {
    replies.push(
      sse([
        'event: phase\ndata: {"phase":"gathering"}\n\nevent: pha',
        'se\ndata: {"phase":"reading"}\n\n: ping\n\nevent: phase\ndata: {"phase":"writing"}\n\n',
        `event: citation\ndata: ${JSON.stringify({ index: 1, citation })}\n\n`,
        'event: delta\ndata: {"text":"서윤이에요. "}\n\nevent: delta\r\ndata: {"text":"[[1]]"}\r\n\r\n',
        `event: done\ndata: ${JSON.stringify({ question, answer })}\n\n`,
      ]),
    );
    const seen = handlers();

    const turn = await chat().send(
      "s-1",
      input,
      seen,
      new AbortController().signal,
    );

    expect(seen.seen).toEqual([
      "phase:gathering",
      "phase:reading",
      "phase:writing",
      "citation:1:12화 · 균열의 밤",
      "delta:서윤이에요. ",
      "delta:[[1]]",
    ]);
    expect(turn.question.quote).toEqual(input.quote);
    expect(turn.answer.citations).toEqual([
      {
        kind: "document",
        fileId: "f-12",
        title: "12화 · 균열의 밤",
        docType: "manuscript",
        quote: "문을 밀었다",
      },
      { kind: "memo", memoId: "m-1", title: "균열", quote: null },
    ]);
    expect(calls[0].url).toBe(`${BASE}/chat/sessions/s-1/messages`);
    expect(calls[0].method).toBe("POST");
    expect(calls[0].headers["X-LS-CSRF"]).toBe("1");
    expect(calls[0].body).toMatchObject({
      content: "북쪽 문은 누가 열었어?",
      intent: "explain",
      quote: {
        file_id: "f-12",
        title: "12화 · 균열의 밤",
        doc_type: "manuscript",
        text: "문을 밀었다",
      },
      replaces: null,
    });
    expect(
      (calls[0].body as { client_message_id: string }).client_message_id,
    ).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("turns an error event into a service error", async () => {
    replies.push(
      sse([
        'event: phase\ndata: {"phase":"gathering"}\n\n',
        'event: error\ndata: {"code":"CHAT_MODEL_UNAVAILABLE","message":"x"}\n\n',
      ]),
    );

    const failure = await chat()
      .send("s-1", input, handlers(), new AbortController().signal)
      .catch((error: unknown) => error);

    expect(isServiceError(failure) && failure.code).toBe("network");
  });

  it("reports a refusal before streaming with its code", async () => {
    replies.push(
      json(409, {
        code: "CHAT_ANSWER_IN_PROGRESS",
        message: "x",
        next_action: "NONE",
      }),
    );

    const failure = await chat()
      .send("s-1", input, handlers(), new AbortController().signal)
      .catch((error: unknown) => error);

    expect(isServiceError(failure) && failure.code).toBe("busy");
  });

  it("treats a stream that ends without an answer as a dropped connection", async () => {
    replies.push(sse(['event: phase\ndata: {"phase":"gathering"}\n\n']));

    const failure = await chat()
      .send("s-1", input, handlers(), new AbortController().signal)
      .catch((error: unknown) => error);

    expect(isServiceError(failure) && failure.code).toBe("network");
  });

  it("stops the server's answer when the author stops", async () => {
    replies.push(sse(['event: phase\ndata: {"phase":"gathering"}\n\n'], true));
    replies.push(new Response(null, { status: 204 }));
    const controller = new AbortController();
    const seen = handlers();

    const pending = chat()
      .send("s-1", input, seen, controller.signal)
      .catch((error: unknown) => error);
    await vi.waitFor(() => expect(seen.seen).toEqual(["phase:gathering"]));
    controller.abort();
    const failure = await pending;

    expect(failure).toBeInstanceOf(DOMException);
    expect((failure as DOMException).name).toBe("AbortError");
    await vi.waitFor(() =>
      expect(calls[1]).toMatchObject({
        url: `${BASE}/chat/sessions/s-1/cancel`,
        method: "POST",
      }),
    );
  });

  it("shows chat as not ready for people outside the allow list", async () => {
    replies.push(
      json(403, {
        code: "CHAT_NOT_ENABLED",
        message: "x",
        next_action: "NONE",
      }),
    );

    const failure = await chat()
      .availability("p-1")
      .catch((error: unknown) => error);

    expect(isServiceError(failure) && failure.code).toBe("unavailable");
  });

  it("maps sessions and search hits", async () => {
    const session = {
      id: "s-1",
      project_id: "p-1",
      title: "북쪽 문",
      updated_at: "2026-10-14T03:00:00.000Z",
      preview: "서윤이에요.",
    };
    replies.push(json(200, { sessions: [session] }));
    replies.push(
      json(200, {
        hits: [
          { session, snippet: { before: "", match: "북쪽", after: " 문" } },
        ],
      }),
    );

    expect(await chat().sessions("p-1")).toEqual([
      {
        id: "s-1",
        projectId: "p-1",
        title: "북쪽 문",
        updatedAt: "2026-10-14T03:00:00.000Z",
        preview: "서윤이에요.",
      },
    ]);
    const hits = await chat().search("p-1", "북쪽 문");
    expect(hits[0].snippet?.match).toBe("북쪽");
    expect(calls[1].url).toBe(
      `${BASE}/projects/p-1/chat/search?q=%EB%B6%81%EC%AA%BD+%EB%AC%B8`,
    );
  });
});
