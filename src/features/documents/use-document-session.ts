"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, useSyncExternalStore } from "react";

import { invalidateProjectContent, queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

import { useSessionAccess } from "@/features/auth/session-access";
import { draftRecovery, registerDraft } from "./draft-recovery";
import { DocumentSession } from "./document-session";

export function useDocumentSession(fileId: string) {
  const services = useServices();
  const access = useSessionAccess();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: queryKeys.document(fileId),
    queryFn: () => services.documents.get(fileId),
    staleTime: Infinity,
    enabled: !access.blocked,
  });

  const [session] = useState(
    () =>
      new DocumentSession(
        fileId,
        services.documents,
        (outcome) => {
          queryClient.setQueryData(queryKeys.document(fileId), outcome.content);
          const projectId = outcome.content.projectId;
          if (outcome.titleChanged || outcome.relationsChanged) {
            void invalidateProjectContent(queryClient, projectId);
          } else {
            void queryClient.invalidateQueries({
              queryKey: ["search", projectId],
            });
          }
        },
        undefined,
        access.userId ? draftRecovery(access.userId, fileId) : undefined,
      ),
  );

  useEffect(
    () => registerDraft(fileId, () => session.recoverySnapshot()),
    [fileId, session],
  );
  useEffect(() => {
    if (access.blocked) session.pause();
  }, [access.blocked, session]);

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
