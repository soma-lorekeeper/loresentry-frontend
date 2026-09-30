"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Project, User } from "@/domain/models";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export function useProjects() {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.projects,
    queryFn: () => services.projects.list(),
  });
}

export function useProjectTrash() {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.projectTrash,
    queryFn: () => services.projects.listTrash(),
  });
}

export function useAccount() {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.account,
    queryFn: () => services.account.getAccount(),
  });
}

function useProjectMutation<Variables, Result>(
  run: (variables: Variables) => Promise<Result>,
  onSuccess?: (result: Result, variables: Variables) => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSuccess: async (result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
        queryClient.invalidateQueries({ queryKey: queryKeys.projectTrash }),
      ]);
      onSuccess?.(result, variables);
    },
  });
}

export function useCreateProject() {
  const services = useServices();
  return useProjectMutation((input: { title: string; description: string }) =>
    services.projects.create(input),
  );
}

export function useCreateSampleProject() {
  const services = useServices();
  return useProjectMutation(() => services.projects.createSample());
}

export function useRenameProject() {
  const services = useServices();
  const queryClient = useQueryClient();
  return useProjectMutation(
    ({ projectId, title }: { projectId: string; title: string }) =>
      services.projects.rename(projectId, title),
    (project: Project) =>
      queryClient.setQueryData(queryKeys.project(project.id), project),
  );
}

export function useTrashProject() {
  const services = useServices();
  return useProjectMutation((projectId: string) =>
    services.projects.moveToTrash(projectId),
  );
}

export function useRestoreProject() {
  const services = useServices();
  return useProjectMutation((projectId: string) =>
    services.projects.restore(projectId),
  );
}

export function useDeleteProject() {
  const services = useServices();
  return useProjectMutation((projectId: string) =>
    services.projects.deletePermanently(projectId),
  );
}

export function useUpdateAccount() {
  const services = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (displayName: string) =>
      services.account.updateDisplayName(displayName),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.account, user);
      queryClient.setQueryData(queryKeys.session, user);
    },
  });
}

export function useLogout() {
  const services = useServices();
  return useMutation({ mutationFn: () => services.auth.logout() });
}

export function useCompleteOnboarding() {
  const services = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => services.account.completeOnboarding(),
    onSuccess: () => {
      queryClient.setQueryData<User | null>(queryKeys.session, (user) =>
        user ? { ...user, onboardingCompleted: true } : user,
      );
      queryClient.setQueryData<User>(queryKeys.account, (user) =>
        user ? { ...user, onboardingCompleted: true } : user,
      );
    },
  });
}

export function useDeleteAccount() {
  const services = useServices();
  return useMutation({
    mutationFn: (confirmationEmail: string) =>
      services.account.deleteAccount(confirmationEmail),
  });
}
