import type { WorkspaceIconName } from "./icons";

export interface ProjectSummary {
  id: string;
  name: string;
}

export interface WorkspaceNavItem {
  contentId?: string;
  icon: WorkspaceIconName;
  id: string;
  kind?: "file" | "folder" | "navigation";
  label: string;
  level?: number;
  parentId?: string;
}

export const primaryNavigation: WorkspaceNavItem[] = [
  { id: "search", label: "검색", icon: "search", kind: "navigation" },
  { id: "graph", label: "그래프", icon: "graph", kind: "navigation" },
  { id: "memo", label: "메모", icon: "memo", kind: "navigation" },
];

export const utilityNavigation: WorkspaceNavItem[] = [
  { id: "trash", label: "휴지통", icon: "trash", kind: "navigation" },
  { id: "settings", label: "설정", icon: "settings", kind: "navigation" },
  { id: "help", label: "도움말", icon: "help", kind: "navigation" },
];
