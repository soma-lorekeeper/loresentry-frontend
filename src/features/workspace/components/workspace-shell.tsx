"use client";

import { useMemo, useState } from "react";

import { IconButton, StatusNotice } from "@/components/ui";

import { WorkspaceIcon } from "../icons";
import {
  favoriteItems,
  fileItems,
  primaryNavigation,
  projects,
  utilityNavigation,
  type WorkspaceNavItem,
} from "../workspace-data";
import { WorkspaceSidebar } from "./workspace-sidebar";
import styles from "./workspace.module.css";

const allTargets = [
  ...primaryNavigation,
  ...favoriteItems,
  ...fileItems,
  ...utilityNavigation,
];

export interface WorkspaceShellProps {
  initialProjectId: string;
}

export function WorkspaceShell({ initialProjectId }: WorkspaceShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedId, setSelectedId] = useState("favorite-manuscript-12");
  const [currentProject, setCurrentProject] = useState(
    projects.find((project) => project.id === initialProjectId) ?? projects[0],
  );
  const selectedTarget = useMemo(
    () => allTargets.find((item) => item.id === selectedId) ?? allTargets[0],
    [selectedId],
  );

  const selectTarget = (item: WorkspaceNavItem) => setSelectedId(item.id);

  return (
    <div className={styles.shell} data-sidebar-open={sidebarOpen}>
      <div aria-hidden={!sidebarOpen} className={styles.sidebarSlot}>
        {sidebarOpen && (
          <WorkspaceSidebar
            currentProject={currentProject}
            onProjectSelect={setCurrentProject}
            onSelect={selectTarget}
            projects={projects}
            selectedId={selectedId}
            userName="서윤주"
          />
        )}
      </div>

      <main className={styles.workspaceMain}>
        <header className={styles.shellToolbar}>
          <IconButton
            aria-label={sidebarOpen ? "사이드바 닫기" : "사이드바 열기"}
            aria-pressed={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <WorkspaceIcon name="sidebar" />
          </IconButton>
          <span className={styles.toolbarContext}>{currentProject.name}</span>
        </header>
        <section
          aria-labelledby="workspace-content-title"
          className={styles.workspaceCanvas}
        >
          <div className={styles.canvasCopy}>
            <span className={styles.eyebrow}>현재 선택</span>
            <h1 id="workspace-content-title">{selectedTarget.label}</h1>
            <p>
              Workspace 셸과 탐색 상태를 검증하는 구현 화면입니다. 이후
              Atomic에서 탭, 파일 조작과 검색 결과를 이 영역에 연결합니다.
            </p>
            <StatusNotice>
              선택한 항목은 사이드바의 배경과 접근성 현재 위치로 함께
              표시됩니다.
            </StatusNotice>
          </div>
        </section>
      </main>
    </div>
  );
}
