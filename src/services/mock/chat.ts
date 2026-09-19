import type { ChatMessage, ChatSession } from "@/domain/models";

import { ServiceError } from "../errors";
import type { ChatService } from "../ports";

import { simulate } from "./control";
import { getDb, nextId, persistDb } from "./db";

const REPLIES = [
  "장면의 목적을 한 문장으로 먼저 정해 보세요. 그 문장에서 벗어나는 묘사를 덜어 내면 긴장이 한곳에 모입니다.",
  "인물이 무엇을 원하고 무엇이 그것을 막는지 대사보다 행동으로 먼저 보여 주면 좋겠습니다. 마지막 문장은 다음 장면의 질문으로 남겨 두세요.",
  "지금 열린 문서의 설정과 겹치는 표현이 있어요. 같은 사물을 부르는 이름을 하나로 맞추면 독자가 덜 헷갈립니다.",
];

const TOKEN_INTERVAL_MS = 45;

function abortError() {
  return new DOMException("응답 생성을 중단했어요.", "AbortError");
}

export const mockChat: ChatService = {
  sessions: (projectId) =>
    simulate("chat.sessions", () =>
      getDb()
        .chatSessions.filter((s) => s.projectId === projectId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    ),
  createSession: (projectId) =>
    simulate("chat.create", () => {
      const session: ChatSession = {
        id: nextId("chat"),
        projectId,
        title: "새 채팅",
        updatedAt: new Date().toISOString(),
      };
      getDb().chatSessions.push(session);
      persistDb();
      return session;
    }),
  renameSession: (sessionId, title) =>
    simulate("chat.rename", () => {
      const trimmed = title.trim();
      if (!trimmed)
        throw new ServiceError("validation", "세션 이름을 입력해 주세요.");
      const session = getDb().chatSessions.find((s) => s.id === sessionId);
      if (!session)
        throw new ServiceError("not-found", "대화를 찾을 수 없어요.");
      session.title = trimmed;
      persistDb();
      return session;
    }),
  deleteSession: (sessionId) =>
    simulate("chat.delete", () => {
      const db = getDb();
      db.chatSessions = db.chatSessions.filter((s) => s.id !== sessionId);
      db.chatMessages = db.chatMessages.filter(
        (m) => m.sessionId !== sessionId,
      );
      persistDb();
    }),
  messages: (sessionId) =>
    simulate("chat.messages", () =>
      getDb()
        .chatMessages.filter((m) => m.sessionId === sessionId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    ),
  send: async (sessionId, { content, contextFile }, handlers, signal) => {
    const db = getDb();
    const userMessage: ChatMessage = {
      id: nextId("msg"),
      sessionId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
      contextFile,
    };
    await simulate("chat.send", () => {
      db.chatMessages.push(userMessage);
      const session = db.chatSessions.find((s) => s.id === sessionId);
      if (session) {
        session.updatedAt = userMessage.createdAt;
        if (session.title === "새 채팅") session.title = content.slice(0, 18);
      }
      persistDb();
    });
    const reply = REPLIES[db.chatMessages.length % REPLIES.length];
    const tokens = reply.match(/\S+\s*/g) ?? [reply];
    for (const token of tokens) {
      if (signal.aborted) throw abortError();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, TOKEN_INTERVAL_MS);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(abortError());
          },
          { once: true },
        );
      });
      handlers.onToken(token);
    }
    const assistant: ChatMessage = {
      id: nextId("msg"),
      sessionId,
      role: "assistant",
      content: reply,
      createdAt: new Date().toISOString(),
      contextFile,
    };
    db.chatMessages.push(assistant);
    persistDb();
    return structuredClone(assistant);
  },
};
