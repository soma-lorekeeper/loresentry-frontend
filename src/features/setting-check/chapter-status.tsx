import { Icon, type IconName } from "@/design-system/primitives";
import { t } from "@/i18n";
import { checkTimeLabel } from "@/shared/format";

import { stageLabel, type ChapterStatus } from "./ledger";
import styles from "./setting-check.module.css";

export function statusView(status: ChapterStatus): {
  icon: IconName | null;
  text: string;
} {
  if (status.kind === "unchecked") return { icon: null, text: t("점검 안 함") };
  if (status.kind === "running")
    return {
      icon: "loader-circle",
      text: t("점검 중 · {stage}", { stage: stageLabel(status.run.stage) }),
    };
  const time = checkTimeLabel(status.run.finishedAt ?? status.run.createdAt);
  switch (status.kind) {
    case "changed":
      return {
        icon: "pencil-line",
        text: t("점검 뒤 고침 · {time}", { time }),
      };
    case "open":
      return {
        icon: "circle-alert",
        text: t("어긋남 {count} · {time}", {
          count: status.run.counts.open,
          time,
        }),
      };
    case "intended":
      return {
        icon: "circle-check",
        text: t("의도함 {count} · {time}", {
          count: status.run.counts.intended,
          time,
        }),
      };
    case "clean":
      return {
        icon: "circle-check",
        text: t("어긋남 없음 · {time}", { time }),
      };
    case "failed":
      return { icon: "cloud-off", text: t("점검하지 못함 · {time}", { time }) };
    case "cancelled":
      return { icon: "ban", text: t("취소함 · {time}", { time }) };
  }
}

export function ChapterStatusLine({ status }: { status: ChapterStatus }) {
  const view = statusView(status);
  const running = status.kind === "running";
  return (
    <span className={styles.status} data-tone={running ? "running" : undefined}>
      {view.icon && (
        <Icon
          name={view.icon}
          size={13}
          className={running ? styles.spin : undefined}
        />
      )}
      <span>{view.text}</span>
    </span>
  );
}
