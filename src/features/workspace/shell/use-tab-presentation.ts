"use client";

import { useCallback, useMemo } from "react";

import type { IconName } from "@/design-system/icons/icon";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";

import type { WorkspaceTarget } from "../model/layout";
import { indexNodes, isDocument } from "../model/tree";
import { useFileTree } from "../queries";
import { WORKSPACE_VIEWS } from "../views/registry";
import { tabKey, useWorkspace } from "../workspace-context";

export function useTabPresentation() {
  const { projectId, tabLabels } = useWorkspace();
  const tree = useFileTree(projectId);
  const index = useMemo(() => indexNodes(tree.data ?? []), [tree.data]);
  return useCallback(
    (
      target: WorkspaceTarget,
      paneId: string,
    ): { icon: IconName; title: string } => {
      if (target.kind !== "file") {
        const label = tabLabels.get(tabKey(paneId, target.kind));
        if (label) return label;
        const view = WORKSPACE_VIEWS[target.kind];
        return { icon: view.icon, title: view.title };
      }
      const node = index.get(target.fileId);
      if (isDocument(node)) {
        return {
          icon: DOCUMENT_TYPE_META[node.docType].entityIcon,
          title: node.title,
        };
      }
      return {
        icon: "file",
        title: tree.isPending ? "불러오는 중" : "찾을 수 없는 파일",
      };
    },
    [index, tree.isPending, tabLabels],
  );
}
