import type { ReactNode } from "react";

import type { IconName } from "@/design-system/icons/icon";

import type { WorkspaceTab, WorkspaceViewKind } from "../model/layout";

export interface WorkspaceViewProps {
  paneId: string;
  tab: WorkspaceTab;
  active: boolean;
}

export interface WorkspaceViewDefinition {
  kind: WorkspaceViewKind;
  icon: IconName;
  title: string;
  render: (props: WorkspaceViewProps) => ReactNode;
}
