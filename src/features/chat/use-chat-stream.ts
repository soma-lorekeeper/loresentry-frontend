"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ChatMessage } from "@/domain/models";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export type StreamState =
  | { kind: "idle" }
  | { kind: "streaming"; pending: ChatMessage; partial: string }
  | { kind: "stopped" }
  | { kind: "error"; content: string };

export function useChatStream(projectId: string, sessionId: string | null) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [state, setState] = useState<StreamState>({ kind: "idle" });
  const controller = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      controller.current?.abort();
    },
    [sessionId],
  );

  const send = useCallback(
    async (content: string, contextFile: ChatMessage["contextFile"]) => {
      if (!sessionId) return;
      const abort = new AbortController();
      controller.current = abort;
      const pending: ChatMessage = {
        id: "pending",
        sessionId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
        contextFile,
      };
      setState({ kind: "streaming", pending, partial: "" });
      try {
        await services.chat.send(
          sessionId,
          { content, contextFile },
          {
            onToken: (token) =>
              setState((current) =>
                current.kind === "streaming"
                  ? { ...current, partial: current.partial + token }
                  : current,
              ),
          },
          abort.signal,
        );
        setState({ kind: "idle" });
      } catch (error) {
        setState(
          error instanceof DOMException && error.name === "AbortError"
            ? { kind: "stopped" }
            : { kind: "error", content },
        );
      } finally {
        controller.current = null;
        await Promise.all([
          queryClient.invalidateQueries({
            queryKey: queryKeys.chatMessages(sessionId),
          }),
          queryClient.invalidateQueries({
            queryKey: queryKeys.chatSessions(projectId),
          }),
        ]);
      }
    },
    [projectId, queryClient, services, sessionId],
  );

  const stop = useCallback(() => controller.current?.abort(), []);
  const dismiss = useCallback(() => setState({ kind: "idle" }), []);

  return { state, send, stop, dismiss };
}
