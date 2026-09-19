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
  const [owner, setOwner] = useState(sessionId);
  const controller = useRef<AbortController | null>(null);
  const current = useRef(sessionId);

  // 세션을 바꾸면 이전 세션의 스트림·오류·중단 안내를 버린다. 오류의 "다시 시도"가
  // 다른 세션으로 보내지는 일을 막는다.
  if (owner !== sessionId) {
    setOwner(sessionId);
    setState({ kind: "idle" });
  }

  useEffect(() => {
    current.current = sessionId;
    return () => {
      controller.current?.abort();
    };
  }, [sessionId]);

  const send = useCallback(
    async (content: string, contextFile: ChatMessage["contextFile"]) => {
      if (!sessionId) return;
      const abort = new AbortController();
      controller.current = abort;
      const mine = (
        next: StreamState | ((prev: StreamState) => StreamState),
      ) => {
        if (current.current === sessionId) setState(next);
      };
      const pending: ChatMessage = {
        id: "pending",
        sessionId,
        role: "user",
        content,
        createdAt: new Date().toISOString(),
        contextFile,
      };
      mine({ kind: "streaming", pending, partial: "" });
      try {
        await services.chat.send(
          sessionId,
          { content, contextFile },
          {
            onToken: (token) =>
              mine((prev) =>
                prev.kind === "streaming"
                  ? { ...prev, partial: prev.partial + token }
                  : prev,
              ),
          },
          abort.signal,
        );
        mine({ kind: "idle" });
      } catch (error) {
        mine(
          error instanceof DOMException && error.name === "AbortError"
            ? { kind: "stopped" }
            : { kind: "error", content },
        );
      } finally {
        if (controller.current === abort) controller.current = null;
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
