import { FileTrashView } from "@/features/file-trash/file-trash-view";
import { GraphView } from "@/features/graph/graph-view";
import { TimelineView } from "@/features/timeline/timeline-view";
import { WorkspaceHelpView } from "@/features/help/workspace-help-view";
import { MemoView } from "@/features/memos/memo-view";
import { ProjectSettingsView } from "@/features/project-settings/project-settings-view";
import { t } from "@/i18n";

import type { WorkspaceViewKind } from "../model/layout";
import { NewTabView } from "./new-tab-view";
import type { WorkspaceViewDefinition } from "./view-types";

export const WORKSPACE_VIEWS: Record<
  WorkspaceViewKind,
  WorkspaceViewDefinition
> = {
  new: {
    kind: "new",
    icon: "home",
    title: t("작업공간::새 탭"),
    render: () => <NewTabView />,
  },
  graph: {
    kind: "graph",
    icon: "waypoints",
    title: t("작업공간::그래프"),
    render: () => <GraphView />,
  },
  timeline: {
    kind: "timeline",
    icon: "chart-no-axes-gantt",
    title: t("작업공간::타임라인"),
    render: () => <TimelineView />,
  },
  memo: {
    kind: "memo",
    icon: "notebook-pen",
    title: t("작업공간::메모"),
    render: () => <MemoView />,
  },
  trash: {
    kind: "trash",
    icon: "trash-2",
    title: t("작업공간::휴지통"),
    render: () => <FileTrashView />,
  },
  settings: {
    kind: "settings",
    icon: "settings",
    title: t("프로젝트 설정"),
    render: (props) => <ProjectSettingsView {...props} />,
  },
  help: {
    kind: "help",
    icon: "book-open",
    title: t("작업공간::사용 가이드"),
    render: () => <WorkspaceHelpView />,
  },
};
