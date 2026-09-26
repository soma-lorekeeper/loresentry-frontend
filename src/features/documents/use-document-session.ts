"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";

import { invalidateProjectContent, queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

import { DocumentSession } from "./document-session";

export function useDocumentSession(fileId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.document(fileId),
    queryFn: () => services.documents.get(fileId),
    staleTime: Infinity,
  });

  const [session] = useState(
    () =>
      new DocumentSession(fileId, services.documents, (outcome) => {
        queryClient.setQueryData(queryKeys.document(fileId), outcome.content);
        const projectId = outcome.content.projectId;
        if (outcome.titleChanged || outcome.relationsChanged) {
          void invalidateProjectContent(queryClient, projectId);
        }
        if (outcome.relationsChanged) {
          // 관계는 양방향이다. 서버가 반대쪽 문서에도 행을 넣으므로, 열어 둔 다른 탭이 그 문서를
          // 붙들고 있으면 새 관계를 모른 채 저장해 방금 만든 관계를 지운다.
          void queryClient.invalidateQueries({ queryKey: ["document"] });
        }
        if (!outcome.titleChanged && !outcome.relationsChanged) {
          void queryClient.invalidateQueries({
            queryKey: ["search", projectId],
          });
        }
      }),
  );

  useEffect(() => {
    if (query.data) session.hydrate(query.data);
  }, [query.data, session]);

  useEffect(() => {
    const flush = () => {
      if (document.visibilityState === "hidden") void session.save();
    };
    document.addEventListener("visibilitychange", flush);
    return () => {
      document.removeEventListener("visibilitychange", flush);
      void session.dispose();
    };
  }, [session]);

  const snapshot = useSyncExternalStore(
    session.subscribe,
    session.getSnapshot,
    session.getSnapshot,
  );

  return { session, query, content: query.data, ...snapshot };
}

export type DocumentSessionState = ReturnType<typeof useDocumentSession>;
