import type { WorkspaceIconName } from "./icons";

export interface ProjectSummary {
  id: string;
  name: string;
}

export interface WorkspaceNavItem {
  contentId?: string;
  icon: WorkspaceIconName;
  id: string;
  label: string;
  level?: number;
}

export const projects: ProjectSummary[] = [
  { id: "glass-garden", name: "유리 정원의 기록" },
  { id: "other-project", name: "다른 프로젝트" },
];

export const primaryNavigation: WorkspaceNavItem[] = [
  { id: "search", label: "검색", icon: "search" },
  { id: "graph", label: "그래프", icon: "graph" },
  { id: "memo", label: "메모", icon: "memo" },
];

export const favoriteItems: WorkspaceNavItem[] = [
  {
    id: "favorite-manuscript-12",
    contentId: "manuscript-12",
    label: "12화 · 균열의 밤",
    icon: "file",
  },
];

export const fileItems: WorkspaceNavItem[] = [
  { id: "folder-manuscript", label: "원고", icon: "folder" },
  {
    id: "file-manuscript-12",
    contentId: "manuscript-12",
    label: "12화 · 균열의 밤",
    icon: "file",
    level: 1,
  },
  {
    id: "file-manuscript-11",
    contentId: "manuscript-11",
    label: "11화 · 유리 정원",
    icon: "file",
    level: 1,
  },
  { id: "setting", label: "설정", icon: "settings" },
  { id: "character", label: "캐릭터", icon: "character" },
];

export const utilityNavigation: WorkspaceNavItem[] = [
  { id: "trash", label: "휴지통", icon: "trash" },
  { id: "settings", label: "설정", icon: "settings" },
  { id: "help", label: "도움말", icon: "help" },
];
