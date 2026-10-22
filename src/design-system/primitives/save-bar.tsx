import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import { Icon } from "../icons/icon";
import { Button } from "./button";
import styles from "./save-bar.module.css";

export type SaveBarState = "unchanged" | "changed" | "saving" | "error";

export interface SaveBarCopy {
  message: string;
  detail: string;
}

const DEFAULT_ERROR_COPY: SaveBarCopy = {
  message: t("설정을 저장하지 못했어요"),
  detail: t("입력한 값은 유지됩니다."),
};

interface SaveBarProps {
  state: SaveBarState;
  errorCopy?: SaveBarCopy;
  saveDisabled?: boolean;
  onSave: () => void;
  onCancel: () => void;
  onRetry?: () => void;
  className?: string;
}

export function SaveBar({
  state,
  errorCopy,
  saveDisabled,
  onSave,
  onCancel,
  onRetry,
  className,
}: SaveBarProps) {
  if (state === "unchanged") return null;
  if (state === "error") {
    const text = errorCopy ?? DEFAULT_ERROR_COPY;
    return (
      <div className={cx(styles.bar, className)} role="alert">
        <Icon name="cloud-off" size={16} />
        <div className={styles.copy}>
          <span className={styles.message}>{text.message}</span>
          {text.detail && <span className={styles.detail}>{text.detail}</span>}
        </div>
        <div className={styles.actions}>
          <Button size="md" icon="refresh-cw" onClick={onRetry ?? onSave}>
            {t("다시 시도")}
          </Button>
        </div>
      </div>
    );
  }
  const saving = state === "saving";
  return (
    <div className={cx(styles.actions, className)}>
      <Button size="md" disabled={saving} onClick={onCancel}>
        {t("취소")}
      </Button>
      <Button
        size="md"
        variant="primary"
        icon="check"
        busy={saving}
        disabled={saveDisabled}
        onClick={onSave}
      >
        {saving ? t("저장 중…") : t("변경사항 저장")}
      </Button>
    </div>
  );
}
