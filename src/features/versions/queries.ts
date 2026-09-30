"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export function useVersions(fileId: string, enabled: boolean) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.versions(fileId),
    queryFn: () => services.versions.list(fileId),
    enabled,
  });
}

export function useVersionMutations(fileId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.versions(fileId) });
  return {
    save: useMutation({
      mutationFn: () => services.versions.saveNamed(fileId),
      onSuccess: invalidate,
    }),
    restore: useMutation({
      mutationFn: ({
        versionId,
        revision,
      }: {
        versionId: string;
        revision: number;
      }) => services.versions.restore(fileId, versionId, revision),
      onSuccess: invalidate,
    }),
  };
}
