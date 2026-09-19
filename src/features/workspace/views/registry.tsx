import { FileTrashView } from "@/features/file-trash/file-trash-view";
import { WorkspaceHelpView } from "@/features/help/workspace-help-view";
import { ProjectSettingsView } from "@/features/project-settings/project-settings-view";
import { SearchView } from "@/features/search/search-view";

import type { WorkspaceViewKind } from "../model/layout";
import { NewTabView } from "./new-tab-view";
import { PlannedView } from "./planned-view";
import type { WorkspaceViewDefinition } from "./view-types";

export const WORKSPACE_VIEWS: Record<
  WorkspaceViewKind,
  WorkspaceViewDefinition
> = {
  new: {
    kind: "new",
    icon: "home",
    title: "새 탭",
    render: () => <NewTabView />,
  },
  search: {
    kind: "search",
    icon: "search",
    title: "검색",
    render: () => <SearchView />,
  },
  graph: {
    kind: "graph",
    icon: "waypoints",
    title: "그래프",
    render: () => <PlannedView title="그래프" />,
  },
  timeline: {
    kind: "timeline",
    icon: "chart-no-axes-gantt",
    title: "타임라인",
    render: () => <PlannedView title="타임라인" />,
  },
  memo: {
    kind: "memo",
    icon: "notebook-pen",
    title: "메모",
    render: () => <PlannedView title="메모" />,
  },
  trash: {
    kind: "trash",
    icon: "trash-2",
    title: "휴지통",
    render: () => <FileTrashView />,
  },
  settings: {
    kind: "settings",
    icon: "settings",
    title: "프로젝트 설정",
    render: (props) => <ProjectSettingsView {...props} />,
  },
  help: {
    kind: "help",
    icon: "circle-help",
    title: "도움말",
    render: (props) => <WorkspaceHelpView {...props} />,
  },
};
