"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  SettingCheckFinding,
  SettingCheckRunDetail,
  SettingCheckSummary,
  SettingCheckVerdict,
} from "@/domain/setting-check";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

/** 점검이 도는 동안 다시 읽는 간격. 서버에서 1–3분 걸린다 */
const SUMMARY_POLL_MS = 3000;
const RUN_POLL_MS = 2000;

export function useSettingCheckSummary(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.settingCheckSummary(projectId),
    queryFn: () => services.settingChecks.summary(projectId),
    refetchInterval: (query) =>
      query.state.data?.running ? SUMMARY_POLL_MS : false,
  });
}

export function useSettingCheckRuns(projectId: string, documentId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.settingCheckRuns(projectId, documentId),
    queryFn: () => services.settingChecks.runs(projectId, documentId),
  });
}

export function useSettingCheckRun(runId: string | null) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.settingCheckRun(runId ?? ""),
    queryFn: () => services.settingChecks.run(runId!),
    enabled: runId !== null,
    refetchInterval: (query) =>
      query.state.data?.status === "RUNNING" ? RUN_POLL_MS : false,
  });
}

function patchFinding(
  detail: SettingCheckRunDetail | undefined,
  finding: SettingCheckFinding,
) {
  if (!detail?.findings.some((item) => item.id === finding.id)) return detail;
  return {
    ...detail,
    findings: detail.findings.map((item) =>
      item.id === finding.id ? finding : item,
    ),
  };
}

export function useSettingCheckActions(projectId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  const reload = () =>
    queryClient.invalidateQueries({
      queryKey: queryKeys.settingChecks(projectId),
    });
  /*
   * 판정은 어긋남 하나가 아니라 같은 근거 문장에 붙는다. 같은 회차의 다른 점검에 있는 같은 어긋남도
   * 함께 바뀌므로, 고친 것은 바로 그리고 나머지 점검은 다시 읽는다.
   */
  const decided = async (finding: SettingCheckFinding) => {
    queryClient.setQueriesData<SettingCheckRunDetail>(
      { queryKey: ["setting-check-run"] },
      (detail) => patchFinding(detail, finding),
    );
    await Promise.all([
      reload(),
      queryClient.invalidateQueries({ queryKey: ["setting-check-run"] }),
    ]);
  };

  return {
    start: useMutation({
      mutationFn: (documentId: string) =>
        services.settingChecks.start(projectId, documentId),
      onSuccess: async (run) => {
        queryClient.setQueryData<SettingCheckSummary>(
          queryKeys.settingCheckSummary(projectId),
          (summary) => (summary ? { ...summary, running: run } : summary),
        );
        await reload();
      },
      onError: reload,
    }),
    cancel: useMutation({
      mutationFn: (runId: string) => services.settingChecks.cancel(runId),
      onSettled: async (_data, _error, runId) => {
        await Promise.all([
          reload(),
          queryClient.invalidateQueries({
            queryKey: queryKeys.settingCheckRun(runId),
          }),
        ]);
      },
    }),
    setVerdict: useMutation({
      mutationFn: (input: {
        findingId: string;
        verdict: SettingCheckVerdict;
        reason: string | null;
      }) =>
        services.settingChecks.setVerdict(
          input.findingId,
          input.verdict,
          input.reason,
        ),
      onSuccess: decided,
    }),
    clearVerdict: useMutation({
      mutationFn: (findingId: string) =>
        services.settingChecks.clearVerdict(findingId),
      onSuccess: decided,
    }),
  };
}
