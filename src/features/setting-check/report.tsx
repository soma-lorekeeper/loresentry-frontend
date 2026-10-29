"use client";

import { useQuery } from "@tanstack/react-query";

import { Button, EmptyState, Icon } from "@/design-system/primitives";
import { bodyToPlainText } from "@/domain/document-body";
import type { DocumentNode } from "@/domain/models";
import type {
  SettingCheckRun,
  SettingCheckSummary,
} from "@/domain/setting-check";
import { QueryFailure } from "@/features/common/query-failure";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { checkTimeLabel } from "@/shared/format";

import { Findings, normalizedText } from "./findings";
import { readLabel, readStarted } from "./ledger";
import {
  useSettingCheckActions,
  useSettingCheckRun,
  useSettingCheckRuns,
} from "./queries";
import styles from "./setting-check.module.css";

function timeOf(run: SettingCheckRun) {
  return checkTimeLabel(run.finishedAt ?? run.createdAt);
}

/** 실패한 까닭마다 회복할 길이 다르다. 다시 해도 같은 실패는 다시 시도를 권하지 않는다 */
function failureCopy(code: string | null) {
  switch (code) {
    case "CHAT_CONTEXT_TOO_LARGE":
      return {
        text: t(
          "이 회차와 설정 문서가 한 번에 읽을 수 있는 양을 넘어요. 다시 시도해도 같아요. 회차나 설정 문서를 줄이면 점검할 수 있어요.",
        ),
        retry: false,
      };
    case "INTERRUPTED":
      return {
        text: t(
          "점검이 중간에 멈췄어요. 원고는 바뀌지 않았어요. 다시 시도해 주세요.",
        ),
        retry: true,
      };
    case "PROJECT_NOT_FOUND":
    case "SETTING_CHECK_DOCUMENT_NOT_FOUND":
      return {
        text: t(
          "점검하는 동안 회차를 찾을 수 없게 됐어요. 원고는 바뀌지 않았어요.",
        ),
        retry: true,
      };
    default:
      return {
        text: t("원고는 바뀌지 않았어요. 잠시 뒤 다시 시도해 주세요."),
        retry: true,
      };
  }
}

function Bones() {
  return (
    <div className={styles.panel} aria-hidden="true">
      <div className={styles.bones}>
        <div className={styles.bone} style={{ width: "30%" }} />
        <div
          className={`${styles.bone} ${styles.boneTitle}`}
          style={{ width: "78%" }}
        />
        <div className={styles.bone} style={{ width: "92%" }} />
        <div className={styles.bone} style={{ width: "70%" }} />
      </div>
      <div className={styles.bones}>
        <div className={styles.bone} style={{ width: "24%" }} />
        <div
          className={`${styles.bone} ${styles.boneTitle}`}
          style={{ width: "66%" }}
        />
      </div>
    </div>
  );
}

export function Report({
  chapter,
  revisionNo,
  summary,
  paneId,
  starting,
  onStart,
}: {
  chapter: DocumentNode;
  revisionNo: number;
  summary: SettingCheckSummary;
  paneId: string;
  starting: boolean;
  onStart: () => void;
}) {
  const { projectId } = useWorkspace();
  const services = useServices();
  const runs = useSettingCheckRuns(projectId, chapter.id);
  const { cancel } = useSettingCheckActions(projectId);
  const runningHere =
    summary.running?.documentId === chapter.id ? summary.running : null;

  const listed = runs.data ?? [];
  const history =
    runningHere && !listed.some((run) => run.id === runningHere.id)
      ? [runningHere, ...listed]
      : listed;
  const chosen = runningHere || history[0] || null;
  const detail = useSettingCheckRun(chosen?.id ?? null);
  const run: SettingCheckRun | null =
    detail.data?.id === chosen?.id ? (detail.data ?? chosen) : chosen;
  const stopped = run?.status === "FAILED" || run?.status === "CANCELLED";
  const previous = stopped
    ? (history.find(
        (candidate) =>
          candidate.status === "DONE" && candidate.createdAt < run.createdAt,
      ) ?? null)
    : null;
  const previousDetail = useSettingCheckRun(previous?.id ?? null);
  const changed = run?.status === "DONE" && revisionNo > run.revisionNo;
  const current = useQuery({
    queryKey: queryKeys.document(chapter.id),
    queryFn: () => services.documents.get(chapter.id),
    staleTime: Infinity,
    enabled: changed,
  });
  const currentText =
    changed && current.data
      ? normalizedText(bodyToPlainText(current.data.body))
      : null;

  const running = run?.status === "RUNNING";
  const meta =
    run && running
      ? [
          readStarted(run.read)
            ? readLabel(run.read)
            : t("앞 회차와 설정 문서를 읽고 있어요."),
          t("보통 1–3분 걸려요."),
        ].join(" ")
      : null;

  const retry = (
    <Button icon="rotate-cw" busy={starting} onClick={onStart}>
      {t("다시 시도")}
    </Button>
  );

  let body: React.ReactNode;
  if (runs.isError && !runningHere) {
    body = (
      <QueryFailure
        title={t("점검 기록을 불러오지 못했어요")}
        retrying={runs.isFetching}
        onRetry={() => void runs.refetch()}
      />
    );
  } else if (runs.isPending && !runningHere) {
    body = <div aria-busy="true" />;
  } else if (!run) {
    body = (
      <div className={styles.empty}>
        <EmptyState
          icon="scan-text"
          title={t("아직 점검하지 않았어요")}
          description={t(
            "이 회차를 앞 회차와 설정 문서에 대조해 어긋나 보이는 곳을 찾아요.",
          )}
          action={
            <Button
              size="md"
              variant="primary"
              icon="scan-text"
              busy={starting}
              onClick={onStart}
            >
              {t("점검")}
            </Button>
          }
        />
      </div>
    );
  } else if (running) {
    body = (
      <>
        <p className={styles.srOnly} role="status">
          {t("점검 중")}
        </p>
        <Bones />
      </>
    );
  } else if (stopped) {
    const failure = failureCopy(run.failureCode);
    body = (
      <>
        {run.status === "FAILED" ? (
          <div className={styles.notice} role="status">
            <Icon name="cloud-off" size={16} />
            <div className={styles.noticeBody}>
              <span className={styles.noticeTitle}>
                {t("점검하지 못했어요")}
              </span>
              <span className={styles.noticeText}>{failure.text}</span>
              {failure.retry && retry}
            </div>
          </div>
        ) : (
          <div className={styles.notice} role="status">
            <Icon name="ban" size={16} />
            <div className={styles.noticeBody}>
              <span className={styles.noticeTitle}>
                {t("점검을 취소했어요")}
              </span>
              <Button icon="rotate-cw" busy={starting} onClick={onStart}>
                {t("다시 점검")}
              </Button>
            </div>
          </div>
        )}
        {previous && (
          <>
            <p className={styles.sectionLabel}>
              {t("지난 점검 · {time}", { time: timeOf(previous) })}
            </p>
            {previousDetail.data ? (
              <Findings
                key={previous.id}
                run={previousDetail.data}
                chapter={chapter}
                paneId={paneId}
                currentText={null}
                filterable={false}
              />
            ) : (
              <Bones />
            )}
          </>
        )}
      </>
    );
  } else if (detail.isError) {
    body = (
      <QueryFailure
        title={t("점검 결과를 불러오지 못했어요")}
        retrying={detail.isFetching}
        onRetry={() => void detail.refetch()}
      />
    );
  } else if (!detail.data || detail.data.id !== run.id) {
    body = <Bones />;
  } else {
    body = (
      <>
        {changed && (
          <div className={styles.strip} role="status">
            <Icon name="pencil-line" size={14} />
            <span>{t("점검한 뒤 이 회차를 고쳤어요")}</span>
            <Button
              variant="primary"
              icon="rotate-cw"
              busy={starting}
              onClick={onStart}
            >
              {t("다시 점검")}
            </Button>
          </div>
        )}
        <Findings
          key={detail.data.id}
          run={detail.data}
          chapter={chapter}
          paneId={paneId}
          currentText={currentText}
          filterable
        />
      </>
    );
  }

  return (
    <section
      className={styles.reportSection}
      aria-labelledby={`check-${chapter.id}`}
    >
      <header className={styles.head}>
        <div className={styles.heading}>
          <h2
            id={`check-${chapter.id}`}
            className={styles.chapterName}
            data-kind="manuscript"
          >
            {chapter.title}
          </h2>
          {meta && <p className={styles.meta}>{meta}</p>}
        </div>
        <div className={styles.headActions}>
          {running ? (
            <Button
              busy={cancel.isPending}
              onClick={() => run && cancel.mutate(run.id)}
            >
              {t("취소")}
            </Button>
          ) : (
            history.length > 0 &&
            !changed &&
            !stopped && (
              <Button icon="rotate-cw" busy={starting} onClick={onStart}>
                {t("다시 점검")}
              </Button>
            )
          )}
        </div>
      </header>
      {body}
    </section>
  );
}
