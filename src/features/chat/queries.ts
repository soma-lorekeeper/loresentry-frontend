"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export function useChatSessions(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.chatSessions(projectId),
    queryFn: () => services.chat.sessions(projectId),
  });
}

export function useChatMessages(sessionId: string | null) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.chatMessages(sessionId ?? "none"),
    queryFn: () => services.chat.messages(sessionId!),
    enabled: sessionId !== null,
  });
}

export function useChatSessionMutations(projectId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.chatSessions(projectId),
    });
  return {
    create: useMutation({
      mutationFn: () => services.chat.createSession(projectId),
      onSuccess: invalidate,
    }),
    rename: useMutation({
      mutationFn: ({
        sessionId,
        title,
      }: {
        sessionId: string;
        title: string;
      }) => services.chat.renameSession(sessionId, title),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (sessionId: string) => services.chat.deleteSession(sessionId),
      onSuccess: invalidate,
    }),
  };
}
