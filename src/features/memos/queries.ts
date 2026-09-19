"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { MemoScope } from "@/domain/models";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export function useMemos(
  projectId: string,
  scope: MemoScope,
  fileId: string | null = null,
) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.memos(projectId, scope, fileId),
    queryFn: () => services.memos.list(projectId, scope, fileId ?? undefined),
  });
}

function useInvalidateMemos(projectId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["memos", projectId] });
}

export function useCreateMemo(projectId: string) {
  const services = useServices();
  const invalidate = useInvalidateMemos(projectId);
  return useMutation({
    mutationFn: (input: {
      scope: MemoScope;
      fileId: string | null;
      body: string;
    }) => services.memos.create({ projectId, ...input }),
    onSuccess: invalidate,
  });
}

export function useRemoveMemo(projectId: string) {
  const services = useServices();
  const invalidate = useInvalidateMemos(projectId);
  return useMutation({
    mutationFn: (memoId: string) => services.memos.remove(memoId),
    onSuccess: invalidate,
  });
}

export function memoHeadline(body: string, max = 24) {
  const first = body.trim().split(/(?<=[.!?。])\s|\n/)[0] ?? "";
  return first.length > max ? `${first.slice(0, max)}…` : first;
}
