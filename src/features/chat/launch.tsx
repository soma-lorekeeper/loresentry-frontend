import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import styles from "./chat.module.css";

export const CHAT_LAUNCHED = false;

export function ChatSoonBadge({ className }: { className?: string }) {
  if (CHAT_LAUNCHED) return null;
  return <span className={cx(styles.soon, className)}>{t("곧 열려요")}</span>;
}
