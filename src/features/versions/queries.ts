"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import type { DocumentType } from "@/domain/document-types";
import {
  tagUsageError,
  withUsageAction,
} from "@/features/analytics/usage-analytics";

export function useVersions(fileId: string, enabled: boolean) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.versions(fileId),
    queryFn: () => services.versions.list(fileId),
    enabled,
  });
}

export function useVersionMutations(
  fileId: string,
  beforeSave: () => Promise<void> = async () => {},
  document_type?: DocumentType,
) {
  const services = useServices();
  const queryClient = useQueryClient();
  const prepare = async () => {
    try {
      await beforeSave();
    } catch (error) {
      throw tagUsageError(error, {
        outcome: "blocked",
        stage: "save_documents",
      });
    }
  };
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.versions(fileId) });
  return {
    save: useMutation({
      mutationFn: () =>
        withUsageAction(
          "document",
          "save_version",
          async () => {
            await prepare();
            return services.versions.saveNamed(fileId);
          },
          { entry_point: "document_header", document_type },
        ),
      onSuccess: invalidate,
    }),
    restore: useMutation({
      mutationFn: ({
        versionId,
        revision,
      }: {
        versionId: string;
        revision: number | (() => number);
      }) =>
        withUsageAction(
          "document",
          "restore_version",
          async () => {
            await prepare();
            return services.versions.restore(
              fileId,
              versionId,
              typeof revision === "function" ? revision() : revision,
            );
          },
          { entry_point: "document_header", document_type },
        ),
      onSuccess: invalidate,
    }),
  };
}
