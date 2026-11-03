"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ProjectSettings } from "@/domain/models";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { withUsageAction } from "@/features/analytics/usage-analytics";

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
      withUsageAction(
        "project",
        "update_settings",
        () => services.projects.saveSettings(projectId, settings),
        { entry_point: "other" },
      ),
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
