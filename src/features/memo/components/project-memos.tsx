"use client";

import { type KeyboardEvent, useEffect, useRef } from "react";

import { IconButton } from "@/components/ui";
import type {
  FileMemo,
  MemoCollection,
  ProjectMemo,
} from "@/features/memo/memo-model";
import { WorkspaceIcon } from "@/features/workspace/icons";

import { MemoCard } from "./memo-card";
import styles from "./project-memos.module.css";

export type ProjectMemoScope = "file" | "project";

interface ProjectMemosProps {
  collection: MemoCollection;
  onAddProjectMemo: () => void;
  onFileMemoChange: (memo: FileMemo, body: string) => void;
  onProjectMemoBlur: (memo: ProjectMemo) => void;
  onProjectMemoChange: (memo: ProjectMemo, body: string) => void;
  onScopeChange: (scope: ProjectMemoScope) => void;
  pendingMemoId?: string;
  projectName: string;
  scope: ProjectMemoScope;
}

const scopes: ProjectMemoScope[] = ["project", "file"];

export function ProjectMemos({
  collection,
  onAddProjectMemo,
  onFileMemoChange,
  onProjectMemoBlur,
  onProjectMemoChange,
  onScopeChange,
  pendingMemoId,
  projectName,
  scope,
}: ProjectMemosProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const projectTabRef = useRef<HTMLButtonElement>(null);
  const fileTabRef = useRef<HTMLButtonElement>(null);
  const pendingInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [projectName]);

  useEffect(() => {
    if (!pendingMemoId) return;
    requestAnimationFrame(() => pendingInputRef.current?.focus());
  }, [pendingMemoId]);

  const changeScopeFromKeyboard = (
    event: KeyboardEvent<HTMLButtonElement>,
    current: ProjectMemoScope,
  ) => {
    let index = scopes.indexOf(current);
    if (event.key === "ArrowLeft") index -= 1;
    else if (event.key === "ArrowRight") index += 1;
    else if (event.key === "Home") index = 0;
    else if (event.key === "End") index = scopes.length - 1;
    else return;
    event.preventDefault();
    const next = scopes[(index + scopes.length) % scopes.length];
    onScopeChange(next);
    requestAnimationFrame(() =>
      (next === "project" ? projectTabRef : fileTabRef).current?.focus(),
    );
  };

  return (
    <section
      aria-labelledby="project-memos-heading"
      className={styles.screen}
      id="panel-memo"
      role="tabpanel"
      tabIndex={-1}
    >
      <header className={styles.pageHeader}>
        <div className={styles.titleGroup}>
          <h1 id="project-memos-heading" ref={headingRef} tabIndex={-1}>
            메모
          </h1>
          {scope === "project" && (
            <IconButton
              aria-label="프로젝트 메모 추가"
              onClick={onAddProjectMemo}
            >
              <WorkspaceIcon name="plus" />
            </IconButton>
          )}
        </div>
        <div
          aria-label="메모 범위"
          className={styles.scopeToggle}
          role="tablist"
        >
          <button
            aria-controls="project-memo-list"
            aria-selected={scope === "project"}
            id="project-memo-scope-tab"
            onClick={() => onScopeChange("project")}
            onKeyDown={(event) => changeScopeFromKeyboard(event, "project")}
            ref={projectTabRef}
            role="tab"
            tabIndex={scope === "project" ? 0 : -1}
            type="button"
          >
            프로젝트 메모
          </button>
          <button
            aria-controls="file-memo-list"
            aria-selected={scope === "file"}
            id="file-memo-scope-tab"
            onClick={() => onScopeChange("file")}
            onKeyDown={(event) => changeScopeFromKeyboard(event, "file")}
            ref={fileTabRef}
            role="tab"
            tabIndex={scope === "file" ? 0 : -1}
            type="button"
          >
            파일 메모
          </button>
        </div>
      </header>

      <section
        aria-labelledby="project-memo-scope-tab"
        className={styles.cardGrid}
        hidden={scope !== "project"}
        id="project-memo-list"
        role="tabpanel"
      >
        {collection.project.length > 0 ? (
          collection.project.map((memo, index) => (
            <MemoCard
              body={memo.body}
              key={memo.id}
              label={`프로젝트 메모 ${index + 1}`}
              onBlur={() => onProjectMemoBlur(memo)}
              onChange={(body) => onProjectMemoChange(memo, body)}
              ref={memo.id === pendingMemoId ? pendingInputRef : undefined}
              variant="project"
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            <strong>아직 프로젝트 메모가 없습니다</strong>
            <p>상단의 +를 눌러 프로젝트 전체에서 기억할 내용을 남겨 보세요.</p>
          </div>
        )}
      </section>

      <section
        aria-labelledby="file-memo-scope-tab"
        className={styles.cardGrid}
        hidden={scope !== "file"}
        id="file-memo-list"
        role="tabpanel"
      >
        {collection.file.length > 0 ? (
          collection.file.map((memo) => (
            <MemoCard
              body={memo.body}
              fileName={memo.fileName}
              key={memo.id}
              label={`${memo.fileName} 파일 메모`}
              onChange={(body) => onFileMemoChange(memo, body)}
              variant="file"
            />
          ))
        ) : (
          <div className={styles.emptyState}>
            <strong>아직 파일 메모가 없습니다</strong>
            <p>파일을 열어 메모를 작성하면 여기에 표시됩니다.</p>
          </div>
        )}
      </section>
    </section>
  );
}
