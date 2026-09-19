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

// 아직 id 가 없는 파일 메모를 만드는 중인 요청. 편집기가 그사이 다시 마운트되어도
// 같은 메모를 두 번 만들지 않도록 파일마다 한 요청만 둔다.
const pendingCreates = new Map<string, Promise<Memo>>();

function isClean(status: MemoSaveStatus) {
  return status === "saved" || status === "empty";
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
  const [seen, setSeen] = useState(memo ? `${memo.id}@${memo.updatedAt}` : "");
  const idRef = useRef<string | null>(memo?.id ?? null);
  const latest = useRef(body);
  const saved = useRef(memo?.body ?? "");
  const inFlight = useRef(false);
  const timer = useRef<number | null>(null);
  const createKey =
    scope === "file" && fileId ? `${projectId}:${fileId}` : null;

  // 다른 편집기(메모 탭·메모 패널)가 같은 메모를 저장했으면, 이쪽이 편집 중이 아닐 때
  // 새 값으로 맞춘다. 편집 중이면 이쪽 저장이 마지막 저장으로 이긴다.
  const incoming = memo ? `${memo.id}@${memo.updatedAt}` : "";
  if (memo && incoming !== seen && isClean(status)) {
    setSeen(incoming);
    setBody(memo.body);
    setStatus(memo.body ? "saved" : "empty");
  }

  useEffect(() => {
    if (!memo || inFlight.current || latest.current !== saved.current) return;
    idRef.current = memo.id;
    saved.current = memo.body;
    latest.current = memo.body;
  }, [memo]);

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
        if (!idRef.current && createKey && pendingCreates.has(createKey)) {
          idRef.current = (await pendingCreates.get(createKey)!).id;
        }
        if (idRef.current) {
          await services.memos.update(idRef.current, next);
        } else {
          const request = services.memos.create({
            projectId,
            scope,
            fileId,
            body: next,
          });
          if (createKey) pendingCreates.set(createKey, request);
          try {
            idRef.current = (await request).id;
          } finally {
            if (createKey) pendingCreates.delete(createKey);
          }
        }
        saved.current = next;
      }
      setStatus(saved.current ? "saved" : "empty");
      await queryClient.invalidateQueries({ queryKey: ["memos", projectId] });
    } catch {
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }, [createKey, fileId, projectId, queryClient, scope, services]);

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
