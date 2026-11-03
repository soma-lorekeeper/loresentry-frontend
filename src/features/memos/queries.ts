"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { Memo, MemoScope } from "@/domain/models";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { withUsageAction } from "@/features/analytics/usage-analytics";

export function useMemos(
  projectId: string,
  scope: MemoScope,
  fileId: string | null = null,
  enabled = true,
) {
  const services = useServices();
  return useQuery({
    enabled,
    queryKey: queryKeys.memos(projectId, scope, fileId),
    queryFn: () => services.memos.list(projectId, scope, fileId ?? undefined),
  });
}

function useInvalidateMemos(projectId: string) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["memos", projectId] });
}

export function useCreateMemo(projectId: string) {
  const services = useServices();
  const invalidate = useInvalidateMemos(projectId);
  return useMutation({
    mutationFn: (input: {
      scope: MemoScope;
      fileId: string | null;
      body: string;
    }) =>
      withUsageAction(
        "memo",
        "create",
        () => services.memos.create({ projectId, ...input }),
        { memo_scope: input.scope, entry_point: "memo_panel" },
      ),
    onSuccess: invalidate,
  });
}

export function useUpdateMemo(projectId: string, scope?: MemoScope) {
  const services = useServices();
  const invalidate = useInvalidateMemos(projectId);
  return useMutation({
    mutationFn: (input: { memoId: string; body: string }) =>
      withUsageAction(
        "memo",
        "update",
        () => services.memos.update(input.memoId, input.body),
        { entry_point: "memo_panel", memo_scope: scope },
      ),
    onSuccess: invalidate,
  });
}

export function useRemoveMemo(projectId: string, scope?: MemoScope) {
  const services = useServices();
  const invalidate = useInvalidateMemos(projectId);
  return useMutation({
    mutationFn: (memoId: string) =>
      withUsageAction("memo", "delete", () => services.memos.remove(memoId), {
        entry_point: "memo_panel",
        memo_scope: scope,
      }),
    onSuccess: invalidate,
  });
}

export function memoHeadline(body: string, max = 24) {
  const first = body.trim().split(/(?<=[.!?。])\s|\n/)[0] ?? "";
  return first.length > max ? `${first.slice(0, max)}…` : first;
}

export function memoTitle(memo: Pick<Memo, "title" | "body">) {
  const title = memo.title.trim();
  if (!title || memo.body.trim().startsWith(title)) return "";
  return title;
}
