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
        } else {
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
