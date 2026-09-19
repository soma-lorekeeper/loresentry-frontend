"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { DocumentType } from "@/domain/document-types";
import { invalidateProjectContent, queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

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

export function useSections(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.sections(projectId),
    queryFn: () => services.files.sections(projectId),
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
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: () => invalidateProjectContent(queryClient, projectId),
  });
}

export function useCreateFile(projectId: string) {
  const services = useServices();
  return useFileMutation(
    projectId,
    (input: {
      parentId: string;
      kind: "document" | "folder";
      title: string;
      docType?: DocumentType;
    }) => services.files.create({ projectId, ...input }),
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, favorite }: { fileId: string; favorite: boolean }) =>
      services.files.setFavorite(projectId, fileId, favorite),
    onSuccess: (favorites) => {
      queryClient.setQueryData(queryKeys.favorites(projectId), favorites);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.graph(projectId),
      });
    },
  });
}

export function useSectionMutations(projectId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.sections(projectId) });
  return {
    create: useMutation({
      mutationFn: ({
        title,
        afterSectionId,
      }: {
        title: string;
        afterSectionId: string | null;
      }) => services.files.createSection(projectId, title, afterSectionId),
      onSuccess: refresh,
    }),
    rename: useMutation({
      mutationFn: ({
        sectionId,
        title,
      }: {
        sectionId: string;
        title: string;
      }) => services.files.renameSection(projectId, sectionId, title),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (sectionId: string) =>
        services.files.deleteSection(projectId, sectionId),
      onSuccess: refresh,
    }),
  };
}
