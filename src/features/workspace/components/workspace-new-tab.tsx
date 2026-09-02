"use client";

import { useState } from "react";

import { Button, StatusNotice } from "@/components/ui";

import { WorkspaceIcon, type WorkspaceIconName } from "../icons";
import type { WorkspaceNavItem } from "../workspace-data";
import styles from "./workspace.module.css";

export interface RecentWorkspaceFile {
  item: WorkspaceNavItem;
  meta: string;
}

const createActions: Array<{
  icon: WorkspaceIconName;
  label: string;
}> = [
  { icon: "file", label: "원고" },
  { icon: "settings", label: "설정" },
  { icon: "character", label: "캐릭터" },
  { icon: "history", label: "이벤트" },
  { icon: "book", label: "조직" },
  { icon: "sparkles", label: "아이템" },
  { icon: "home", label: "장소" },
  { icon: "graph", label: "세계관" },
];

export const defaultRecentFiles: RecentWorkspaceFile[] = [
  {
    item: {
      contentId: "manuscript-12",
      icon: "file",
      id: "file-manuscript-12",
      kind: "file",
      label: "12화 · 균열의 밤",
    },
    meta: "원고 · 1분 전",
  },
  {
    item: {
      icon: "settings",
      id: "setting",
      kind: "file",
      label: "왕도 지도",
    },
    meta: "설정 · 2분 전",
  },
  {
    item: {
      icon: "character",
      id: "character",
      kind: "file",
      label: "서윤",
    },
    meta: "캐릭터 · 어제",
  },
];

export interface WorkspaceNewTabProps {
  onCreateFile: (fileType: string, icon: WorkspaceIconName) => void;
  onOpenFile: (item: WorkspaceNavItem) => void;
  projectName: string;
  recentFiles?: RecentWorkspaceFile[];
}

export function WorkspaceNewTab({
  onCreateFile,
  onOpenFile,
  projectName,
  recentFiles = defaultRecentFiles,
}: WorkspaceNewTabProps) {
  const [importStarted, setImportStarted] = useState(false);
  const lastFile = recentFiles[0];

  return (
    <section
      aria-labelledby="tab-new-tab"
      className={styles.newTabView}
      id="panel-new-tab"
      role="tabpanel"
      tabIndex={-1}
    >
      <div className={styles.newTabContent}>
        <header className={styles.newTabHeading}>
          <span className={styles.eyebrow}>현재 프로젝트</span>
          <h1>{projectName}</h1>
          <p>이어서 작업하거나 새 파일을 만들어 이야기를 계속하세요.</p>
        </header>

        <section
          aria-labelledby="resume-heading"
          className={styles.resumeBanner}
        >
          <div className={styles.resumeCopy}>
            <span className={styles.eyebrow} id="resume-heading">
              {lastFile ? "마지막으로 작업한 파일" : "시작하기"}
            </span>
            <strong>
              {lastFile ? lastFile.item.label : "아직 작업한 파일이 없습니다"}
            </strong>
            <span>
              {lastFile
                ? `${lastFile.meta} · 마지막 편집 위치에서 이어집니다.`
                : "첫 파일을 만들어 시작하세요."}
            </span>
          </div>
          {lastFile ? (
            <Button
              aria-label={`${lastFile.item.label} 이어서 작업하기`}
              icon={<WorkspaceIcon name="chevron-right" />}
              onClick={() => onOpenFile(lastFile.item)}
              variant="primary"
            >
              이어서 작업하기
            </Button>
          ) : (
            <Button
              icon={<WorkspaceIcon name="plus" />}
              onClick={() => onCreateFile("원고", "file")}
              variant="primary"
            >
              원고 만들기
            </Button>
          )}
        </section>

        <section
          aria-labelledby="create-heading"
          className={styles.newTabSection}
        >
          <div className={styles.newTabSectionHeading}>
            <div>
              <h2 id="create-heading">새로 만들기</h2>
              <p>필요한 파일 유형을 선택하세요.</p>
            </div>
            <Button
              icon={<WorkspaceIcon name="download" />}
              onClick={() => setImportStarted(true)}
              variant="ghost"
            >
              가져오기
            </Button>
          </div>
          <div className={styles.createActionGrid}>
            {createActions.map((action) => (
              <button
                aria-label={`${action.label} 만들기`}
                className={styles.createAction}
                key={action.label}
                onClick={() => onCreateFile(action.label, action.icon)}
                type="button"
              >
                <span className={styles.createActionIcon}>
                  <WorkspaceIcon name={action.icon} />
                </span>
                <span>{action.label}</span>
              </button>
            ))}
          </div>
          {importStarted && (
            <StatusNotice>
              현재 프로젝트의 파일 가져오기를 시작했습니다.
            </StatusNotice>
          )}
        </section>

        <section
          aria-labelledby="recent-heading"
          className={styles.newTabSection}
        >
          <div className={styles.newTabSectionHeading}>
            <div>
              <h2 id="recent-heading">최근에 연 파일</h2>
              <p>현재 프로젝트에서 최근에 연 순서입니다.</p>
            </div>
          </div>
          {recentFiles.length > 0 ? (
            <ul aria-label="최근에 연 파일" className={styles.recentFileList}>
              {recentFiles.map((recentFile) => (
                <li key={recentFile.item.id}>
                  <button
                    aria-label={`${recentFile.item.label}, ${recentFile.meta}`}
                    className={styles.recentFileRow}
                    onClick={() => onOpenFile(recentFile.item)}
                    type="button"
                  >
                    <WorkspaceIcon name={recentFile.item.icon} />
                    <strong>{recentFile.item.label}</strong>
                    <span>{recentFile.meta}</span>
                    <WorkspaceIcon name="chevron-right" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.recentEmpty} role="status">
              <WorkspaceIcon name="history" />
              <div>
                <strong>최근에 연 파일이 없습니다</strong>
                <span>파일을 열면 이곳에서 빠르게 다시 찾을 수 있습니다.</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
