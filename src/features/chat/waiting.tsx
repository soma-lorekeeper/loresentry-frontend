"use client";

import type { CSSProperties } from "react";

import { Icon, type IconName } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type {
  ChatActivity,
  ChatActivityDocument,
  ChatPhase,
} from "@/domain/models";
import { t } from "@/i18n";

import styles from "./chat.module.css";

const SHOWN_DOCUMENTS = 4;
const SHOWN_MISSING = 2;

function phaseLine(phase: ChatPhase) {
  return phase === "gathering"
    ? t("원고와 설정을 모으는 중")
    : phase === "reading"
      ? t("필요한 문서를 읽는 중")
      : t("답을 쓰는 중");
}

function DocumentChips({ documents }: { documents: ChatActivityDocument[] }) {
  const shown = documents.slice(0, SHOWN_DOCUMENTS);
  const rest = documents.length - shown.length;
  return (
    <span className={styles.traceDocs}>
      {shown.map((doc, index) => (
        <span
          key={`${doc.title}:${index}`}
          className={styles.traceDoc}
          data-kind={doc.docType ?? undefined}
          data-memo={doc.docType === null || undefined}
          style={{ "--i": index } as CSSProperties}
        >
          <Icon
            name={
              doc.docType
                ? DOCUMENT_TYPE_META[doc.docType].entityIcon
                : "sticky-note"
            }
            size={11}
          />
          <span>
            {doc.docType
              ? doc.title
              : t("메모 · {title}", { title: doc.title })}
          </span>
        </span>
      ))}
      {rest > 0 && (
        <span className={styles.traceMore}>
          {t("외 {count}개", { count: rest })}
        </span>
      )}
    </span>
  );
}

interface Row {
  icon: IconName | "spinner";
  label: string;
  meta?: string;
  documents?: ChatActivityDocument[];
  notes?: string[];
  tone?: "done" | "current" | "revise";
}

function describe(activity: ChatActivity, current: boolean): Row {
  switch (activity.kind) {
    case "map":
      return {
        icon: "check",
        label: t("작품 지도 확인"),
        meta: t("문서 {count}개", { count: activity.documents }),
      };
    case "think":
      return {
        icon: "spinner",
        label: activity.mustAnswer
          ? t("읽은 문서로 답을 쓰는 중")
          : activity.step === 1
            ? t("읽을 문서를 고르는 중")
            : t("더 읽을지 정하는 중"),
      };
    case "read":
      return {
        icon: current ? "spinner" : "check",
        label: current ? t("문서를 읽는 중") : t("읽음"),
        meta: t("{step}단계 · {count}개", {
          step: activity.step,
          count: activity.documents.length,
        }),
        documents: activity.documents,
        notes:
          activity.skipped > 0
            ? [
                t("분량이 넘친 {count}개는 다음 단계로", {
                  count: activity.skipped,
                }),
              ]
            : undefined,
      };
    case "review":
      return { icon: "spinner", label: t("답을 검토하는 중") };
    case "reviewed":
      if (activity.passed) return { icon: "check", label: t("검토 통과") };
      return {
        icon: "rotate-ccw",
        tone: "revise",
        label: t("검토 · 보완 필요"),
        notes: [
          ...activity.missing
            .slice(0, SHOWN_MISSING)
            .map((fact) => t("더 찾을 것 · {fact}", { fact })),
          ...(activity.problems > 0
            ? [t("고칠 점 {count}개", { count: activity.problems })]
            : []),
        ],
      };
    case "final":
      return { icon: "spinner", label: t("검토를 반영해 마지막 답을 쓰는 중") };
  }
}

function Trace({
  activities,
  elapsed,
}: {
  activities: ChatActivity[];
  elapsed: number;
}) {
  return (
    <ol className={styles.trace}>
      {activities.map((activity, index) => {
        const current = index === activities.length - 1;
        const row = describe(activity, current);
        const live = current && row.icon === "spinner";
        return (
          <li
            key={index}
            className={styles.traceRow}
            data-current={current || undefined}
            data-tone={row.tone}
          >
            <span className={styles.traceMark}>
              {row.icon === "spinner" ? (
                <Icon name="loader-circle" size={13} className={styles.spin} />
              ) : (
                <Icon name={row.icon} size={13} />
              )}
            </span>
            <span className={styles.traceLine}>
              <span className={styles.traceLabel}>{row.label}</span>
              {row.meta && <span className={styles.traceMeta}>{row.meta}</span>}
            </span>
            {live && elapsed >= 2 && (
              <span className={styles.traceTime}>
                {t("{seconds}초", { seconds: elapsed })}
              </span>
            )}
            {row.documents && row.documents.length > 0 && (
              <DocumentChips documents={row.documents} />
            )}
            {row.notes?.map((note) => (
              <span key={note} className={styles.traceNote}>
                {note}
              </span>
            ))}
          </li>
        );
      })}
    </ol>
  );
}

export function Waiting({
  phase,
  activities,
  elapsed,
}: {
  phase: ChatPhase;
  activities: ChatActivity[];
  elapsed: number;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={t("답을 준비하는 과정")}
      className={styles.skeleton}
    >
      {activities.length > 0 ? (
        <Trace activities={activities} elapsed={elapsed} />
      ) : (
        <p className={styles.waitText}>
          <Icon name="loader-circle" size={13} className={styles.spin} />
          <span className={styles.waitLead}>{phaseLine(phase)}</span>
          {elapsed >= 2 && (
            <span className={styles.waitMeta}>
              {t("{seconds}초", { seconds: elapsed })}
            </span>
          )}
        </p>
      )}
      <span className={styles.bone} style={{ width: "94%" }} />
      <span className={styles.bone} style={{ width: "81%" }} />
      <span className={styles.bone} style={{ width: "58%" }} />
    </div>
  );
}
