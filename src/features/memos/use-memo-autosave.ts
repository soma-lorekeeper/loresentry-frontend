"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Memo, MemoScope } from "@/domain/models";
import { useServices } from "@/services/services-context";

export const MEMO_SAVE_DELAY_MS = 700;

export type MemoSaveStatus = "empty" | "saved" | "pending" | "saving" | "error";

interface AutosaveOptions {
  projectId: string;
  scope: MemoScope;
  fileId: string | null;
  memo: Memo | null;
}

// 서버 가정: 메모는 본문 전체를 PATCH로 덮어쓰며 버전 충돌 검사는 하지 않는다(마지막 저장 우선).
export function useMemoAutosave({
  projectId,
  scope,
  fileId,
  memo,
}: AutosaveOptions) {
  const services = useServices();
  const queryClient = useQueryClient();
  const [body, setBody] = useState(memo?.body ?? "");
  const [status, setStatus] = useState<MemoSaveStatus>(
    memo?.body ? "saved" : "empty",
  );
  const idRef = useRef<string | null>(memo?.id ?? null);
  const latest = useRef(body);
  const saved = useRef(memo?.body ?? "");
  const inFlight = useRef(false);
  const timer = useRef<number | null>(null);

  const flush = useCallback(async () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current || latest.current === saved.current) return;
    inFlight.current = true;
    setStatus("saving");
    try {
      while (latest.current !== saved.current) {
        const next = latest.current;
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
        saved.current = next;
      }
      setStatus(saved.current ? "saved" : "empty");
      void queryClient.invalidateQueries({ queryKey: ["memos", projectId] });
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }, [fileId, projectId, queryClient, scope, services]);

  const change = (value: string) => {
    setBody(value);
    latest.current = value;
    setStatus(
      value === saved.current ? (value ? "saved" : "empty") : "pending",
    );
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), MEMO_SAVE_DELAY_MS);
  };

  useEffect(
    () => () => {
      if (latest.current !== saved.current) void flush();
    },
    [flush],
  );

  return { body, status, change, retry: flush, flush };
}
