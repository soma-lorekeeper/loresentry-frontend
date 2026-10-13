"use client";

import { useCallback, useMemo } from "react";

import type { IconName } from "@/design-system/icons/icon";
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import { t } from "@/i18n";

import type { WorkspaceTarget } from "../model/layout";
import { indexNodes, isDocument } from "../model/tree";
import { useFileTree } from "../queries";
import { WORKSPACE_VIEWS } from "../views/registry";
import { useWorkspace } from "../workspace-context";

export function useTabPresentation() {
  const { projectId } = useWorkspace();
  const tree = useFileTree(projectId);
  const index = useMemo(() => indexNodes(tree.data ?? []), [tree.data]);
  return useCallback(
    (
      target: WorkspaceTarget,
    ): {
      icon: IconName;
      title: string;
      /** 문서 탭이면 그 문서의 종류. 탭 아이콘이 종류 색을 받는 데 쓴다. */
      kind?: DocumentType;
    } => {
      if (target.kind !== "file") {
        const view = WORKSPACE_VIEWS[target.kind];
        return { icon: view.icon, title: view.title };
      }
      const node = index.get(target.fileId);
      if (isDocument(node)) {
        return {
          icon: DOCUMENT_TYPE_META[node.docType].entityIcon,
          title: node.title,
          kind: node.docType,
        };
      }
      return {
        icon: "file",
        title: tree.isPending
          ? t("작업공간::불러오는 중")
          : t("찾을 수 없는 파일"),
      };
    },
    [index, tree.isPending],
  );
}
