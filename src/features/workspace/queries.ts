"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { FileNode, TrashEntry } from "@/domain/models";
import { indexNodes } from "./model/tree";
import type { DocumentType } from "@/domain/document-types";
import { useToast } from "@/design-system/primitives";
import { t } from "@/i18n";
import { invalidateProjectContent, queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { withUsageAction } from "@/features/analytics/usage-analytics";
import type { EntryPoint } from "@/features/analytics/usage-schema";

import { announceFileCreated } from "./file-events";

function useFileUsage(projectId: string) {
  const client = useQueryClient();
  return (fileId: string) => {
    const tree =
      client.getQueryData<FileNode[]>(queryKeys.tree(projectId)) ?? [];
    const node =
      indexNodes(tree).get(fileId) ??
      client
        .getQueryData<TrashEntry[]>(queryKeys.trash(projectId))
        ?.find((entry) => entry.node.id === fileId)?.node;
    return node
      ? {
          entity_kind:
            node.kind === "document"
              ? ("document" as const)
              : ("episode" as const),
          document_type: node.kind === "document" ? node.docType : undefined,
        }
      : {};
  };
}

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

export function useCreateFile(
  projectId: string,
  entry_point: EntryPoint = "file_menu",
) {
  const services = useServices();
  return useFileMutation(
    projectId,
    async (input: {
      parentId: string | null;
      kind: "document" | "folder";
      title: string;
      docType?: DocumentType;
    }) => {
      const node = await withUsageAction(
        "file",
        "create",
        () => services.files.create({ projectId, ...input }),
        {
          entry_point,
          document_type: input.docType,
          entity_kind: input.kind === "document" ? "document" : "episode",
        },
      );
      announceFileCreated(node);
      return node;
    },
  );
}

export function useRenameFile(projectId: string) {
  const services = useServices();
  const fileUsage = useFileUsage(projectId);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, title }: { fileId: string; title: string }) =>
      withUsageAction(
        "file",
        "rename",
        () => services.files.rename(fileId, title),
        { entry_point: "file_menu", ...fileUsage(fileId) },
      ),
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
  const fileUsage = useFileUsage(projectId);
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
    }) =>
      withUsageAction(
        "file",
        "move",
        () => services.files.move(fileId, parentId, beforeId),
        { entry_point: "file_menu", ...fileUsage(fileId) },
      ),
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
  const fileUsage = useFileUsage(projectId);
  return useFileMutation(projectId, (fileId: string) =>
    withUsageAction("file", "trash", () => services.files.moveToTrash(fileId), {
      entry_point: "file_menu",
      ...fileUsage(fileId),
    }),
  );
}

export function useRestoreFile(projectId: string) {
  const services = useServices();
  const fileUsage = useFileUsage(projectId);
  return useFileMutation(projectId, (fileId: string) =>
    withUsageAction("file", "restore", () => services.files.restore(fileId), {
      entry_point: "file_menu",
      ...fileUsage(fileId),
    }),
  );
}

export function useDeleteFile(projectId: string) {
  const services = useServices();
  const fileUsage = useFileUsage(projectId);
  return useFileMutation(projectId, (fileId: string) =>
    withUsageAction(
      "file",
      "delete",
      () => services.files.deletePermanently(fileId),
      { entry_point: "file_menu", ...fileUsage(fileId) },
    ),
  );
}

export function useSetFavorite(projectId: string) {
  const services = useServices();
  const fileUsage = useFileUsage(projectId);
  const toast = useToast();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ fileId, favorite }: { fileId: string; favorite: boolean }) =>
      withUsageAction(
        "file",
        favorite ? "favorite" : "unfavorite",
        () => services.files.setFavorite(projectId, fileId, favorite),
        { ...fileUsage(fileId) },
      ),
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
      withUsageAction(
        "file",
        "delete_episode",
        () => services.files.deleteEpisode(episodeId),
        { entry_point: "file_menu", entity_kind: "episode" },
      ),
    ),
  };
}
