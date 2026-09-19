"use client";

import { DocumentView } from "@/features/documents/document-view";

import type { WorkspaceViewProps } from "./view-types";

export function DocumentViewHost(
  props: WorkspaceViewProps & { fileId: string },
) {
  return (
    <DocumentView
      fileId={props.fileId}
      paneId={props.paneId}
      active={props.active}
    />
  );
}
