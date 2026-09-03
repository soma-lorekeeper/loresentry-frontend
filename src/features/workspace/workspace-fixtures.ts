import type { ProjectFixtureId } from "@/features/projects/project-model";

import type { WorkspaceIconName } from "./icons";
import type { WorkspaceNavItem } from "./workspace-data";

export interface WorkspaceMockDocument {
  body: string;
  id: string;
  title: string;
}

export interface WorkspaceMockProject {
  id: ProjectFixtureId;
  name: string;
}

export interface WorkspaceMockTab {
  icon: WorkspaceIconName;
  id: string;
  isFile: true;
  label: string;
}

export interface WorkspaceMockFixture {
  favoriteItemIds: readonly string[];
  fileItems: readonly WorkspaceNavItem[];
  initialDocuments: readonly WorkspaceMockDocument[];
  initialTabs: readonly WorkspaceMockTab[];
  project: WorkspaceMockProject;
  selectedItemId: string;
}

export const workspaceMockFixtures = {
  "glass-garden": {
    favoriteItemIds: ["file-glass-chapter-17"],
    fileItems: [
      {
        icon: "folder",
        id: "folder-glass-manuscripts",
        kind: "folder",
        label: "원고",
      },
      {
        contentId: "glass-chapter-17",
        icon: "file",
        id: "file-glass-chapter-17",
        kind: "file",
        label: "제17장 · 돌아오지 않는 밤",
        parentId: "folder-glass-manuscripts",
      },
      {
        contentId: "glass-chapter-16",
        icon: "file",
        id: "file-glass-chapter-16",
        kind: "file",
        label: "제16장 · 유리 정원",
        parentId: "folder-glass-manuscripts",
      },
      {
        contentId: "glass-character-seoyun",
        icon: "character",
        id: "file-glass-character-seoyun",
        kind: "file",
        label: "서윤",
      },
      {
        contentId: "glass-place-greenhouse",
        icon: "place",
        id: "file-glass-place-greenhouse",
        kind: "file",
        label: "북쪽 온실",
      },
    ],
    initialDocuments: [
      {
        body: "정원은 밤이 오면 유리보다 먼저 숨을 죽였다. 서윤은 북쪽 온실을 향해 난 은빛 균열을 따라 걸었다.",
        id: "glass-chapter-17",
        title: "제17장 · 돌아오지 않는 밤",
      },
      {
        body: "유리 정원에 아침이 들면 밤새 맺힌 이슬이 작은 렌즈처럼 빛을 모았다.",
        id: "glass-chapter-16",
        title: "제16장 · 유리 정원",
      },
    ],
    initialTabs: [
      {
        icon: "file",
        id: "glass-chapter-17",
        isFile: true,
        label: "제17장 · 돌아오지 않는 밤",
      },
      {
        icon: "file",
        id: "glass-chapter-16",
        isFile: true,
        label: "제16장 · 유리 정원",
      },
    ],
    project: { id: "glass-garden", name: "유리 정원의 기록" },
    selectedItemId: "file-glass-chapter-17",
  },
  "winter-letter": {
    favoriteItemIds: ["file-winter-prologue"],
    fileItems: [
      {
        icon: "folder",
        id: "folder-winter-manuscripts",
        kind: "folder",
        label: "편지 원고",
      },
      {
        contentId: "winter-prologue",
        icon: "file",
        id: "file-winter-prologue",
        kind: "file",
        label: "서문 · 첫눈의 발신인",
        parentId: "folder-winter-manuscripts",
      },
      {
        contentId: "winter-letter-01",
        icon: "file",
        id: "file-winter-letter-01",
        kind: "file",
        label: "첫 번째 편지",
        parentId: "folder-winter-manuscripts",
      },
      {
        contentId: "winter-character-haein",
        icon: "character",
        id: "file-winter-character-haein",
        kind: "file",
        label: "해인",
      },
      {
        contentId: "winter-place-cabin",
        icon: "place",
        id: "file-winter-place-cabin",
        kind: "file",
        label: "눈 덮인 오두막",
      },
    ],
    initialDocuments: [
      {
        body: "첫눈이 내린 날, 수신인 없는 편지 한 통이 숲 가장자리 우체통에 놓여 있었다.",
        id: "winter-prologue",
        title: "서문 · 첫눈의 발신인",
      },
      {
        body: "해인에게. 이 편지가 도착했다면 숲은 아직 우리의 이름을 기억하고 있을 거야.",
        id: "winter-letter-01",
        title: "첫 번째 편지",
      },
    ],
    initialTabs: [
      {
        icon: "file",
        id: "winter-prologue",
        isFile: true,
        label: "서문 · 첫눈의 발신인",
      },
      {
        icon: "file",
        id: "winter-letter-01",
        isFile: true,
        label: "첫 번째 편지",
      },
    ],
    project: { id: "winter-letter", name: "겨울 숲에서 온 편지" },
    selectedItemId: "file-winter-prologue",
  },
  "orbit-record": {
    favoriteItemIds: ["file-orbit-log-08"],
    fileItems: [
      {
        icon: "folder",
        id: "folder-orbit-records",
        kind: "folder",
        label: "항해 기록",
      },
      {
        contentId: "orbit-log-08",
        icon: "file",
        id: "file-orbit-log-08",
        kind: "file",
        label: "기록 08 · 무중력 정거장",
        parentId: "folder-orbit-records",
      },
      {
        contentId: "orbit-log-07",
        icon: "file",
        id: "file-orbit-log-07",
        kind: "file",
        label: "기록 07 · 잃어버린 신호",
        parentId: "folder-orbit-records",
      },
      {
        contentId: "orbit-organization-archive",
        icon: "organization",
        id: "file-orbit-organization-archive",
        kind: "file",
        label: "궤도 기록국",
      },
      {
        contentId: "orbit-place-station",
        icon: "place",
        id: "file-orbit-place-station",
        kind: "file",
        label: "제4 정거장",
      },
    ],
    initialDocuments: [
      {
        body: "도시는 행성의 그림자를 벗어날 때마다 하루를 새로 셌다. 여덟 번째 기록은 정거장의 정전과 함께 시작되었다.",
        id: "orbit-log-08",
        title: "기록 08 · 무중력 정거장",
      },
      {
        body: "통신 기록에는 발신 좌표가 없었다. 신호는 도시 내부에서 오고 있었지만 누구도 송신기를 찾지 못했다.",
        id: "orbit-log-07",
        title: "기록 07 · 잃어버린 신호",
      },
    ],
    initialTabs: [
      {
        icon: "file",
        id: "orbit-log-08",
        isFile: true,
        label: "기록 08 · 무중력 정거장",
      },
      {
        icon: "file",
        id: "orbit-log-07",
        isFile: true,
        label: "기록 07 · 잃어버린 신호",
      },
    ],
    project: { id: "orbit-record", name: "궤도 도시 기록" },
    selectedItemId: "file-orbit-log-08",
  },
} as const satisfies Record<ProjectFixtureId, WorkspaceMockFixture>;
