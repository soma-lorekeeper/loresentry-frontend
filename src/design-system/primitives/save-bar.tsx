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

const DEFAULT_COPY: Record<SaveBarState, SaveBarCopy> = {
  unchanged: {
    message: "변경한 내용이 없어요",
    detail: "값을 바꾸면 저장할 수 있어요.",
  },
  changed: {
    message: "저장되지 않은 변경사항",
    detail: "저장하거나 마지막 값으로 되돌리세요.",
  },
  saving: {
    message: "설정을 저장하고 있습니다",
    detail: "잠시만 기다려 주세요.",
  },
  saved: {
    message: "설정이 저장되었습니다",
    detail: "이제 창을 닫아도 안전합니다.",
  },
  error: {
    message: "설정을 저장하지 못했어요",
    detail: "입력한 값은 유지됩니다.",
  },
};

const STATE_ICON: Record<SaveBarState, IconName> = {
  unchanged: "circle-check",
  changed: "circle-dot",
  saving: "loader-circle",
  saved: "circle-check",
  error: "cloud-off",
};

interface SaveBarProps {
  state: SaveBarState;
  copy?: Partial<Record<SaveBarState, SaveBarCopy>>;
  onSave: () => void;
  onCancel: () => void;
  onRetry?: () => void;
  className?: string;
}

export function SaveBar({
  state,
  copy,
  onSave,
  onCancel,
  onRetry,
  className,
}: SaveBarProps) {
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
        <span className={styles.detail}>{text.detail}</span>
      </div>
      {state === "unchanged" && (
        <Button size="md" icon="save" disabled className={styles.muted}>
          변경사항 저장
        </Button>
      )}
      {state === "changed" && (
        <>
          <Button size="md" onClick={onCancel}>
            취소
          </Button>
          <Button size="md" variant="primary" icon="check" onClick={onSave}>
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
  );
}
