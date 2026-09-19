"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DocumentDraft } from "@/domain/models";
import { invalidateProjectContent, queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

const POLL_MS = 1000;

export function useRefreshRun(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.refresh(projectId),
    queryFn: () => services.refresh.current(projectId),
    refetchInterval: (query) =>
      query.state.data?.status === "RUNNING" ? POLL_MS : false,
  });
}

export function useRefreshActions(projectId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  const store = (run: Awaited<ReturnType<typeof services.refresh.current>>) =>
    queryClient.setQueryData(queryKeys.refresh(projectId), run);
  return {
    start: useMutation({
      mutationFn: () => services.refresh.start(projectId),
      onSuccess: store,
    }),
    apply: useMutation({
      mutationFn: ({
        runId,
        resolved,
      }: {
        runId: string;
        resolved: Record<string, DocumentDraft | null>;
      }) => services.refresh.apply(projectId, runId, resolved),
      onSuccess: async (run) => {
        store(run);
        await invalidateProjectContent(queryClient, projectId);
        await queryClient.invalidateQueries({ queryKey: ["document"] });
      },
    }),
    discard: useMutation({
      mutationFn: (runId: string) => services.refresh.discard(projectId, runId),
      onSuccess: store,
    }),
  };
}
