"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { invalidateProjectContent, queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

/** 결과를 기다리는 동안 상태를 다시 읽는 간격. 추출은 몇 분 걸리므로 촘촘할 필요가 없다 */
const POLL_MS = 5000;

/**
 * 가장 최근 최신화의 상태.
 *
 * <p>처음 열 때 서버에서 읽으므로, 다른 브라우저나 새로 로그인한 곳에서 시작한 최신화도 RUNNING 이면
 * 그대로 다시 읽기 시작한다. 결과를 기다리는 동안(RUNNING)만 다시 읽고, 탭이 뒤에 있으면 쉰다.
 */
export function useRefreshRun(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.refresh(projectId),
    queryFn: () => services.refresh.latest(projectId),
    refetchInterval: (query) =>
      query.state.data?.status === "RUNNING" ? POLL_MS : false,
  });
}

/** 검토할 run 과 그 작업본. 검토 창을 열 때 읽는다 */
export function useRefreshReview(
  projectId: string,
  runId: string,
  enabled: boolean,
) {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.refreshReview(projectId, runId),
    queryFn: () => services.refresh.review(projectId, runId),
    enabled,
    // 작업본은 자동 저장으로 바뀌므로, 창을 다시 열 때마다 서버의 지금 모습을 읽는다.
    staleTime: 0,
    gcTime: 0,
    // 검토 중 입력은 로컬에 있을 수 있다. 재로그인한 탭에서 돌아와도 덮어쓰지 않는다.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

/**
 * 최신화가 문서 잠금을 걸거나 풀었다. 파일 트리·검색의 잠김 표시와 열린 문서의 편집 가능 여부를 다시
 * 읽는다.
 */
export async function refreshLocksChanged(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  await Promise.all([
    invalidateProjectContent(queryClient, projectId),
    queryClient.invalidateQueries({ queryKey: ["document"] }),
  ]);
}

/** 적용 완료를 확인한 뒤 문서·그래프·잠금·버전 기록을 함께 갱신한다. */
export async function refreshApplied(
  queryClient: ReturnType<typeof useQueryClient>,
  projectId: string,
) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.refresh(projectId) }),
    queryClient.invalidateQueries({ queryKey: ["versions"] }),
    refreshLocksChanged(queryClient, projectId),
  ]);
}

export function useRefreshActions(projectId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  const reload = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.refresh(projectId) });
  return {
    start: useMutation({
      mutationFn: () => services.refresh.start(projectId),
      onSuccess: async (started) => {
        if (started.run)
          queryClient.setQueryData(queryKeys.refresh(projectId), started.run);
        await refreshLocksChanged(queryClient, projectId);
      },
      // 다른 탭·기기에서 이미 시작했거나 검토를 기다린다. 그 상태를 읽어 와 맞는 버튼을 보인다.
      onError: reload,
    }),
    confirm: useMutation({
      mutationFn: (runId: string) => services.refresh.confirm(projectId, runId),
      onSuccess: () => refreshApplied(queryClient, projectId),
    }),
  };
}
