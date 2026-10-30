"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DocumentType } from "@/domain/document-types";
import { useToast } from "@/design-system/primitives";
import { t } from "@/i18n";
import { invalidateProjectContent, queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

import { announceFileCreated } from "./file-events";

export function useProject(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.project(projectId),
    queryFn: () => services.projects.get(projectId),
  });
}

export function useFileTree(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.tree(projectId),
    queryFn: () => services.files.tree(projectId),
  });
}

export function useFavorites(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.favorites(projectId),
    queryFn: () => services.files.favorites(projectId),
  });
}

export function useFileTrash(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.trash(projectId),
    queryFn: () => services.files.listTrash(projectId),
  });
}

function useFileMutation<Variables, Result>(
  projectId: string,
  run: (variables: Variables) => Promise<Result>,
  onError?: () => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onError,
    onSuccess: () => invalidateProjectContent(queryClient, projectId),
  });
}

export function useCreateFile(projectId: string) {
  const services = useServices();
  return useFileMutation(
    projectId,
    async (input: {
      parentId: string | null;
      kind: "document" | "folder";
      title: string;
      docType?: DocumentType;
    }) => {
      const node = await services.files.create({ projectId, ...input });
      announceFileCreated(node);
      return node;
    },
  );
}

export function useRenameFile(projectId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, title }: { fileId: string; title: string }) =>
      services.files.rename(fileId, title),
    onSuccess: async (node) => {
      await invalidateProjectContent(queryClient, projectId);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.document(node.id),
      });
    },
  });
}

export function useMoveFile(projectId: string) {
  const services = useServices();
  const toast = useToast();
  return useFileMutation(
    projectId,
    ({
      fileId,
      parentId,
      beforeId,
    }: {
      fileId: string;
      parentId: string;
      beforeId: string | null;
    }) => services.files.move(fileId, parentId, beforeId),
    () =>
      toast({
        icon: "circle-alert",
        title: t(
          "파일을 옮기지 못했어요. 이전 위치를 유지합니다. 다시 시도해 주세요.",
        ),
      }),
  );
}

export function useTrashFile(projectId: string) {
  const services = useServices();
  return useFileMutation(projectId, (fileId: string) =>
    services.files.moveToTrash(fileId),
  );
}

export function useRestoreFile(projectId: string) {
  const services = useServices();
  return useFileMutation(projectId, (fileId: string) =>
    services.files.restore(fileId),
  );
}

export function useDeleteFile(projectId: string) {
  const services = useServices();
  return useFileMutation(projectId, (fileId: string) =>
    services.files.deletePermanently(fileId),
  );
}

export function useSetFavorite(projectId: string) {
  const services = useServices();
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, favorite }: { fileId: string; favorite: boolean }) =>
      services.files.setFavorite(projectId, fileId, favorite),
    onError: () =>
      toast({
        icon: "circle-alert",
        title: t("즐겨찾기를 변경하지 못했어요. 다시 시도해 주세요."),
      }),
    onSuccess: (favorites) => {
      queryClient.setQueryData(queryKeys.favorites(projectId), favorites);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.graph(projectId),
      });
    },
  });
}

export function useEpisodeMutations(projectId: string) {
  const services = useServices();
  return {
    removeEpisode: useFileMutation(projectId, (episodeId: string) =>
      services.files.deleteEpisode(episodeId),
    ),
  };
}
