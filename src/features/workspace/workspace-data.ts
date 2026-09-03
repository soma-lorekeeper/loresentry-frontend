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

export const projects: ProjectSummary[] = [
  { id: "glass-garden", name: "유리 정원의 기록" },
  { id: "other-project", name: "다른 프로젝트" },
];

export const primaryNavigation: WorkspaceNavItem[] = [
  { id: "search", label: "검색", icon: "search", kind: "navigation" },
  { id: "graph", label: "그래프", icon: "graph", kind: "navigation" },
  { id: "memo", label: "메모", icon: "memo", kind: "navigation" },
];

export const favoriteItems: WorkspaceNavItem[] = [
  {
    id: "favorite-manuscript-12",
    contentId: "manuscript-12",
    label: "12화 · 균열의 밤",
    icon: "file",
    kind: "file",
  },
];

export const fileItems: WorkspaceNavItem[] = [
  {
    id: "folder-manuscript",
    label: "원고",
    icon: "folder",
    kind: "folder",
  },
  {
    id: "file-manuscript-12",
    contentId: "manuscript-12",
    label: "12화 · 균열의 밤",
    icon: "file",
    kind: "file",
    level: 1,
    parentId: "folder-manuscript",
  },
  {
    id: "file-manuscript-11",
    contentId: "manuscript-11",
    label: "11화 · 유리 정원",
    icon: "file",
    kind: "file",
    level: 1,
    parentId: "folder-manuscript",
  },
  { id: "setting", label: "설정", icon: "setting-file", kind: "file" },
  { id: "character", label: "캐릭터", icon: "character", kind: "file" },
  { id: "event", label: "균열의 밤", icon: "event", kind: "file" },
  {
    id: "organization",
    label: "정원 기록단",
    icon: "organization",
    kind: "file",
  },
  { id: "item", label: "은빛 등불", icon: "item", kind: "file" },
  { id: "place", label: "북쪽 온실", icon: "place", kind: "file" },
  { id: "worldbuilding", label: "세계관", icon: "worldbuilding", kind: "file" },
];

export const utilityNavigation: WorkspaceNavItem[] = [
  { id: "trash", label: "휴지통", icon: "trash", kind: "navigation" },
  { id: "settings", label: "설정", icon: "settings", kind: "navigation" },
  { id: "help", label: "도움말", icon: "help", kind: "navigation" },
];
