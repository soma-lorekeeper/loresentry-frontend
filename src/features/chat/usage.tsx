"use client";

import { useRef, useState, type CSSProperties } from "react";

import { Icon, IconButton, Popover } from "@/design-system/primitives";
import type { ChatUsage } from "@/domain/models";
import { t } from "@/i18n";

import styles from "./chat.module.css";

export type UsageLevel = "off" | "ok" | "high" | "full";

export const HIGH_RATIO = 0.8;

const DISMISSED_KEY = "loresentry.chat.usage-notice";

export function usageLevel(usage: ChatUsage | undefined): UsageLevel {
  if (!usage || usage.limit <= 0) return "off";
  if (usage.used >= usage.limit) return "full";
  return usage.used / usage.limit >= HIGH_RATIO ? "high" : "ok";
}

/** 다 쓰기 전에는 99%에서 멈춘다. 100%는 "다 썼다"와 같은 뜻이어야 한다. */
export function usagePercent(usage: ChatUsage) {
  if (usage.used >= usage.limit) return 100;
  return Math.min(99, Math.floor((usage.used / usage.limit) * 100));
}

export function untilReset(resetsAt: string, now: number) {
  const minutes = Math.max(1, Math.ceil((Date.parse(resetsAt) - now) / 60_000));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return t("{minutes}분", { minutes: rest });
  if (rest === 0) return t("{hours}시간", { hours });
  return t("{hours}시간 {minutes}분", { hours, minutes: rest });
}

function fill(percent: number) {
  return { "--used": percent / 100 } as CSSProperties;
}

export function UsageMeter({
  usage,
  level,
}: {
  usage: ChatUsage;
  level: UsageLevel;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const percent = usagePercent(usage);
  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        className={styles.usage}
        data-level={level}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("오늘 AI 챗 사용량 {percent}%", { percent })}
        onClick={() => setOpen((value) => !value)}
      >
        <span className={styles.usageTrack} style={fill(percent)} />
        <span>{percent}%</span>
      </button>
      <Popover
        anchorRef={anchorRef}
        open={open}
        placement="bottom-end"
        offset={6}
        className={styles.usagePop}
        onClose={() => setOpen(false)}
      >
        <div role="dialog" aria-label={t("오늘 사용량")} data-level={level}>
          <div className={styles.usagePopHead}>
            <span>{t("오늘 사용량")}</span>
            <strong>{percent}%</strong>
          </div>
          <span className={styles.usageBar} style={fill(percent)} />
          <p>{t("자정에 0%로 비워져요.")}</p>
        </div>
      </Popover>
    </>
  );
}

function dismissedFor() {
  try {
    return window.localStorage.getItem(DISMISSED_KEY);
  } catch {
    return null;
  }
}

export function useUsageNotice(usage: ChatUsage | undefined) {
  const [dismissed, setDismissed] = useState(dismissedFor);
  const shown =
    usage !== undefined &&
    usageLevel(usage) === "high" &&
    dismissed !== usage.resetsAt;
  const dismiss = () => {
    if (!usage) return;
    setDismissed(usage.resetsAt);
    try {
      window.localStorage.setItem(DISMISSED_KEY, usage.resetsAt);
    } catch {}
  };
  return { shown, dismiss };
}

export function UsageNotice({
  usage,
  onDismiss,
}: {
  usage: ChatUsage;
  onDismiss: () => void;
}) {
  return (
    <div className={styles.usageNotice} role="status">
      <Icon name="info" size={14} />
      <span>
        {t("오늘 사용량의 {percent}%를 썼어요", {
          percent: usagePercent(usage),
        })}
        <small>{t("100%가 되면 자정까지 쉬어요.")}</small>
      </span>
      <IconButton
        icon="x"
        iconSize={12}
        label={t("알림 닫기")}
        onClick={onDismiss}
      />
    </div>
  );
}

export function UsageRest({ usage, now }: { usage: ChatUsage; now: number }) {
  return (
    <div className={styles.usageRest} role="status">
      <span className={styles.usageRestIcon}>
        <Icon name="moon" size={15} />
      </span>
      <h3>{t("오늘 사용량을 다 썼어요")}</h3>
      <p>
        {t("자정에 0%로 비워져요. 지난 대화와 근거는 그대로 볼 수 있어요.")}
      </p>
      <div className={styles.usageRestMeta}>
        <Icon name="clock-3" size={13} />
        <span>
          {t("{time} 뒤 다시 물을 수 있어요", {
            time: untilReset(usage.resetsAt, now),
          })}
        </span>
      </div>
    </div>
  );
}
