"use client";

import { InfoHint, SidebarButton } from "@/design-system/primitives";
import { isUnavailable } from "@/features/common/preparing-state";
import { activeTabOf } from "@/features/workspace/model/layout";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";

import { focusChapter } from "./focus";
import { openCount } from "./ledger";
import { useSettingCheckSummary } from "./queries";
import styles from "./setting-check-item.module.css";

/** 사이드바의 설정 오류 점검. 배지는 회차마다 최신 점검의 "확인할 것" 을 더한 수다 */
export function SettingCheckItem() {
  const { projectId, activePane, open } = useWorkspace();
  const summary = useSettingCheckSummary(projectId);
  const selected = activeTabOf(activePane).target.kind === "setting-check";

  if (isUnavailable(summary.error))
    return (
      <SidebarButton
        icon="clock-3"
        label={t("설정 오류 점검 (준비 중)")}
        disabled
      />
    );

  const running = Boolean(summary.data?.running);
  const count = openCount(summary.data);
  return (
    <SidebarButton
      icon={running ? "loader-circle" : "scan-text"}
      label={t("설정 오류 점검")}
      selected={selected}
      aria-busy={running || undefined}
      className={running ? styles.running : undefined}
      onClick={() => {
        focusChapter(projectId, summary.data?.running?.documentId ?? null);
        open({ kind: "setting-check" });
      }}
      trailing={
        count > 0 ? (
          <span
            className={styles.badge}
            aria-label={t("확인할 것 {count}개", { count })}
          >
            {count}
          </span>
        ) : (
          <InfoHint
            text={t(
              "이 회차가 앞 회차나 설정 문서와 어긋나는 곳을 AI가 찾아요. 결과는 근거 문장과 함께 보여요.",
            )}
          />
        )
      }
    />
  );
}
