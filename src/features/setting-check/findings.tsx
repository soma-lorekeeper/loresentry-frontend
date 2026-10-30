"use client";

import { useState } from "react";

import { Button } from "@/design-system/primitives";
import {
  SETTING_CHECK_REASON_MAX,
  type SettingCheckFinding,
  type SettingCheckRunDetail,
  type SettingCheckVerdict,
} from "@/domain/setting-check";
import { t } from "@/i18n";

import styles from "./setting-check.module.css";

export type Filter = "open" | "intended" | "notConflict";

export function filterOf(finding: SettingCheckFinding): Filter {
  if (finding.verdict === "INTENDED") return "intended";
  if (finding.verdict === "NOT_CONFLICT") return "notConflict";
  return "open";
}

export function emptyDescription(run: SettingCheckRunDetail) {
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

export function ReasonEditor({
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
