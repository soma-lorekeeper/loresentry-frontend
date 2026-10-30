"use client";

import { useState } from "react";

import { Button, EmptyState, Icon, useToast } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { SettingCheckDecision } from "@/domain/setting-check";
import { QueryFailure } from "@/features/common/query-failure";
import { requestReveal } from "@/features/documents/reveal-request";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { isServiceError } from "@/services/errors";
import { checkTimeLabel } from "@/shared/format";

import { shortTitle } from "./ledger";
import { Marked } from "./marked";
import { useSettingCheckActions, useSettingCheckVerdicts } from "./queries";
import styles from "./setting-check.module.css";

function Decision({
  decision,
  revealable,
  pending,
  onReveal,
  onUndo,
}: {
  decision: SettingCheckDecision;
  revealable: boolean;
  pending: boolean;
  onReveal: () => void;
  onUndo: () => void;
}) {
  const { finding } = decision;
  const { source } = finding;
  const quote = (
    <span className={styles.targetMark}>
      <Marked text={finding.quote} focus={finding.quoteFocus} />
    </span>
  );
  return (
    <li className={styles.decision} data-kind={source.docType}>
      <div className={styles.decisionHead}>
        <span className={styles.decisionChapter}>{decision.documentTitle}</span>
        <span className={styles.decisionVerdict}>
          {finding.verdict === "INTENDED" ? t("의도함") : t("충돌 아님")}
        </span>
        <span className={styles.decisionTime}>
          {checkTimeLabel(decision.decidedAt)}
        </span>
        <Button variant="ghost" icon="undo-2" busy={pending} onClick={onUndo}>
          {t("되돌리기")}
        </Button>
      </div>
      {revealable ? (
        <button
          type="button"
          className={styles.decisionQuote}
          aria-label={t("{title}에서 보기: {quote}", {
            title: decision.documentTitle,
            quote: finding.quote,
          })}
          onClick={onReveal}
        >
          {quote}
        </button>
      ) : (
        <p className={styles.decisionQuote}>{quote}</p>
      )}
      <p className={styles.decisionSource}>
        <Icon name={DOCUMENT_TYPE_META[source.docType].entityIcon} size={14} />
        <span>
          <b>{shortTitle(source.title, source.docType)}</b> {source.quote}
        </span>
      </p>
      {finding.reason && (
        <p className={styles.reason}>
          <Icon name="pen-line" size={14} />
          {finding.reason}
        </p>
      )}
    </li>
  );
}

/**
 * 프로젝트의 판정 기록. '충돌 아니에요'·'의도한 거예요'로 남긴 곳을 최근 판정부터 모은다.
 * 다음 점검은 여기 남은 판정을 따르므로, 되돌리면 그 곳은 다시 확인할 것으로 올라온다.
 */
export function VerdictLedger({
  chapterIds,
  paneId,
  onBack,
}: {
  /** 지금 열 수 있는 회차. 휴지통에 간 회차의 문장은 원고에서 보여 줄 수 없다 */
  chapterIds: ReadonlySet<string>;
  paneId: string;
  onBack: () => void;
}) {
  const { projectId, openBeside } = useWorkspace();
  const toast = useToast();
  const ledger = useSettingCheckVerdicts(projectId);
  const { clearVerdict } = useSettingCheckActions(projectId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const undo = (decision: SettingCheckDecision) => {
    setBusyId(decision.finding.id);
    clearVerdict.mutate(decision.finding.id, {
      onSuccess: () => setAnnouncement(t("확인할 것으로 되돌렸어요.")),
      onError: (error) =>
        toast({
          icon: "triangle-alert",
          title: t("판정을 저장하지 못했어요."),
          description: isServiceError(error)
            ? error.message
            : t("작업공간::잠시 후 다시 시도해 주세요."),
        }),
      onSettled: () => setBusyId(null),
    });
  };

  const reveal = (decision: SettingCheckDecision) => {
    requestReveal(decision.documentId, decision.finding.quote);
    openBeside({ kind: "file", fileId: decision.documentId }, paneId);
  };

  let body: React.ReactNode;
  if (ledger.isError)
    body = (
      <QueryFailure
        title={t("판정 기록을 불러오지 못했어요")}
        retrying={ledger.isFetching}
        onRetry={() => void ledger.refetch()}
      />
    );
  else if (ledger.isPending) body = <div aria-busy="true" />;
  else if (ledger.data.length === 0)
    body = (
      <div className={styles.empty}>
        <EmptyState
          icon="notebook-pen"
          title={t("남긴 판정이 없어요")}
          description={t(
            "점검 결과에서 ‘충돌 아니에요’나 ‘의도한 거예요’를 고르면 여기에 모여요.",
          )}
        />
      </div>
    );
  else
    body = (
      <ul className={styles.decisions}>
        {ledger.data.map((decision) => (
          <Decision
            key={decision.finding.id}
            decision={decision}
            revealable={chapterIds.has(decision.documentId)}
            pending={busyId === decision.finding.id}
            onReveal={() => reveal(decision)}
            onUndo={() => undo(decision)}
          />
        ))}
      </ul>
    );

  return (
    <div className={styles.page}>
      <div className={styles.home}>
        <button type="button" className={styles.back} onClick={onBack}>
          <Icon name="chevron-left" size={16} />
          {t("설정 오류 점검")}
        </button>
        <h1 className={`${styles.title} ${styles.ledgerTitle}`}>
          {t("판정 기록")}
        </h1>
        {body}
      </div>
      <p className={styles.srOnly} role="status">
        {announcement}
      </p>
    </div>
  );
}
