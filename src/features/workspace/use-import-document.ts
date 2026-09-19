"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useToast } from "@/design-system/primitives";
import type { DocumentNode } from "@/domain/models";
import { invalidateProjectContent } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export const IMPORT_ACCEPT = ".txt,.md,.markdown,text/plain,text/markdown";

// 요구사항 §4.2: 외부 파일을 원고로 가져온다. DOCX 등 지원 범위는 미확정이라 지금은 텍스트 형식만 받는다.
export function useImportDocument(projectId: string) {
  const services = useServices();
  const queryClient = useQueryClient();
  const toast = useToast();

  return useCallback(
    async (file: File, parentId: string): Promise<DocumentNode | null> => {
      try {
        const text = await file.text();
        const title =
          file.name.replace(/\.(txt|md|markdown)$/i, "") || "가져온 원고";
        const node = await services.files.create({
          projectId,
          parentId,
          kind: "document",
          docType: "manuscript",
          title,
        });
        const doc = await services.documents.get(node.id);
        await services.documents.save(node.id, {
          draft: { title: doc.title, bodyMd: text, properties: doc.properties },
          ifMatchRevision: doc.revisionNo,
          saveId: crypto.randomUUID(),
        });
        await invalidateProjectContent(queryClient, projectId);
        toast({
          icon: "upload",
          title: "원고를 가져왔어요.",
          description: title,
        });
        return node as DocumentNode;
      } catch {
        toast({
          icon: "triangle-alert",
          title: "파일을 가져오지 못했어요.",
          description: "텍스트(.txt)나 마크다운(.md) 파일인지 확인해 주세요.",
        });
        return null;
      }
    },
    [projectId, queryClient, services, toast],
  );
}
