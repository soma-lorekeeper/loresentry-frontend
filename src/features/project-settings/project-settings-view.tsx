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
import { t } from "@/i18n";
import { isServiceError } from "@/services/errors";

import styles from "./project-settings-view.module.css";
import { useProjectSettings, useSaveProjectSettings } from "./queries";

// 요구사항 §2.2 와 생성 다이얼로그·서버 검증에 맞춘다. 40 이던 값은 40자가 넘는
// 기존 제목을 설정 화면에서 잘라 버렸다.
const TITLE_MAX = 255;
const DESCRIPTION_MAX = 500;

const COPY = {
  saved: {
    message: t("작업공간::설정이 저장되었습니다"),
    detail: t("사이드바와 프로젝트 목록에 바로 반영됐어요."),
  },
  error: {
    message: t("작업공간::설정을 저장하지 못했어요"),
    detail: t("입력값은 유지됩니다."),
  },
};

function changedFields(saved: ProjectSettings, draft: ProjectSettings) {
  const fields: string[] = [];
  if (draft.title.trim() !== saved.title)
    fields.push(t("프로젝트 이름 · {title}", { title: saved.title }));
  if (draft.description.trim() !== saved.description)
    fields.push(t("프로젝트 설명"));
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
      title={t("작업공간::프로젝트를 휴지통으로 이동할까요?")}
      description={t("프로젝트 안의 파일도 함께 이동합니다.")}
      actions={
        <>
          <Button size="md" onClick={close} disabled={busy}>
            {t("취소")}
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
                    title: t("프로젝트를 휴지통으로 옮겼어요."),
                    description: t("프로젝트 휴지통에서 복원할 수 있어요."),
                  });
                  router.push("/projects");
                },
              })
            }
          >
            {busy
              ? t("작업공간::이동 중…")
              : trash.isError
                ? t("다시 시도")
                : t("작업공간::휴지통으로 이동")}
          </Button>
        </>
      }
    >
      <DialogDetail label={t("이동할 프로젝트")} value={title} />
      {trash.isError && (
        <InlineNotice>
          {t("프로젝트를 이동하지 못했어요. 작업공간은 그대로 유지했어요.")}
        </InlineNotice>
      )}
    </DialogCard>
  );
}

function SettingsForm({
  paneId,
  tabId,
  initial,
}: {
  paneId: string;
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
      registerCloseGuard(paneId, tabId, (proceed) => {
        if (!dirty) return false;
        setLeaving(() => proceed);
        return true;
      }),
    [registerCloseGuard, paneId, tabId, dirty],
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
      : dirty
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
            {t("일반")}
          </h2>
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
            label={t("작업공간::프로젝트 이름")}
            required
            value={draft.title}
            maxLength={TITLE_MAX}
            readOnly={save.isPending}
            onChange={(event) => edit({ title: event.target.value })}
            error={
              titleEmpty
                ? t("작업공간::프로젝트 이름을 입력해 주세요.")
                : serverError
            }
          />
          <TextAreaField
            density="settings"
            label={t("프로젝트 설명")}
            labelHint={t("선택")}
            rows={3}
            value={draft.description}
            maxLength={DESCRIPTION_MAX}
            readOnly={save.isPending}
            onChange={(event) => edit({ description: event.target.value })}
          />
        </form>
        <SaveBar
          state={state}
          copy={COPY}
          saveDisabled={titleEmpty}
          onSave={submit}
          onCancel={discard}
        />
      </section>

      <section className={styles.section} aria-labelledby="settings-danger">
        <header className={styles.sectionHeader}>
          <h2 id="settings-danger" className={styles.sectionTitle}>
            {t("위험 영역")}
          </h2>
        </header>
        <div className={styles.danger}>
          <Icon name="triangle-alert" size={16} className={styles.dangerIcon} />
          <span className={styles.dangerCopy}>
            <strong>{t("프로젝트를 휴지통으로 이동")}</strong>
            <span>
              {t(
                "프로젝트 목록의 휴지통에서 복원하거나 영구 삭제할 수 있어요.",
              )}
            </span>
          </span>
          <Button size="lg" icon="trash-2" onClick={() => setTrashOpen(true)}>
            {t("이동")}
          </Button>
        </div>
      </section>

      <DialogCard
        open={leaving !== null}
        onClose={() => setLeaving(null)}
        title={t("변경사항을 저장하지 않고 나갈까요?")}
        description={t("현재 프로젝트 설정의 변경사항이 사라집니다.")}
        actions={
          <>
            <Button size="md" onClick={() => setLeaving(null)}>
              {t("계속 편집")}
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
              {t("변경사항 버리기")}
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

export function ProjectSettingsView({ tab, paneId }: WorkspaceViewProps) {
  const { projectId } = useWorkspace();
  const settings = useProjectSettings(projectId);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("프로젝트 설정")}</h1>
      </header>
      {settings.isPending ? (
        <EmptyState
          role="status"
          icon="loader-circle"
          title={t("설정을 불러오는 중이에요")}
        />
      ) : settings.isError ? (
        <EmptyState
          role="alert"
          icon="triangle-alert"
          title={t("설정을 불러오지 못했어요")}
          description={t("작업공간::연결을 확인한 뒤 다시 시도해 주세요.")}
          action={
            <Button
              size="md"
              icon="refresh-cw"
              onClick={() => settings.refetch()}
            >
              {t("다시 시도")}
            </Button>
          }
        />
      ) : (
        <SettingsForm paneId={paneId} tabId={tab.id} initial={settings.data} />
      )}
    </div>
  );
}
