"use client";

import { Button, Icon } from "@/design-system/primitives";
import type { SettingCheckStage } from "@/domain/setting-check";
import { t } from "@/i18n";

import styles from "./setting-check.module.css";

const ORDER: SettingCheckStage[] = ["READING", "FINDING", "JUDGING"];

const WIDTH: Record<SettingCheckStage, number> = {
  READING: 22,
  FINDING: 56,
  JUDGING: 84,
};

function stageName(stage: SettingCheckStage) {
  if (stage === "FINDING") return t("설정 충돌 찾기");
  if (stage === "JUDGING") return t("다시 확인");
  return t("앞 회차와 설정 읽기");
}

export function RunPanel({
  stage,
  cancelling,
  onCancel,
}: {
  stage: SettingCheckStage | null;
  cancelling: boolean;
  onCancel: (() => void) | null;
}) {
  const current = stage ?? "READING";
  const at = ORDER.indexOf(current);
  return (
    <section className={styles.run} aria-busy="true">
      <p className={styles.runWhat} role="status">
        <Icon name="loader-circle" size={16} className={styles.spin} />
        {t("설정 충돌을 찾고 있어요")}
      </p>
      <div className={styles.track} aria-hidden="true">
        <span style={{ width: `${WIDTH[current]}%` }} />
      </div>
      <ol className={styles.stages}>
        {ORDER.map((item, index) => (
          <li
            key={item}
            data-state={index < at ? "done" : index === at ? "now" : undefined}
            aria-current={index === at ? "step" : undefined}
          >
            {index < at && <Icon name="check" size={14} />}
            {stageName(item)}
          </li>
        ))}
      </ol>
      <div className={styles.runFoot}>
        <span>{t("보통 1–3분 걸려요. 다른 작업을 해도 계속돼요.")}</span>
        {onCancel && (
          <Button busy={cancelling} onClick={onCancel}>
            {t("취소")}
          </Button>
        )}
      </div>
    </section>
  );
}
