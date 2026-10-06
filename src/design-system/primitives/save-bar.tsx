import { cx } from "@/shared/cx";

import { Icon, type IconName } from "../icons/icon";
import { Button } from "./button";
import styles from "./save-bar.module.css";

export type SaveBarState =
  "unchanged" | "changed" | "saving" | "saved" | "error";

export interface SaveBarCopy {
  message: string;
  detail: string;
}

type VisibleState = Exclude<SaveBarState, "unchanged">;

const DEFAULT_COPY: Record<VisibleState, SaveBarCopy> = {
  changed: {
    message: "저장되지 않은 변경사항",
    detail: "",
  },
  saving: {
    message: "설정을 저장하고 있습니다",
    detail: "",
  },
  saved: {
    message: "설정이 저장되었습니다",
    detail: "",
  },
  error: {
    message: "설정을 저장하지 못했어요",
    detail: "입력한 값은 유지됩니다.",
  },
};

const STATE_ICON: Record<VisibleState, IconName> = {
  changed: "circle-dot",
  saving: "loader-circle",
  saved: "circle-check",
  error: "cloud-off",
};

interface SaveBarProps {
  state: SaveBarState;
  copy?: Partial<Record<VisibleState, SaveBarCopy>>;
  saveDisabled?: boolean;
  onSave: () => void;
  onCancel: () => void;
  onRetry?: () => void;
  className?: string;
}

export function SaveBar({
  state,
  copy,
  saveDisabled,
  onSave,
  onCancel,
  onRetry,
  className,
}: SaveBarProps) {
  if (state === "unchanged") return null;
  const text = { ...DEFAULT_COPY[state], ...copy?.[state] };
  return (
    <div
      className={cx(
        styles.bar,
        state === "saved" && styles.saved,
        state === "error" && styles.error,
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <Icon
        name={STATE_ICON[state]}
        size={16}
        className={state === "saving" ? styles.spin : undefined}
      />
      <div className={styles.copy}>
        <span className={styles.message}>{text.message}</span>
        {text.detail && <span className={styles.detail}>{text.detail}</span>}
      </div>
      {state !== "saved" && (
        <div className={styles.actions}>
          {state === "changed" && (
            <>
              <Button size="md" onClick={onCancel}>
                취소
              </Button>
              <Button
                size="md"
                variant="primary"
                icon="check"
                disabled={saveDisabled}
                onClick={onSave}
              >
                변경사항 저장
              </Button>
            </>
          )}
          {state === "saving" && (
            <Button size="md" busy>
              저장 중…
            </Button>
          )}
          {state === "error" && (
            <Button size="md" icon="refresh-cw" onClick={onRetry ?? onSave}>
              다시 시도
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
