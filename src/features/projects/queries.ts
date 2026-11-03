"use client";

import type { EntryPoint } from "@/features/analytics/usage-schema";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Project, User, WithdrawalSurvey } from "@/domain/models";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { withUsageAction } from "@/features/analytics/usage-analytics";

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

export function useUpdateProject() {
  const services = useServices();
  const queryClient = useQueryClient();
  return useProjectMutation(
    ({
      projectId,
      title,
      description,
    }: {
      projectId: string;
      title: string;
      description: string;
    }) =>
      withUsageAction(
        "project",
        "update_settings",
        () => services.projects.saveSettings(projectId, { title, description }),
        { entry_point: "project_list" },
      ),
    (project: Project) => {
      queryClient.setQueryData(queryKeys.project(project.id), project);
      queryClient.setQueryData(queryKeys.projectSettings(project.id), {
        title: project.title,
        description: project.description,
      });
    },
  );
}

export function useTrashProject(entry_point: EntryPoint = "project_list") {
  const services = useServices();
  return useProjectMutation((projectId: string) =>
    withUsageAction(
      "project",
      "trash",
      () => services.projects.moveToTrash(projectId),
      { entry_point },
    ),
  );
}

export function useRestoreProject() {
  const services = useServices();
  return useProjectMutation((projectId: string) =>
    withUsageAction(
      "project",
      "restore",
      () => services.projects.restore(projectId),
      { entry_point: "project_list" },
    ),
  );
}

export function useDeleteProject() {
  const services = useServices();
  return useProjectMutation((projectId: string) =>
    withUsageAction(
      "project",
      "delete",
      () => services.projects.deletePermanently(projectId),
      { entry_point: "project_list" },
    ),
  );
}

export function useUpdateAccount(entry_point: EntryPoint = "account_menu") {
  const services = useServices();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (displayName: string) =>
      withUsageAction(
        "account",
        "update_name",
        () => services.account.updateDisplayName(displayName),
        { entry_point },
      ),
    onSuccess: (user) => {
      queryClient.setQueryData(queryKeys.account, user);
      queryClient.setQueryData(queryKeys.session, user);
    },
  });
}

export function useLogout() {
  const services = useServices();
  return useMutation({
    mutationFn: () =>
      withUsageAction("account", "logout", () => services.auth.logout(), {
        entry_point: "account_menu",
      }),
  });
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
    mutationFn: ({
      confirmationEmail,
      survey,
    }: {
      confirmationEmail: string;
      survey?: WithdrawalSurvey;
    }) =>
      withUsageAction(
        "account",
        "delete_account",
        () => services.account.deleteAccount(confirmationEmail, survey),
        { entry_point: "account_menu" },
      ),
  });
}
