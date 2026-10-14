import type {
  ChatAvailability,
  ChatCitation,
  ChatIntent,
  ChatMessage,
  ChatPhase,
  ChatQuote,
  ChatSearchHit,
  ChatSession,
} from "@/domain/models";
import type { DocumentType } from "@/domain/document-types";
import { t } from "@/i18n";

import { ServiceError } from "../errors";
import type { ChatService, ChatTurn } from "../ports";

import { toServiceError } from "./errors";
import type { ApiClient } from "./http";
import { query } from "./http";

interface ApiSession {
  id: string;
  project_id: string;
  title: string;
  updated_at: string;
  preview: string;
}

interface ApiQuote {
  file_id: string;
  title: string;
  doc_type: DocumentType;
  text: string;
}

type ApiCitation =
  | {
      kind: "document";
      file_id: string;
      title: string;
      doc_type: DocumentType;
      quote: string | null;
    }
  | { kind: "memo"; memo_id: string; title: string; quote: string | null };

interface ApiMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  intent: ChatIntent | null;
  quote: ApiQuote | null;
  citations: ApiCitation[];
  created_at: string;
}

interface ApiSearchHit {
  session: ApiSession;
  snippet: ChatSearchHit["snippet"];
}

function toSession(api: ApiSession): ChatSession {
  return {
    id: api.id,
    projectId: api.project_id,
    title: api.title,
    updatedAt: api.updated_at,
    preview: api.preview,
  };
}

function toQuote(api: ApiQuote | null): ChatQuote | null {
  return api
    ? {
        fileId: api.file_id,
        title: api.title,
        docType: api.doc_type,
        text: api.text,
      }
    : null;
}

function toCitation(api: ApiCitation): ChatCitation {
  return api.kind === "memo"
    ? {
        kind: "memo",
        memoId: api.memo_id,
        title: api.title,
        quote: api.quote,
      }
    : {
        kind: "document",
        fileId: api.file_id,
        title: api.title,
        docType: api.doc_type,
        quote: api.quote,
      };
}

function toMessage(api: ApiMessage): ChatMessage {
  return {
    id: api.id,
    sessionId: api.session_id,
    role: api.role,
    content: api.content,
    intent: api.intent,
    quote: toQuote(api.quote),
    citations: api.citations.map(toCitation),
    createdAt: api.created_at,
  };
}

function stopped() {
  return new DOMException(t("응답 생성을 중단했어요."), "AbortError");
}

export function createApiChat(client: ApiClient): ChatService {
  return {
    availability: (projectId) =>
      client.request<ChatAvailability>(
        `/projects/${projectId}/chat/availability`,
        { operation: "chat.availability" },
      ),

    sessions: async (projectId) =>
      (
        await client.request<{ sessions: ApiSession[] }>(
          `/projects/${projectId}/chat/sessions`,
          { operation: "chat.sessions" },
        )
      ).sessions.map(toSession),

    search: async (projectId, term) =>
      (
        await client.request<{ hits: ApiSearchHit[] }>(
          `/projects/${projectId}/chat/search${query({ q: term })}`,
          { operation: "chat.search" },
        )
      ).hits.map((hit) => ({
        session: toSession(hit.session),
        snippet: hit.snippet,
      })),

    createSession: async (projectId) =>
      toSession(
        await client.request<ApiSession>(
          `/projects/${projectId}/chat/sessions`,
          { method: "POST", operation: "chat.create" },
        ),
      ),

    renameSession: async (sessionId, title) =>
      toSession(
        await client.request<ApiSession>(`/chat/sessions/${sessionId}`, {
          method: "PATCH",
          body: { title },
          operation: "chat.rename",
        }),
      ),

    deleteSession: (sessionId) =>
      client.request<void>(`/chat/sessions/${sessionId}`, {
        method: "DELETE",
        operation: "chat.delete",
      }),

    messages: async (sessionId) =>
      (
        await client.request<{ messages: ApiMessage[] }>(
          `/chat/sessions/${sessionId}/messages`,
          { operation: "chat.messages" },
        )
      ).messages.map(toMessage),

    send: async (sessionId, input, handlers, signal) => {
      if (signal.aborted) throw stopped();
      const cancel = () => {
        client
          .request<void>(`/chat/sessions/${sessionId}/cancel`, {
            method: "POST",
            operation: "chat.cancel",
          })
          .catch(() => {});
      };
      signal.addEventListener("abort", cancel, { once: true });
      const result: { turn: ChatTurn | null } = { turn: null };
      try {
        await client.stream(
          `/chat/sessions/${sessionId}/messages`,
          (event, data) => {
            const payload = data as Record<string, unknown>;
            if (event === "phase") handlers.onPhase(payload.phase as ChatPhase);
            else if (event === "citation")
              handlers.onCitation(
                payload.index as number,
                toCitation(payload.citation as ApiCitation),
              );
            else if (event === "delta")
              handlers.onDelta(payload.text as string);
            else if (event === "done")
              result.turn = {
                question: toMessage(payload.question as ApiMessage),
                answer: toMessage(payload.answer as ApiMessage),
              };
            else if (event === "error") {
              if (payload.code === "CHAT_ANSWER_CANCELLED") throw stopped();
              throw toServiceError(
                { code: payload.code as string },
                503,
                "chat.send",
              );
            }
          },
          {
            method: "POST",
            body: {
              content: input.content,
              intent: input.intent,
              quote: input.quote
                ? {
                    file_id: input.quote.fileId,
                    title: input.quote.title,
                    doc_type: input.quote.docType,
                    text: input.quote.text,
                  }
                : null,
              focus_file_id: input.focusFileId,
              replaces: input.replaces,
              client_message_id: crypto.randomUUID(),
            },
            signal,
            operation: "chat.send",
          },
        );
      } finally {
        signal.removeEventListener("abort", cancel);
      }
      if (signal.aborted) throw stopped();
      if (!result.turn)
        throw new ServiceError(
          "network",
          t("답을 받는 중에 연결이 끊겼어요."),
          "chat.send",
        );
      return result.turn;
    },
  };
}
