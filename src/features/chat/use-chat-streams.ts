"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import type { ChatCitation, ChatMessage, ChatPhase } from "@/domain/models";
import { saveOpenDocuments } from "@/features/documents/open-sessions";
import type { ChatSendInput } from "@/services/ports";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

import { invalidateChat } from "./queries";

export interface ChatStream {
  sessionId: string;
  question: ChatMessage;
  replaces: string | null;
  phase: ChatPhase;
  content: string;
  freshFrom: number;
  tick: number;
  citations: ChatCitation[];
  startedAt: number;
}

export interface ChatInterruption {
  input: ChatSendInput;
  reason: "stopped" | "failed";
}

function without<T>(record: Record<string, T>, key: string) {
  if (!(key in record)) return record;
  const next = { ...record };
  delete next[key];
  return next;
}

export function useChatStreams(projectId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [streams, setStreams] = useState<Record<string, ChatStream>>({});
  const [interrupted, setInterrupted] = useState<
    Record<string, ChatInterruption>
  >({});
  const [completedAt, setCompletedAt] = useState(0);
  const controllers = useRef<Record<string, AbortController>>({});
  const forgotten = useRef(new Set<string>());

  useEffect(() => {
    const live = controllers.current;
    return () => Object.values(live).forEach((c) => c.abort());
  }, []);

  const update = (
    sessionId: string,
    change: (stream: ChatStream) => Partial<ChatStream>,
  ) =>
    setStreams((all) =>
      all[sessionId]
        ? {
            ...all,
            [sessionId]: { ...all[sessionId], ...change(all[sessionId]) },
          }
        : all,
    );

  const finish = (sessionId: string) => {
    delete controllers.current[sessionId];
    setStreams((all) => without(all, sessionId));
  };

  const send = (sessionId: string, input: ChatSendInput) => {
    if (controllers.current[sessionId]) return;
    const controller = new AbortController();
    controllers.current[sessionId] = controller;
    forgotten.current.delete(sessionId);
    setInterrupted((all) => without(all, sessionId));
    setStreams((all) => ({
      ...all,
      [sessionId]: {
        sessionId,
        question: {
          id: `pending:${sessionId}`,
          sessionId,
          role: "user",
          content: input.content,
          intent: input.intent,
          quote: input.quote,
          citations: [],
          createdAt: new Date().toISOString(),
        },
        replaces: input.replaces,
        phase: "gathering",
        content: "",
        freshFrom: 0,
        tick: 0,
        citations: [],
        startedAt: Date.now(),
      },
    }));
    saveOpenDocuments()
      .then(() =>
        services.chat.send(
          sessionId,
          input,
          {
            onPhase: (phase) => update(sessionId, () => ({ phase })),
            onCitation: (index, citation) =>
              update(sessionId, (stream) => {
                const citations = [...stream.citations];
                citations[index - 1] = citation;
                return { citations };
              }),
            onDelta: (text) =>
              update(sessionId, (stream) => ({
                phase: "writing",
                content: stream.content + text,
                freshFrom: stream.content.length,
                tick: stream.tick + 1,
              })),
          },
          controller.signal,
        ),
      )
      .then(
        async (turn) => {
          if (turn.usage)
            queryClient.setQueryData(queryKeys.chatUsage, turn.usage);
          else
            void queryClient.invalidateQueries({
              queryKey: queryKeys.chatUsage,
            });
          await invalidateChat(queryClient, projectId, sessionId);
          finish(sessionId);
          setCompletedAt(Date.now());
        },
        async (error: unknown) => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.chatUsage });
          if (forgotten.current.has(sessionId)) return finish(sessionId);
          await invalidateChat(queryClient, projectId, sessionId);
          finish(sessionId);
          const stopped =
            error instanceof DOMException && error.name === "AbortError";
          setInterrupted((all) => ({
            ...all,
            [sessionId]: { input, reason: stopped ? "stopped" : "failed" },
          }));
        },
      );
  };

  const stop = (sessionId: string) => controllers.current[sessionId]?.abort();

  const forget = (sessionId: string) => {
    forgotten.current.add(sessionId);
    controllers.current[sessionId]?.abort();
    setInterrupted((all) => without(all, sessionId));
  };

  const retry = (sessionId: string, messages: ChatMessage[]) => {
    const entry = interrupted[sessionId];
    if (!entry) return;
    const lastQuestion = [...messages].reverse().find((m) => m.role === "user");
    send(sessionId, { ...entry.input, replaces: lastQuestion?.id ?? null });
  };

  return {
    streams,
    interrupted,
    completedAt,
    busy: Object.keys(streams).length > 0,
    send,
    stop,
    forget,
    retry,
  };
}

export type ChatStreams = ReturnType<typeof useChatStreams>;

export function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useElapsed(since: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (since === null) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [since]);
  return since === null ? 0 : Math.max(0, Math.floor((now - since) / 1000));
}
