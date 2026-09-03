"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui";
import { WorkspaceIcon } from "@/features/workspace/icons";

import type { SettingsScenario } from "../settings-states";
import styles from "./project-settings.module.css";

export interface WorkspaceSettingsInput {
  description: string;
  name: string;
  projectId: string;
}

export interface ProjectSettingsProps {
  initialScenario?: SettingsScenario;
  onDirtyChange?: (dirty: boolean) => void;
  onMoveToTrashRequest?: (returnFocus: HTMLButtonElement) => void;
  onSaved?: (settings: WorkspaceSettingsInput) => void;
  projectId: string;
  projectName: string;
  saveSettings?: (settings: WorkspaceSettingsInput) => Promise<void>;
}

type SaveStatus = "changed" | "default" | "error" | "saved" | "saving";

const defaultDescription = "유리 정원을 둘러싼 인물과 사건을 기록합니다.";

export function ProjectSettings({
  initialScenario,
  onDirtyChange,
  onMoveToTrashRequest,
  onSaved,
  projectId,
  projectName,
  saveSettings,
}: ProjectSettingsProps) {
  const scenario = initialScenario;
  const initialName = scenario?.name ?? projectName;
  const initialDescription = scenario?.description ?? defaultDescription;
  const initialStatus = scenario?.status ?? "default";
  const initiallyChanged =
    initialStatus === "changed" || initialStatus === "error";
  const [saved, setSaved] = useState({
    description: initiallyChanged ? defaultDescription : initialDescription,
    name: initialName,
  });
  const [draft, setDraft] = useState({
    description: initialDescription,
    name: initialName,
  });
  const [status, setStatus] = useState<SaveStatus>(initialStatus);
  const [nameError, setNameError] = useState("");
  const requestRef = useRef(0);
  const moveButtonRef = useRef<HTMLButtonElement>(null);
  const dirty =
    draft.name !== saved.name || draft.description !== saved.description;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const updateDraft = (next: typeof draft) => {
    setDraft(next);
    setNameError("");
    setStatus(
      next.name === saved.name && next.description === saved.description
        ? "default"
        : "changed",
    );
  };

  const reset = () => {
    setDraft(saved);
    setNameError("");
    setStatus("default");
  };

  const save = async () => {
    if (status === "saving") return;
    if (!draft.name.trim()) {
      setNameError("프로젝트 이름을 입력해 주세요.");
      return;
    }

    const request = requestRef.current + 1;
    requestRef.current = request;
    setStatus("saving");
    const input = { ...draft, name: draft.name.trim(), projectId };
    try {
      if (!saveSettings) throw new Error("missing backend adapter");
      await saveSettings(input);
      if (requestRef.current !== request) return;
      setDraft({ description: input.description, name: input.name });
      setSaved({ description: input.description, name: input.name });
      setStatus("saved");
      onSaved?.(input);
    } catch {
      if (requestRef.current === request) setStatus("error");
    }
  };

  const statusContent = {
    changed: {
      copy: "저장하거나 마지막 값으로 되돌리세요.",
      icon: "circle-alert" as const,
      title: "저장되지 않은 변경사항",
    },
    default: {
      copy: "모든 변경사항이 저장되어 있습니다.",
      icon: "circle-check" as const,
      title: "저장된 설정",
    },
    error: {
      copy: "입력값은 유지됩니다.",
      icon: "circle-alert" as const,
      title: "설정을 저장하지 못했습니다",
    },
    saved: {
      copy: "프로젝트 설정이 최신 상태입니다.",
      icon: "circle-check" as const,
      title: "저장됨",
    },
    saving: {
      copy: "잠시만 기다려 주세요.",
      icon: "loader-circle" as const,
      title: "설정을 저장하고 있습니다",
    },
  }[status];

  return (
    <section
      aria-label="프로젝트 설정"
      className={styles.panel}
      data-settings-status={status}
      id="panel-settings"
      role="tabpanel"
      tabIndex={-1}
    >
      <div className={styles.content}>
        <header className={styles.header}>
          <span className={styles.eyebrow}>Workspace</span>
          <h1>프로젝트 설정</h1>
          <p>현재 프로젝트에만 적용되는 이름과 설명을 관리합니다.</p>
        </header>

        <section
          className={styles.section}
          aria-labelledby="general-settings-title"
        >
          <h2 id="general-settings-title">일반</h2>
          <p className={styles.sectionDescription}>
            프로젝트 목록과 작업공간에 표시되는 정보를 설정합니다.
          </p>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label htmlFor="project-settings-name">프로젝트 이름</label>
              <input
                aria-describedby={
                  nameError
                    ? "project-settings-name-error"
                    : "project-settings-name-description"
                }
                aria-invalid={Boolean(nameError) || undefined}
                disabled={status === "saving"}
                id="project-settings-name"
                onChange={(event) =>
                  updateDraft({ ...draft, name: event.target.value })
                }
                required
                value={draft.name}
              />
              {nameError ? (
                <p
                  className={styles.fieldError}
                  id="project-settings-name-error"
                >
                  {nameError}
                </p>
              ) : (
                <p
                  className={styles.fieldDescription}
                  id="project-settings-name-description"
                >
                  사이드바와 프로젝트 목록에 표시됩니다.
                </p>
              )}
            </div>
            <div className={styles.field}>
              <label htmlFor="project-settings-description">
                프로젝트 설명
              </label>
              <textarea
                aria-describedby="project-settings-description-description"
                disabled={status === "saving"}
                id="project-settings-description"
                onChange={(event) =>
                  updateDraft({ ...draft, description: event.target.value })
                }
                value={draft.description}
              />
              <p
                className={styles.fieldDescription}
                id="project-settings-description-description"
              >
                프로젝트의 목적이나 범위를 기록합니다.
              </p>
            </div>
          </div>
        </section>

        <div
          aria-live={status === "error" ? "assertive" : "polite"}
          className={styles.saveBar}
          role={status === "error" ? "alert" : "status"}
        >
          <div className={styles.saveStatus}>
            <WorkspaceIcon name={statusContent.icon} />
            <div>
              <strong>{statusContent.title}</strong>
              <p className={styles.statusCopy}>{statusContent.copy}</p>
            </div>
          </div>
          <div className={styles.actions}>
            <Button disabled={!dirty || status === "saving"} onClick={reset}>
              취소
            </Button>
            <Button
              disabled={!dirty || status === "saving"}
              icon={
                status === "error" ? (
                  <WorkspaceIcon name="rotate-cw" />
                ) : undefined
              }
              isProcessing={status === "saving"}
              onClick={() => void save()}
              variant="primary"
            >
              {status === "saving"
                ? "저장 중…"
                : status === "error"
                  ? "다시 시도"
                  : "변경사항 저장"}
            </Button>
          </div>
        </div>

        <section className={styles.danger} aria-labelledby="danger-zone-title">
          <div className={styles.dangerHeading}>
            <span className={styles.dangerIcon}>
              <WorkspaceIcon name="triangle-alert" />
            </span>
            <div>
              <h2 className={styles.dangerTitle} id="danger-zone-title">
                프로젝트를 휴지통으로 이동
              </h2>
              <p className={styles.dangerCopy}>
                프로젝트는 휴지통에서 복원하거나 영구 삭제할 수 있습니다.
              </p>
            </div>
          </div>
          <Button
            icon={<WorkspaceIcon name="trash" />}
            onClick={() =>
              moveButtonRef.current &&
              onMoveToTrashRequest?.(moveButtonRef.current)
            }
            ref={moveButtonRef}
          >
            이동
          </Button>
        </section>
      </div>
    </section>
  );
}
