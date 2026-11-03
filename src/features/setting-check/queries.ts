"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  SettingCheckFinding,
  SettingCheckRunDetail,
  SettingCheckSummary,
  SettingCheckVerdict,
  SettingCheckRun,
} from "@/domain/setting-check";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { beginUsage } from "@/features/analytics/usage-analytics";
import { observeSettingCheck } from "@/features/analytics/setting-check-analytics";

/** 점검이 도는 동안 다시 읽는 간격. 서버에서 1–3분 걸린다 */
const SUMMARY_POLL_MS = 3000;
const RUN_POLL_MS = 2000;

export function useSettingCheckSummary(projectId: string) {
  const services = useServices();
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.settingCheckSummary(projectId),
    queryFn: async () => {
      const summary = await services.settingChecks.summary(projectId);
      observeSettingCheck(client, summary.running);
      for (const chapter of summary.chapters)
        observeSettingCheck(client, chapter.latest);
      return summary;
    },
    refetchInterval: (query) =>
      query.state.data?.running ? SUMMARY_POLL_MS : false,
  });
}

export function useSettingCheckRun(runId: string | null) {
  const services = useServices();
  const client = useQueryClient();
  return useQuery({
    queryKey: queryKeys.settingCheckRun(runId ?? ""),
    queryFn: async () => {
      const run = await services.settingChecks.run(runId!);
      observeSettingCheck(client, run);
      return run;
    },
    enabled: runId !== null,
    refetchInterval: (query) =>
      query.state.data?.status === "RUNNING" ? RUN_POLL_MS : false,
  });
}

export function useSettingCheckVerdicts(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.settingCheckVerdicts(projectId),
    queryFn: () => services.settingChecks.verdicts(projectId),
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

export function useSettingCheckActions(
  projectId: string,
  observation?: {
    accepted: (run: SettingCheckRun) => void;
    failed: (error: unknown) => void;
  },
) {
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
      mutationFn: async (documentId: string) => {
        try {
          const run = await services.settingChecks.start(projectId, documentId);
          observation?.accepted(run);
          observeSettingCheck(queryClient, run);
          return run;
        } catch (error) {
          observation?.failed(error);
          throw error;
        }
      },
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
      mutationFn: async (runId: string) => {
        const attempt = beginUsage(
          "setting_check_cancel_requested",
          "setting_check_cancel_result",
          { entry_point: "check_report" },
        );
        try {
          const result = await services.settingChecks.cancel(runId);
          attempt.finish({ outcome: "accepted" });
          return result;
        } catch (error) {
          attempt.fail(error);
          throw error;
        }
      },
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
      }) => {
        const attempt = beginUsage(
          "setting_check_verdict_started",
          "setting_check_verdict_result",
          {
            action: "set",
            verdict: input.verdict === "INTENDED" ? "intended" : "not_conflict",
            has_reason: input.reason?.trim() ? 1 : 0,
            entry_point: "check_report",
          },
        );
        return services.settingChecks
          .setVerdict(input.findingId, input.verdict, input.reason)
          .then(
            (result) => {
              attempt.finish({ outcome: "success" });
              return result;
            },
            (error) => {
              attempt.fail(error);
              throw error;
            },
          );
      },
      onSuccess: decided,
    }),
    clearVerdict: useMutation({
      mutationFn: (findingId: string) => {
        const attempt = beginUsage(
          "setting_check_verdict_started",
          "setting_check_verdict_result",
          { action: "clear", entry_point: "check_report" },
        );
        return services.settingChecks.clearVerdict(findingId).then(
          (result) => {
            attempt.finish({ outcome: "success" });
            return result;
          },
          (error) => {
            attempt.fail(error);
            throw error;
          },
        );
      },
      onSuccess: decided,
    }),
  };
}
