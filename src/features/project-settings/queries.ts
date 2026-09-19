"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ProjectSettings } from "@/domain/models";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export function useProjectSettings(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.projectSettings(projectId),
    queryFn: () => services.projects.getSettings(projectId),
  });
}

export function useSaveProjectSettings(projectId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: ProjectSettings) =>
      services.projects.saveSettings(projectId, settings),
    onSuccess: async (project) => {
      queryClient.setQueryData(queryKeys.project(projectId), project);
      queryClient.setQueryData(queryKeys.projectSettings(projectId), {
        title: project.title,
        description: project.description,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.projects });
    },
  });
}
