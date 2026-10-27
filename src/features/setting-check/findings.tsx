"use client";

import { useState } from "react";

import {
  Button,
  EmptyState,
  Icon,
  Segmented,
  useToast,
  type IconName,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { DocumentNode } from "@/domain/models";
import {
  SETTING_CHECK_REASON_MAX,
  type SettingCheckFinding,
  type SettingCheckRunDetail,
  type SettingCheckVerdict,
} from "@/domain/setting-check";
import { requestReveal } from "@/features/documents/reveal-request";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { isServiceError } from "@/services/errors";

import { shortTitle } from "./ledger";
import { useSettingCheckActions } from "./queries";
import styles from "./setting-check.module.css";

type Filter = "open" | "intended" | "notConflict";

export function normalizedText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function bareQuote(text: string) {
  return normalizedText(text)
    .replace(/^["'“”‘’「」『』]+/, "")
    .replace(/["'“”‘’「」『』.,!?…]+$/, "");
}

function filterOf(finding: SettingCheckFinding): Filter {
  if (finding.verdict === "INTENDED") return "intended";
  if (finding.verdict === "NOT_CONFLICT") return "notConflict";
  return "open";
}

function typeOf(finding: SettingCheckFinding): {
  icon: IconName;
  label: string;
} {
  const label = finding.core
    ? t("중요 설정과 달라요")
    : finding.kind === "MANUSCRIPT"
      ? t("앞 회차와 달라요")
      : t("설정과 달라요");
  const icon: IconName = finding.core
    ? "pin"
    : finding.confidence === "LOW"
      ? "circle-dashed"
      : finding.kind === "MANUSCRIPT"
        ? "book-open"
        : "bookmark";
  return {
    icon,
    label:
      finding.confidence === "LOW"
        ? t("{label} · 확신 낮음", { label })
        : label,
  };
}

function emptyDescription(run: SettingCheckRunDetail) {
  const { coreFacts, manuscripts } = run.read;
  if (coreFacts > 0 && manuscripts > 0)
    return t("중요 설정 {count}개와 앞 회차의 사실을 모두 지켰어요.", {
      count: coreFacts,
    });
  if (coreFacts > 0)
    return t("중요 설정 {count}개를 모두 지켰어요.", { count: coreFacts });
  if (manuscripts > 0) return t("앞 회차와 설정 문서의 사실을 모두 지켰어요.");
  return t("설정 문서의 사실을 모두 지켰어요.");
}

function ReasonEditor({
  verdict,
  pending,
  onCancel,
  onSave,
}: {
  verdict: SettingCheckVerdict;
  pending: boolean;
  onCancel: () => void;
  onSave: (reason: string | null) => void;
}) {
  const [reason, setReason] = useState("");
  const save = () => onSave(reason.trim() || null);
  const label =
    verdict === "INTENDED" ? t("의도한 거예요") : t("충돌 아니에요");
  return (
    <>
      <textarea
        autoFocus
        className={styles.reasonField}
        value={reason}
        maxLength={SETTING_CHECK_REASON_MAX}
        aria-label={
          verdict === "INTENDED" ? t("의도한 이유") : t("충돌이 아닌 이유")
        }
        placeholder={
          verdict === "INTENDED" ? t("의도한 이유") : t("충돌이 아닌 이유")
        }
        onChange={(event) => setReason(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onCancel();
          } else if (
            event.key === "Enter" &&
            (event.metaKey || event.ctrlKey) &&
            !pending
          ) {
            event.preventDefault();
            save();
          }
        }}
      />
      <div className={styles.actions}>
        <span className={styles.reasonHint}>
          {t("선택 · 다음 점검에서 AI가 이 이유를 읽어요")}
        </span>
        {reason.length >= SETTING_CHECK_REASON_MAX * 0.8 && (
          <span className={styles.counter}>
            {reason.length}/{SETTING_CHECK_REASON_MAX}
          </span>
        )}
        <span className={styles.spacer} />
        <Button onClick={onCancel} disabled={pending}>
          {t("취소")}
        </Button>
        <Button variant="primary" busy={pending} onClick={save}>
          {label}
        </Button>
      </div>
    </>
  );
}

function FindingRow({
  finding,
  chapter,
  expanded,
  quoteChanged,
  editing,
  pending,
  onToggle,
  onReveal,
  onEdit,
  onDecide,
  onUndo,
}: {
  finding: SettingCheckFinding;
  chapter: DocumentNode;
  expanded: boolean;
  quoteChanged: boolean;
  editing: SettingCheckVerdict | null;
  pending: boolean;
  onToggle: () => void;
  onReveal: (documentId: string, text: string) => void;
  onEdit: (verdict: SettingCheckVerdict | null) => void;
  onDecide: (verdict: SettingCheckVerdict, reason: string | null) => void;
  onUndo: () => void;
}) {
  const type = typeOf(finding);
  const source = finding.source;
  const sourceTitle = shortTitle(source.title, source.docType);
  const chapterTitle = shortTitle(chapter.title, "manuscript");
  const bodyId = `finding-${finding.id}`;
  return (
    <article
      className={styles.finding}
      data-expanded={expanded || undefined}
      role="listitem"
    >
      <button
        type="button"
        className={styles.findingHead}
        aria-expanded={expanded}
        aria-controls={expanded ? bodyId : undefined}
        onClick={onToggle}
      >
        <span
          className={styles.findingType}
          data-core={finding.core || undefined}
        >
          <Icon name={type.icon} size={14} />
          {type.label}
          <span className={styles.sep} aria-hidden="true" />
          {sourceTitle}
        </span>
        <span className={styles.summary}>{finding.summary}</span>
      </button>
      {expanded && (
        <div id={bodyId} className={styles.findingBody}>
          <button
            type="button"
            className={styles.quote}
            data-kind="manuscript"
            aria-label={t("{title}에서 보기: {quote}", {
              title: chapter.title,
              quote: finding.quote,
            })}
            onClick={() => onReveal(chapter.id, finding.quote)}
          >
            <span className={styles.quoteSource}>
              <Icon name="file-text" size={14} />
              <span>{chapterTitle}</span>
            </span>
            <span>
              <q className={styles.quoteText}>{finding.quote}</q>
              {quoteChanged && (
                <span className={styles.changed}>{t("바뀐 문장")}</span>
              )}
            </span>
          </button>
          <button
            type="button"
            className={styles.quote}
            data-kind={source.docType}
            aria-label={t("{title}에서 보기: {quote}", {
              title: source.title,
              quote: source.quote,
            })}
            onClick={() => onReveal(source.documentId, source.quote)}
          >
            <span className={styles.quoteSource}>
              <Icon
                name={DOCUMENT_TYPE_META[source.docType].entityIcon}
                size={14}
              />
              <span>{sourceTitle}</span>
            </span>
            <q className={styles.quoteText}>{source.quote}</q>
          </button>
          <p className={styles.direction}>
            <Icon name="compass" size={14} />
            {finding.direction}
          </p>
          {finding.verdict && finding.reason && (
            <p className={styles.direction} data-reason>
              <Icon name="pen-line" size={14} />
              {finding.reason}
            </p>
          )}
          {editing ? (
            <ReasonEditor
              verdict={editing}
              pending={pending}
              onCancel={() => onEdit(null)}
              onSave={(reason) => onDecide(editing, reason)}
            />
          ) : (
            <div className={styles.actions}>
              <Button
                variant="ghost"
                icon="columns-2"
                onClick={() => onReveal(chapter.id, finding.quote)}
              >
                {t("옆에 열어 보기")}
              </Button>
              <span className={styles.spacer} />
              {finding.verdict ? (
                <Button icon="undo-2" busy={pending} onClick={onUndo}>
                  {t("되돌리기")}
                </Button>
              ) : (
                <>
                  <Button onClick={() => onEdit("NOT_CONFLICT")}>
                    {t("충돌 아니에요")}
                  </Button>
                  <Button onClick={() => onEdit("INTENDED")}>
                    {t("의도한 거예요")}
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * 점검 하나의 어긋남. 확인할 것·의도함·충돌 아님으로 걸러 보고, 행을 누르면 그 자리에서 펼친다.
 * `filterable` 이 아니면(실패한 점검 아래의 지난 점검) 확인할 것만 보인다.
 */
export function Findings({
  run,
  chapter,
  paneId,
  currentText,
  filterable,
}: {
  run: SettingCheckRunDetail;
  chapter: DocumentNode;
  paneId: string;
  /** 점검한 뒤 회차를 고쳤으면 지금 본문. 인용이 그 안에 없으면 "바뀐 문장" 이다 */
  currentText: string | null;
  filterable: boolean;
}) {
  const { projectId, openBeside } = useWorkspace();
  const toast = useToast();
  const { setVerdict, clearVerdict } = useSettingCheckActions(projectId);
  const [filter, setFilter] = useState<Filter>("open");
  const byFilter: Record<Filter, SettingCheckFinding[]> = {
    open: [],
    intended: [],
    notConflict: [],
  };
  for (const finding of run.findings) byFilter[filterOf(finding)].push(finding);
  const visible = filterable ? byFilter[filter] : byFilter.open;
  const [expanded, setExpanded] = useState<string | null>(
    byFilter.open[0]?.id ?? null,
  );
  const [editing, setEditing] = useState<{
    id: string;
    verdict: SettingCheckVerdict;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  const reveal = (documentId: string, text: string) => {
    requestReveal(documentId, text);
    openBeside({ kind: "file", fileId: documentId }, paneId);
  };

  const failed = (error: unknown) =>
    toast({
      icon: "triangle-alert",
      title: t("판정을 저장하지 못했어요."),
      description: isServiceError(error)
        ? error.message
        : t("작업공간::잠시 후 다시 시도해 주세요."),
    });

  const moveOn = (finding: SettingCheckFinding) => {
    const index = visible.findIndex((item) => item.id === finding.id);
    const next = visible[index + 1] ?? visible[index - 1];
    setExpanded(next?.id ?? null);
  };

  const decide = (
    finding: SettingCheckFinding,
    verdict: SettingCheckVerdict,
    reason: string | null,
  ) => {
    setBusyId(finding.id);
    setVerdict.mutate(
      { findingId: finding.id, verdict, reason },
      {
        onSuccess: () => {
          setEditing(null);
          moveOn(finding);
          setAnnouncement(
            verdict === "INTENDED"
              ? t("의도함으로 옮겼어요.")
              : t("충돌 아님으로 옮겼어요."),
          );
        },
        onError: failed,
        onSettled: () => setBusyId(null),
      },
    );
  };

  const undo = (finding: SettingCheckFinding) => {
    setBusyId(finding.id);
    clearVerdict.mutate(finding.id, {
      onSuccess: () => {
        moveOn(finding);
        setAnnouncement(t("확인할 것으로 되돌렸어요."));
      },
      onError: failed,
      onSettled: () => setBusyId(null),
    });
  };

  const changedQuote = (finding: SettingCheckFinding) =>
    currentText !== null && !currentText.includes(bareQuote(finding.quote));

  let list: React.ReactNode;
  if (run.findings.length === 0) {
    list = filterable ? (
      <div className={styles.empty}>
        <EmptyState
          icon="circle-check"
          title={t("어긋나 보이는 곳이 없어요")}
          description={emptyDescription(run)}
        />
      </div>
    ) : (
      <p className={styles.filterEmpty}>{t("어긋나 보이는 곳이 없었어요.")}</p>
    );
  } else if (visible.length === 0) {
    list = (
      <p className={styles.filterEmpty}>
        {filter === "intended"
          ? t("의도한 것으로 남긴 어긋남이 없어요.")
          : filter === "notConflict"
            ? t("충돌이 아니라고 남긴 어긋남이 없어요.")
            : t("확인할 것이 남지 않았어요.")}
      </p>
    );
  } else {
    list = (
      <div className={styles.panel} role="list">
        {visible.map((finding) => (
          <FindingRow
            key={finding.id}
            finding={finding}
            chapter={chapter}
            expanded={expanded === finding.id}
            quoteChanged={changedQuote(finding)}
            editing={editing?.id === finding.id ? editing.verdict : null}
            pending={busyId === finding.id}
            onToggle={() => {
              setExpanded((current) =>
                current === finding.id ? null : finding.id,
              );
              if (editing?.id !== finding.id) setEditing(null);
            }}
            onReveal={reveal}
            onEdit={(verdict) =>
              setEditing(verdict ? { id: finding.id, verdict } : null)
            }
            onDecide={(verdict, reason) => decide(finding, verdict, reason)}
            onUndo={() => undo(finding)}
          />
        ))}
      </div>
    );
  }

  return (
    <>
      {filterable && run.findings.length > 0 && (
        <div>
          <Segmented<Filter>
            label={t("어긋남 걸러 보기")}
            value={filter}
            onChange={(next) => {
              setFilter(next);
              setEditing(null);
              setExpanded(byFilter[next][0]?.id ?? null);
            }}
            options={[
              {
                value: "open",
                label: t("확인할 것"),
                count: byFilter.open.length,
              },
              {
                value: "intended",
                label: t("의도함"),
                count: byFilter.intended.length,
              },
              {
                value: "notConflict",
                label: t("충돌 아님"),
                count: byFilter.notConflict.length,
              },
            ]}
          />
        </div>
      )}
      {list}
      <p className={styles.srOnly} role="status">
        {announcement}
      </p>
    </>
  );
}
