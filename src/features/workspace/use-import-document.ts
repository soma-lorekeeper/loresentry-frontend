"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef, type ChangeEvent } from "react";

import { useToast } from "@/design-system/primitives";
import type { DocumentNode, FileNode } from "@/domain/models";
import { t } from "@/i18n";
import { invalidateProjectContent } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { bodyFromPlainText } from "@/domain/document-body";
import { markdownToBody } from "@/features/documents/editor/body-markdown";

import { categoryFolderOf } from "./model/tree";

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
          file.name.replace(/\.(txt|md|markdown)$/i, "") || t("가져온 원고");
        const node = await services.files.create({
          projectId,
          parentId,
          kind: "document",
          docType: "manuscript",
          title,
        });
        const doc = await services.documents.get(node.id);
        await services.documents.save(node.id, {
          draft: {
            title: doc.title,
            // `.md` 는 서식을 살려 들여오고, `.txt` 는 줄마다 문단이다.
            body: file.name.endsWith(".md")
              ? markdownToBody(text)
              : bodyFromPlainText(text),
            properties: doc.properties,
          },
          ifMatchRevision: doc.revisionNo,
          saveId: crypto.randomUUID(),
        });
        await invalidateProjectContent(queryClient, projectId);
        toast({
          icon: "upload",
          title: t("원고를 가져왔어요."),
          description: title,
        });
        return node as DocumentNode;
      } catch {
        toast({
          icon: "triangle-alert",
          title: t("파일을 가져오지 못했어요."),
          description: t(
            "텍스트(.txt)나 마크다운(.md) 파일인지 확인해 주세요.",
          ),
        });
        return null;
      }
    },
    [projectId, queryClient, services, toast],
  );
}

/**
 * 파일을 고르는 것부터 가져온 원고를 넘겨주는 것까지. 새 탭의 "가져오기"와 사이드바의
 * "가져오기"가 같은 동작이어야 해서 한 곳에 둔다.
 *
 * <p>브라우저의 파일 선택 창은 `<input type="file">` 을 눌러야만 열린다. 그래서 숨긴 input 에
 * `inputProps` 를 펼쳐 두고, 보이는 버튼은 `pick` 을 부른다. 가져온 원고는 원고 폴더에 들어간다.
 */
export function useImportPicker(
  projectId: string,
  nodes: readonly FileNode[],
  onImported: (node: DocumentNode) => void,
) {
  const importDocument = useImportDocument(projectId);
  const inputRef = useRef<HTMLInputElement>(null);

  const onChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // 같은 파일을 다시 골라도 change 가 나도록 값을 비운다.
    event.target.value = "";
    const parent = categoryFolderOf(nodes, "manuscript");
    if (!file || !parent) return;
    const node = await importDocument(file, parent.id);
    if (node) onImported(node);
  };

  return {
    pick: () => inputRef.current?.click(),
    inputProps: {
      ref: inputRef,
      type: "file",
      accept: IMPORT_ACCEPT,
      hidden: true,
      onChange,
    } as const,
  };
}
