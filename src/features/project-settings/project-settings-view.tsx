"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  Button,
  DialogCard,
  DialogDetail,
  EmptyState,
  Icon,
  InlineNotice,
  SaveBar,
  TextAreaField,
  TextField,
  useToast,
  type SaveBarState,
} from "@/design-system/primitives";
import type { ProjectSettings } from "@/domain/models";
import { useTrashProject } from "@/features/projects/queries";
import type { WorkspaceViewProps } from "@/features/workspace/views/view-types";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { isServiceError } from "@/services/errors";

import styles from "./project-settings-view.module.css";
import { useProjectSettings, useSaveProjectSettings } from "./queries";

const TITLE_MAX = 40;
const DESCRIPTION_MAX = 200;

const COPY = {
  saved: {
    message: "설정이 저장되었습니다",
    detail: "사이드바와 프로젝트 목록에 바로 반영됐어요.",
  },
  error: {
    message: "설정을 저장하지 못했어요",
    detail: "입력값은 유지됩니다.",
  },
};

function changedFields(saved: ProjectSettings, draft: ProjectSettings) {
  const fields: string[] = [];
  if (draft.title.trim() !== saved.title)
    fields.push(`프로젝트 이름 · ${saved.title}`);
  if (draft.description.trim() !== saved.description)
    fields.push("프로젝트 설명");
  return fields;
}

function TrashDialog({
  open,
  title,
  onClose,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
}) {
  const { projectId } = useWorkspace();
  const router = useRouter();
  const toast = useToast();
  const trash = useTrashProject();
  const busy = trash.isPending;
  const close = () => {
    if (busy) return;
    trash.reset();
    onClose();
  };
  return (
    <DialogCard
      open={open}
      onClose={close}
      dismissible={!busy}
      icon="trash-2"
      title="프로젝트를 휴지통으로 이동할까요?"
      description="프로젝트 안의 파일도 함께 이동합니다."
      actions={
        <>
          <Button size="md" onClick={close} disabled={busy}>
            취소
          </Button>
          <Button
            size="md"
            variant="primary"
            icon={trash.isError ? "rotate-cw" : "trash-2"}
            busy={busy}
            onClick={() =>
              trash.mutate(projectId, {
                onSuccess: () => {
                  toast({
                    icon: "circle-check",
                    title: "프로젝트를 휴지통으로 옮겼어요.",
                    description: "프로젝트 휴지통에서 복원할 수 있어요.",
                  });
                  router.push("/projects");
                },
              })
            }
          >
            {busy
              ? "이동 중…"
              : trash.isError
                ? "다시 시도"
                : "휴지통으로 이동"}
          </Button>
        </>
      }
    >
      <DialogDetail label="이동할 프로젝트" value={title} />
      {trash.isError && (
        <InlineNotice>
          프로젝트를 이동하지 못했어요. 작업공간은 그대로 유지했어요.
        </InlineNotice>
      )}
    </DialogCard>
  );
}

function SettingsForm({
  tabId,
  initial,
}: {
  tabId: string;
  initial: ProjectSettings;
}) {
  const { projectId, project, registerCloseGuard } = useWorkspace();
  const save = useSaveProjectSettings(projectId);
  const [saved, setSaved] = useState(initial);
  const [draft, setDraft] = useState(initial);
  const [justSaved, setJustSaved] = useState(false);
  const [leaving, setLeaving] = useState<(() => void) | null>(null);
  const [trashOpen, setTrashOpen] = useState(false);

  const titleEmpty = draft.title.trim().length === 0;
  const changes = changedFields(saved, draft);
  const dirty = changes.length > 0;
  useEffect(
    () =>
      registerCloseGuard(tabId, (proceed) => {
        if (!dirty) return false;
        setLeaving(() => proceed);
        return true;
      }),
    [registerCloseGuard, tabId, dirty],
  );

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const state: SaveBarState = save.isPending
    ? "saving"
    : save.isError
      ? "error"
      : dirty && !titleEmpty
        ? "changed"
        : justSaved
          ? "saved"
          : "unchanged";

  const edit = (patch: Partial<ProjectSettings>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setJustSaved(false);
    save.reset();
  };

  const submit = () => {
    if (titleEmpty || !dirty) return;
    save.mutate(
      { title: draft.title.trim(), description: draft.description.trim() },
      {
        onSuccess: (next) => {
          const settings = { title: next.title, description: next.description };
          setSaved(settings);
          setDraft(settings);
          setJustSaved(true);
        },
      },
    );
  };

  const discard = () => {
    setDraft(saved);
    save.reset();
  };

  const serverError =
    save.error && isServiceError(save.error) && save.error.code === "validation"
      ? save.error.message
      : undefined;

  return (
    <>
      <section className={styles.section} aria-labelledby="settings-general">
        <header className={styles.sectionHeader}>
          <h2 id="settings-general" className={styles.sectionTitle}>
            일반
          </h2>
          <p className={styles.sectionDescription}>
            현재 프로젝트에만 적용되는 기본 정보를 관리합니다.
          </p>
        </header>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <TextField
            density="settings"
            label="프로젝트 이름"
            required
            value={draft.title}
            maxLength={TITLE_MAX}
            readOnly={save.isPending}
            onChange={(event) => edit({ title: event.target.value })}
            hint="사이드바와 프로젝트 목록에 표시되는 이름입니다."
            error={titleEmpty ? "프로젝트 이름을 입력해 주세요." : serverError}
          />
          <TextAreaField
            density="settings"
            label="프로젝트 설명"
            labelHint="선택"
            rows={3}
            value={draft.description}
            maxLength={DESCRIPTION_MAX}
            readOnly={save.isPending}
            onChange={(event) => edit({ description: event.target.value })}
            hint="프로젝트의 목적이나 범위를 기록합니다."
          />
        </form>
        {state === "unchanged" ? (
          <div className={styles.idleActions}>
            <Button size="lg" disabled>
              취소
            </Button>
            <Button size="lg" icon="save" disabled>
              변경사항 저장
            </Button>
          </div>
        ) : (
          <SaveBar
            state={state}
            copy={COPY}
            onSave={submit}
            onCancel={discard}
          />
        )}
      </section>

      <section className={styles.section} aria-labelledby="settings-danger">
        <header className={styles.sectionHeader}>
          <h2 id="settings-danger" className={styles.sectionTitle}>
            위험 영역
          </h2>
          <p className={styles.sectionDescription}>
            프로젝트 전체에 영향을 주는 작업입니다.
          </p>
        </header>
        <div className={styles.danger}>
          <span className={styles.dangerIcon}>
            <Icon name="triangle-alert" size={16} />
          </span>
          <span className={styles.dangerCopy}>
            <strong>프로젝트를 휴지통으로 이동</strong>
            <span>
              프로젝트 목록의 휴지통에서 복원하거나 영구 삭제할 수 있습니다.
            </span>
          </span>
          <Button size="lg" icon="trash-2" onClick={() => setTrashOpen(true)}>
            이동
          </Button>
        </div>
      </section>

      <DialogCard
        open={leaving !== null}
        onClose={() => setLeaving(null)}
        icon="file-x"
        title="변경사항을 저장하지 않고 나갈까요?"
        description="현재 프로젝트 설정의 변경사항이 사라집니다."
        actions={
          <>
            <Button size="md" onClick={() => setLeaving(null)}>
              계속 편집
            </Button>
            <Button
              size="md"
              variant="primary"
              icon="file-x"
              onClick={() => {
                const proceed = leaving;
                discard();
                setLeaving(null);
                proceed?.();
              }}
            >
              변경사항 버리기
            </Button>
          </>
        }
      >
        <div className={styles.changes}>
          {changes.map((change) => (
            <span key={change}>{change}</span>
          ))}
        </div>
      </DialogCard>
      <TrashDialog
        open={trashOpen}
        title={project.title}
        onClose={() => setTrashOpen(false)}
      />
    </>
  );
}

export function ProjectSettingsView({ tab }: WorkspaceViewProps) {
  const { projectId } = useWorkspace();
  const settings = useProjectSettings(projectId);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>프로젝트 설정</h1>
        <p className={styles.description}>
          현재 프로젝트에만 적용되는 정보를 관리합니다.
        </p>
      </header>
      {settings.isPending ? (
        <EmptyState
          role="status"
          icon="loader-circle"
          title="설정을 불러오는 중이에요"
        />
      ) : settings.isError ? (
        <EmptyState
          role="alert"
          icon="triangle-alert"
          title="설정을 불러오지 못했어요"
          description="연결을 확인한 뒤 다시 시도해 주세요."
          action={
            <Button
              size="md"
              icon="refresh-cw"
              onClick={() => settings.refetch()}
            >
              다시 시도
            </Button>
          }
        />
      ) : (
        <SettingsForm tabId={tab.id} initial={settings.data} />
      )}
    </div>
  );
}
