import { bodyToPlainText } from "@/domain/document-body";
import type {
  ChatAvailability,
  ChatCitation,
  ChatMessage,
  ChatSearchHit,
  ChatSession,
  ChatUsage,
} from "@/domain/models";
import { t } from "@/i18n";

import { ServiceError } from "../errors";
import type { ChatSendInput, ChatService, ChatStreamHandlers } from "../ports";

import { chatPreview, chatTitle, compileChatMarkup } from "./chat-markup";
import { simulate } from "./control";
import { getDb, isDocumentNode, nextId, persistDb, type MockDb } from "./db";
import { SEED } from "./seed-world";
import { activeFiles } from "./tree";

export const CHAT_CONTEXT_LIMIT = 1_400_000;

const GATHER_MS = 900;
const READ_MS = 2600;

let limitOverride: number | null = null;

export function setMockChatLimit(limit: number | null) {
  limitOverride = limit;
}

function contextLimit() {
  if (limitOverride !== null) return limitOverride;
  if (typeof window !== "undefined") {
    const fromUrl = Number(
      new URLSearchParams(window.location.search).get("chatLimit"),
    );
    if (Number.isFinite(fromUrl) && fromUrl > 0) return fromUrl;
  }
  return CHAT_CONTEXT_LIMIT;
}

export const CHAT_DAILY_LIMIT = 450_000;
const TURN_CREDITS = 45_000;

let usedToday: number | null = null;

export function setMockChatUsage(used: number | null) {
  usedToday = used;
}

function used() {
  if (usedToday !== null) return usedToday;
  if (typeof window !== "undefined") {
    const ratio = Number(
      new URLSearchParams(window.location.search).get("chatUsage"),
    );
    if (Number.isFinite(ratio) && ratio > 0)
      return Math.round(Math.min(ratio, 1) * CHAT_DAILY_LIMIT);
  }
  return 0;
}

function nextMidnightInKorea(now = new Date()) {
  const korea = new Date(now.getTime() + 9 * 3_600_000);
  korea.setUTCHours(24, 0, 0, 0);
  return new Date(korea.getTime() - 9 * 3_600_000).toISOString();
}

function usageNow(): ChatUsage {
  return {
    used: used(),
    limit: CHAT_DAILY_LIMIT,
    resetsAt: nextMidnightInKorea(),
  };
}

export function newSessionTitle() {
  return t("새 대화");
}

function projectDocs(db: MockDb, projectId: string) {
  return activeFiles(db, projectId).filter(isDocumentNode);
}

function projectMemos(db: MockDb, projectId: string) {
  const docs = new Set(projectDocs(db, projectId).map((doc) => doc.id));
  return db.memos.filter(
    (memo) =>
      memo.projectId === projectId &&
      (memo.fileId === null || docs.has(memo.fileId)),
  );
}

function projectSize(db: MockDb, projectId: string) {
  const docs = projectDocs(db, projectId);
  const documents = docs.reduce((sum, doc) => {
    const stored = db.documents[doc.id];
    const properties = (stored?.properties ?? []).reduce(
      (inner, property) =>
        inner + (property.kind === "text" ? property.value.length : 0),
      0,
    );
    return (
      sum +
      doc.title.length +
      (stored ? bodyToPlainText(stored.body).length : 0) +
      properties
    );
  }, 0);
  const memos = projectMemos(db, projectId).reduce(
    (sum, memo) => sum + memo.title.length + memo.body.length,
    0,
  );
  return documents + memos;
}

function sessionOf(db: MockDb, sessionId: string) {
  const session = db.chatSessions.find((s) => s.id === sessionId);
  if (!session)
    throw new ServiceError("not-found", t("대화를 찾을 수 없어요."));
  return session;
}

function excerpt(text: string, max: number) {
  const flat = text
    .replace(/[[\]|]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

function answerMarkup(input: ChatSendInput) {
  const chat = SEED.chat;
  if (input.quote) {
    const cite = `[[doc:${input.quote.title}|${excerpt(input.quote.text, 120)}]]`;
    const template =
      input.quote.title === chat.quotedChapter
        ? chat.quoted[input.intent]
        : chat.quotedOther;
    return template
      .replaceAll("{cite}", cite)
      .replaceAll("{title}", input.quote.title);
  }
  const question = input.content.toLocaleLowerCase();
  const script = chat.scripts.find((candidate) =>
    candidate.keywords.some((keyword) => question.includes(keyword)),
  );
  return script?.answer ?? chat.fallback;
}

function abortError() {
  return new DOMException(t("응답 생성을 중단했어요."), "AbortError");
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(abortError());
    const timer = setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(abortError());
      },
      { once: true },
    );
  });
}

function pieces(content: string) {
  const out: string[] = [];
  for (const part of content.split(/(\[\[\d+\]\])/)) {
    if (/^\[\[\d+\]\]$/.test(part)) {
      out.push(part);
      continue;
    }
    const chars = [...part];
    for (let i = 0; i < chars.length;) {
      const size = 2 + Math.floor(Math.random() * 5);
      out.push(chars.slice(i, i + size).join(""));
      i += size;
    }
  }
  return out;
}

async function stream(
  content: string,
  citations: ChatCitation[],
  mapSize: number,
  handlers: ChatStreamHandlers,
  signal: AbortSignal,
) {
  handlers.onPhase("gathering");
  await wait(GATHER_MS, signal);
  handlers.onPhase("reading");
  handlers.onActivity({ kind: "map", documents: mapSize });
  handlers.onActivity({ kind: "think", step: 1, mustAnswer: false });
  await wait(READ_MS * 0.3, signal);
  const read = citations.filter(
    (citation, index) =>
      citations.findIndex((other) => other.title === citation.title) === index,
  );
  handlers.onActivity({
    kind: "read",
    step: 1,
    skipped: 0,
    documents: read.map((citation) => ({
      title: citation.title,
      docType: citation.kind === "document" ? citation.docType : null,
    })),
  });
  await wait(READ_MS * 0.3, signal);
  handlers.onActivity({ kind: "think", step: 2, mustAnswer: false });
  await wait(READ_MS * 0.25, signal);
  handlers.onActivity({ kind: "review", step: 2 });
  await wait(READ_MS * 0.15, signal);
  handlers.onActivity({
    kind: "reviewed",
    step: 2,
    passed: true,
    missing: [],
    problems: 0,
  });
  handlers.onPhase("writing");
  for (const piece of pieces(content)) {
    const marker = /^\[\[(\d+)\]\]$/.exec(piece);
    if (marker) {
      const index = Number(marker[1]);
      handlers.onCitation(index, citations[index - 1]);
    }
    handlers.onDelta(piece);
    await wait(38 + Math.random() * 40, signal);
  }
}

function searchText(message: ChatMessage) {
  const quote = message.quote?.text ?? "";
  const body = message.content.replace(/\[\[(\d+)\]\]/g, (_, index) => {
    const citation = message.citations[Number(index) - 1];
    return citation ? ` ${citation.title} ` : "";
  });
  return `${quote} ${body}`.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
}

function snippetAround(text: string, at: number, length: number) {
  const start = Math.max(0, at - 16);
  const end = Math.min(text.length, at + length + 40);
  return {
    before: `${start > 0 ? "…" : ""}${text.slice(start, at)}`,
    match: text.slice(at, at + length),
    after: `${text.slice(at + length, end)}${end < text.length ? "…" : ""}`,
  };
}

export const mockChat: ChatService = {
  availability: (projectId) =>
    simulate("chat.availability", (): ChatAvailability => {
      const size = projectSize(getDb(), projectId);
      const limit = contextLimit();
      return {
        status: size > limit ? "too-large" : "available",
        size,
        limit,
      };
    }),
  usage: () => simulate("chat.usage", usageNow),
  sessions: (projectId) =>
    simulate("chat.sessions", () =>
      getDb()
        .chatSessions.filter((s) => s.projectId === projectId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    ),
  search: (projectId, query) =>
    simulate("chat.search", (): ChatSearchHit[] => {
      const db = getDb();
      const needle = query.trim().toLocaleLowerCase();
      if (!needle) return [];
      const hits: Array<ChatSearchHit & { rank: number }> = [];
      for (const session of db.chatSessions) {
        if (session.projectId !== projectId) continue;
        const inTitle = session.title.toLocaleLowerCase().includes(needle);
        let snippet: ChatSearchHit["snippet"] = null;
        for (const message of db.chatMessages) {
          if (message.sessionId !== session.id) continue;
          const text = searchText(message);
          const at = text.toLocaleLowerCase().indexOf(needle);
          if (at >= 0) {
            snippet = snippetAround(text, at, needle.length);
            break;
          }
        }
        if (inTitle || snippet)
          hits.push({ session, snippet, rank: inTitle ? 0 : 1 });
      }
      return hits
        .sort(
          (a, b) =>
            a.rank - b.rank ||
            b.session.updatedAt.localeCompare(a.session.updatedAt),
        )
        .map(({ session, snippet }) => ({ session, snippet }));
    }),
  createSession: (projectId) =>
    simulate("chat.create", () => {
      const session: ChatSession = {
        id: nextId("chat"),
        projectId,
        title: newSessionTitle(),
        updatedAt: new Date().toISOString(),
        preview: "",
      };
      getDb().chatSessions.push(session);
      persistDb();
      return session;
    }),
  renameSession: (sessionId, title) =>
    simulate("chat.rename", () => {
      const trimmed = title.trim();
      if (!trimmed)
        throw new ServiceError("validation", t("대화 이름을 입력해 주세요."));
      const session = sessionOf(getDb(), sessionId);
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
  send: async (sessionId, input, handlers, signal) => {
    const db = getDb();
    const question = await simulate("chat.send", () => {
      if (used() >= CHAT_DAILY_LIMIT)
        throw new ServiceError("busy", t("오늘 AI 챗 사용량을 다 썼어요."));
      const session = sessionOf(db, sessionId);
      if (input.replaces) {
        const from = db.chatMessages.findIndex(
          (m) => m.id === input.replaces && m.sessionId === sessionId,
        );
        if (from < 0)
          throw new ServiceError("not-found", t("고칠 질문을 찾을 수 없어요."));
        const removed = new Set(
          db.chatMessages
            .filter(
              (m) =>
                m.sessionId === sessionId &&
                m.createdAt >= db.chatMessages[from].createdAt,
            )
            .map((m) => m.id),
        );
        db.chatMessages = db.chatMessages.filter((m) => !removed.has(m.id));
      }
      const first = !db.chatMessages.some((m) => m.sessionId === sessionId);
      const asked: ChatMessage = {
        id: nextId("msg"),
        sessionId,
        role: "user",
        content: input.content,
        intent: input.intent,
        quote: input.quote,
        citations: [],
        createdAt: new Date().toISOString(),
      };
      db.chatMessages.push(asked);
      if (first && session.title === newSessionTitle())
        session.title = chatTitle(input.content || input.quote?.text || "");
      session.updatedAt = asked.createdAt;
      persistDb();
      return asked;
    });
    const projectId = sessionOf(db, sessionId).projectId;
    const { content, citations } = compileChatMarkup(
      answerMarkup(input),
      projectDocs(db, projectId),
      projectMemos(db, projectId),
    );
    await stream(
      content,
      citations,
      projectDocs(db, projectId).length + projectMemos(db, projectId).length,
      handlers,
      signal,
    );
    const answer: ChatMessage = {
      id: nextId("msg"),
      sessionId,
      role: "assistant",
      content,
      intent: null,
      quote: null,
      citations,
      createdAt: new Date(
        Math.max(Date.now(), Date.parse(question.createdAt) + 1),
      ).toISOString(),
    };
    db.chatMessages.push(answer);
    const session = db.chatSessions.find((s) => s.id === sessionId);
    if (session) {
      session.updatedAt = answer.createdAt;
      session.preview = chatPreview(content, citations);
    }
    persistDb();
    usedToday = used() + TURN_CREDITS;
    return structuredClone({ question, answer, usage: usageNow() });
  },
};
