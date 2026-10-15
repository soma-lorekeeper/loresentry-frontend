"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export function useChatAvailability(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.chatAvailability(projectId),
    queryFn: () => services.chat.availability(projectId),
    staleTime: 60_000,
  });
}

export function useChatSessions(projectId: string, enabled: boolean) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.chatSessions(projectId),
    queryFn: () => services.chat.sessions(projectId),
    enabled,
  });
}

export function useChatMessages(sessionId: string | null) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.chatMessages(sessionId ?? ""),
    queryFn: () => services.chat.messages(sessionId!),
    enabled: sessionId !== null,
  });
}

export function useChatSearch(projectId: string, query: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.chatSearch(projectId, query),
    queryFn: () => services.chat.search(projectId, query),
    enabled: query.length > 0,
    placeholderData: (previous) => previous,
  });
}

export function invalidateChat(
  queryClient: QueryClient,
  projectId: string,
  sessionId?: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: queryKeys.chatSessions(projectId),
    }),
    queryClient.invalidateQueries({ queryKey: ["chat", projectId, "search"] }),
    sessionId
      ? queryClient.invalidateQueries({
          queryKey: queryKeys.chatMessages(sessionId),
        })
      : Promise.resolve(),
  ]);
}

export function useCreateChatSession(projectId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => services.chat.createSession(projectId),
    onSuccess: () => invalidateChat(queryClient, projectId),
  });
}

export function useRenameChatSession(projectId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sessionId, title }: { sessionId: string; title: string }) =>
      services.chat.renameSession(sessionId, title),
    onSuccess: () => invalidateChat(queryClient, projectId),
  });
}

export function useDeleteChatSession(projectId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => services.chat.deleteSession(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.removeQueries({
        queryKey: queryKeys.chatMessages(sessionId),
      });
      return invalidateChat(queryClient, projectId);
    },
  });
}
