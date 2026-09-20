"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Memo, MemoScope } from "@/domain/models";
import { useServices } from "@/services/services-context";

export type MemoDraftStatus = "empty" | "saved" | "dirty" | "saving" | "error";

interface DraftOptions {
  projectId: string;
  scope: MemoScope;
  fileId: string | null;
  memo: Memo | null;
}

function isClean(status: MemoDraftStatus) {
  return status === "saved" || status === "empty";
}

/**
 * 메모 초안. **저장 단추를 누를 때만** 서버로 보낸다.
 *
 * 문서 본문과 달리 메모는 자동 저장하지 않는다 — 떠오른 대로 적어 두는 자리라
 * 쓰다 만 문장이 그대로 남는 편이 낫고, 언제 저장됐는지도 눈에 보여야 한다.
 *
 * 서버 가정: 메모는 본문 전체를 덮어쓰며 버전 충돌을 검사하지 않는다(마지막 저장 우선).
 */
export function useMemoDraft({ projectId, scope, fileId, memo }: DraftOptions) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [body, setBody] = useState(memo?.body ?? "");
  const [status, setStatus] = useState<MemoDraftStatus>(
    memo?.body ? "saved" : "empty",
  );
  const [seen, setSeen] = useState(memo ? `${memo.id}@${memo.updatedAt}` : "");
  const idRef = useRef<string | null>(memo?.id ?? null);
  const savedRef = useRef(memo?.body ?? "");

  // 다른 편집기(메모 탭·메모 패널)가 같은 메모를 저장했으면, 이쪽이 고치는 중이
  // 아닐 때 새 값으로 맞춘다.
  const incoming = memo ? `${memo.id}@${memo.updatedAt}` : "";
  if (memo && incoming !== seen && isClean(status)) {
    setSeen(incoming);
    setBody(memo.body);
    setStatus(memo.body ? "saved" : "empty");
  }

  useEffect(() => {
    if (!memo || !isClean(status)) return;
    idRef.current = memo.id;
    savedRef.current = memo.body;
  }, [memo, status]);

  const change = (value: string) => {
    setBody(value);
    setStatus(
      value === savedRef.current ? (value ? "saved" : "empty") : "dirty",
    );
  };

  const save = useCallback(async () => {
    const next = body;
    if (next === savedRef.current) return;
    setStatus("saving");
    try {
      if (idRef.current) {
        await services.memos.update(idRef.current, next);
      } else {
        const created = await services.memos.create({
          projectId,
          scope,
          fileId,
          body: next,
        });
        idRef.current = created.id;
      }
      savedRef.current = next;
      setStatus(next ? "saved" : "empty");
      await queryClient.invalidateQueries({ queryKey: ["memos", projectId] });
    } catch {
      setStatus("error");
    }
  }, [body, fileId, projectId, queryClient, scope, services]);

  return { body, status, change, save, dirty: !isClean(status) };
}
