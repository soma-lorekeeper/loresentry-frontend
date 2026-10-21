"use client";

import { Icon } from "@/design-system/primitives";
import type { ChatPhase } from "@/domain/models";
import { t } from "@/i18n";

import styles from "./chat.module.css";

export function Waiting({
  phase,
  elapsed,
}: {
  phase: ChatPhase;
  elapsed: number;
}) {
  return (
    <div role="status" aria-live="polite" className={styles.skeleton}>
      <p className={styles.waitText}>
        <Icon name="loader-circle" size={13} className={styles.spin} />
        <span className={styles.waitLead}>
          {phase === "gathering"
            ? t("원고와 설정을 모으는 중")
            : phase === "reading"
              ? t("필요한 문서를 읽는 중")
              : t("답을 쓰는 중")}
        </span>
        {elapsed >= 2 && (
          <span className={styles.waitMeta}>
            {t("{seconds}초", { seconds: elapsed })}
          </span>
        )}
      </p>
      <span className={styles.bone} style={{ width: "94%" }} />
      <span className={styles.bone} style={{ width: "81%" }} />
      <span className={styles.bone} style={{ width: "58%" }} />
    </div>
  );
}
