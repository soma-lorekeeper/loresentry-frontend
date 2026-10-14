import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatSendInput } from "../ports";

import { mockChat, setMockChatLimit } from "./chat";
import { clearMockRules, setMockLatency } from "./control";
import { GLASS_GARDEN_ID, resetDb } from "./db";

const quiet = { onPhase() {}, onCitation() {}, onDelta() {} };

const ask = (content: string): ChatSendInput => ({
  content,
  intent: "ask",
  quote: null,
  focusFileId: null,
  replaces: null,
});

async function settle<T>(promise: Promise<T>) {
  await vi.runAllTimersAsync();
  return promise;
}

describe("mock chat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetDb();
    clearMockRules();
    setMockLatency(0);
  });

  afterEach(() => {
    setMockChatLimit(null);
    vi.useRealTimers();
  });

  it("says whether the whole story fits in one read", async () => {
    const fits = await settle(mockChat.availability(GLASS_GARDEN_ID));
    expect(fits.status).toBe("available");

    setMockChatLimit(10);
    const tooBig = await settle(mockChat.availability(GLASS_GARDEN_ID));
    expect(tooBig).toMatchObject({ status: "too-large", limit: 10 });
    expect(tooBig.size).toBeGreaterThan(10);
  });

  it("streams the phases, sends each citation before its marker and keeps the answer", async () => {
    const session = await settle(mockChat.createSession(GLASS_GARDEN_ID));
    const events: string[] = [];
    const turn = await settle(
      mockChat.send(
        session.id,
        ask("주요 인물과 연결된 설정을 정리해 줘"),
        {
          onPhase: (phase) => events.push(`phase:${phase}`),
          onCitation: (index) => events.push(`cite:${index}`),
          onDelta: (text) => {
            const marker = /^\[\[(\d+)\]\]$/.exec(text);
            if (marker) events.push(`marker:${marker[1]}`);
          },
        },
        new AbortController().signal,
      ),
    );

    expect(events.slice(0, 3)).toEqual([
      "phase:gathering",
      "phase:reading",
      "phase:writing",
    ]);
    expect(events.indexOf("cite:1")).toBeLessThan(events.indexOf("marker:1"));
    expect(turn.answer.content).toContain("[[1]]");
    expect(turn.answer.citations[0]).toMatchObject({
      kind: "document",
      title: "레나 아르벨",
    });

    const sessions = await settle(mockChat.sessions(GLASS_GARDEN_ID));
    const saved = sessions.find((s) => s.id === session.id)!;
    expect(saved.title).toBe("주요 인물과 연결된 설정을 정리해 줘");
    expect(saved.preview).toMatch(/^주요 인물 가운데 레나 아르벨에 이어 둔/);
  });

  it("cites project notes apart from the documents", async () => {
    const session = await settle(mockChat.createSession(GLASS_GARDEN_ID));
    const turn = await settle(
      mockChat.send(
        session.id,
        ask("가장 최근 회차에서 무슨 일이 있었어?"),
        quiet,
        new AbortController().signal,
      ),
    );
    expect(turn.answer.citations.some((c) => c.kind === "memo")).toBe(true);
  });

  it("keeps the question but not an unfinished answer when stopped", async () => {
    const session = await settle(mockChat.createSession(GLASS_GARDEN_ID));
    const controller = new AbortController();
    const outcome = mockChat
      .send(session.id, ask("레나는 누구야?"), quiet, controller.signal)
      .catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(1200);
    controller.abort();

    expect((await outcome) as DOMException).toMatchObject({
      name: "AbortError",
    });
    const messages = await settle(mockChat.messages(session.id));
    expect(messages.map((m) => m.role)).toEqual(["user"]);
  });

  it("replaces the last question and its answer when the question is edited", async () => {
    const sessionId = `${GLASS_GARDEN_ID}:chat-door`;
    await settle(
      mockChat.send(
        sessionId,
        { ...ask("북쪽 문 앞에는 무엇이 있었어?"), replaces: `${sessionId}:q` },
        quiet,
        new AbortController().signal,
      ),
    );
    const messages = await settle(mockChat.messages(sessionId));
    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({
      role: "user",
      content: "북쪽 문 앞에는 무엇이 있었어?",
    });
  });

  it("answers a quoted passage by its intent", async () => {
    const session = await settle(mockChat.createSession(GLASS_GARDEN_ID));
    const turn = await settle(
      mockChat.send(
        session.id,
        {
          content: "이 부분과 관련된 설정을 알려 줘",
          intent: "related",
          quote: {
            fileId: `${GLASS_GARDEN_ID}:ch-12`,
            title: "12화 · 균열의 밤",
            docType: "manuscript",
            text: "서윤은 등불을 바닥에 내려놓고 천천히 문을 밀었다.",
          },
          focusFileId: null,
          replaces: null,
        },
        quiet,
        new AbortController().signal,
      ),
    );
    expect(turn.question.quote?.title).toBe("12화 · 균열의 밤");
    expect(turn.answer.citations.map((c) => c.title)).toEqual(
      expect.arrayContaining(["12화 · 균열의 밤", "북쪽 온실", "낡은 열쇠"]),
    );
  });

  it("finds conversations by their title and by what was said", async () => {
    const hits = await settle(mockChat.search(GLASS_GARDEN_ID, "항해"));
    expect(hits[0].session.id).toBe(`${GLASS_GARDEN_ID}:chat-lena`);
    expect(hits[0].snippet?.match).toBe("항해");
    const byTitle = await settle(mockChat.search(GLASS_GARDEN_ID, "제목 후보"));
    expect(byTitle.map((hit) => hit.session.title)).toContain("12화 제목 후보");
  });
});
