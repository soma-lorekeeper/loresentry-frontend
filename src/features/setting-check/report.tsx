"use client";

import { useQuery } from "@tanstack/react-query";

import { Button, EmptyState, Icon } from "@/design-system/primitives";
import { blockToPlainText, bodyBlocks } from "@/domain/document-body";
import type { DocumentNode } from "@/domain/models";
import type { SettingCheckSummary } from "@/domain/setting-check";
import { QueryFailure } from "@/features/common/query-failure";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

import { Board } from "./board";
import { latestRun } from "./ledger";
import { useSettingCheckActions, useSettingCheckRun } from "./queries";
import { RunPanel } from "./run-panel";
import styles from "./setting-check.module.css";

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

/** 회차 하나의 점검: 분석 중이면 진행, 끝났으면 근거와 원고를 나란히 놓은 결과 */
export function Report({
  chapter,
  revisionNo,
  summary,
  paneId,
  starting,
  onStart,
  onBack,
}: {
  chapter: DocumentNode;
  revisionNo: number;
  summary: SettingCheckSummary;
  paneId: string;
  starting: boolean;
  onStart: () => void;
  onBack: () => void;
}) {
  const { projectId } = useWorkspace();
  const services = useServices();
  const { cancel } = useSettingCheckActions(projectId);
  const latest = latestRun(summary, chapter.id);
  const done = latest?.status === "DONE";
  const detail = useSettingCheckRun(done ? latest.id : null);
  const chapterDoc = useQuery({
    queryKey: queryKeys.document(chapter.id),
    queryFn: () => services.documents.get(chapter.id),
    enabled: done,
  });
  const changed = done && revisionNo > latest.revisionNo;

  const header = (
    <>
      <button type="button" className={styles.back} onClick={onBack}>
        <Icon name="chevron-left" size={16} />
        {t("설정 오류 점검")}
      </button>
      <div className={styles.head}>
        <h1 className={styles.chapterName} data-kind="manuscript">
          {chapter.title}
        </h1>
      </div>
      {changed && (
        <div className={styles.strip} role="status">
          <Icon name="pencil-line" size={14} />
          <span>{t("점검한 뒤 원고가 바뀌었어요")}</span>
          <Button
            variant="primary"
            icon="rotate-cw"
            busy={starting}
            onClick={onStart}
          >
            {t("다시 점검하기")}
          </Button>
        </div>
      )}
    </>
  );

  if (done && detail.data?.id === latest.id && !chapterDoc.isPending) {
    const paragraphs = chapterDoc.data
      ? bodyBlocks(chapterDoc.data.body)
          .map(blockToPlainText)
          .filter((text) => text.trim())
      : [];
    return (
      <Board
        key={latest.id}
        run={detail.data}
        title={chapter.title}
        paragraphs={paragraphs}
        paneId={paneId}
        header={header}
      />
    );
  }

  let body: React.ReactNode;
  if (!latest) {
    body = starting ? (
      <RunPanel stage={null} cancelling={false} onCancel={null} />
    ) : (
      <div className={styles.empty}>
        <EmptyState
          icon="scan-text"
          title={t("아직 점검하지 않았어요")}
          description={t(
            "이 회차를 앞 회차와 설정 문서에 대조해 설정 충돌을 찾아요.",
          )}
          action={
            <Button
              size="md"
              variant="primary"
              icon="scan-text"
              onClick={onStart}
            >
              {t("점검")}
            </Button>
          }
        />
      </div>
    );
  } else if (latest.status === "RUNNING") {
    body = (
      <RunPanel
        stage={latest.stage}
        cancelling={cancel.isPending}
        onCancel={() => cancel.mutate(latest.id)}
      />
    );
  } else if (latest.status === "FAILED") {
    const failure = failureCopy(latest.failureCode);
    body = (
      <div className={styles.notice} role="status">
        <Icon name="cloud-off" size={16} />
        <div className={styles.noticeBody}>
          <span className={styles.noticeTitle}>{t("점검하지 못했어요")}</span>
          <span className={styles.noticeText}>{failure.text}</span>
          {failure.retry && (
            <Button icon="rotate-cw" busy={starting} onClick={onStart}>
              {t("다시 시도")}
            </Button>
          )}
        </div>
      </div>
    );
  } else if (latest.status === "CANCELLED") {
    body = (
      <div className={styles.notice} role="status">
        <Icon name="ban" size={16} />
        <div className={styles.noticeBody}>
          <span className={styles.noticeTitle}>{t("점검을 취소했어요")}</span>
          <Button icon="rotate-cw" busy={starting} onClick={onStart}>
            {t("다시 점검하기")}
          </Button>
        </div>
      </div>
    );
  } else if (detail.isError) {
    body = (
      <QueryFailure
        title={t("점검 결과를 불러오지 못했어요")}
        retrying={detail.isFetching}
        onRetry={() => void detail.refetch()}
      />
    );
  } else {
    body = <div aria-busy="true" />;
  }

  return (
    <div className={styles.page}>
      <div className={`${styles.reportHead} ${styles.narrow}`}>{header}</div>
      <div className={`${styles.reportBody} ${styles.narrow}`}>{body}</div>
    </div>
  );
}
