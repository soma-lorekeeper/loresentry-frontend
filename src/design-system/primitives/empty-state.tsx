import type { ReactNode } from "react";

import { cx } from "@/shared/cx";

import { Icon, type IconName } from "../icons/icon";
import styles from "./empty-state.module.css";

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  size?: "md" | "lg";
  className?: string;
  role?: "status" | "alert";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  size = "md",
  className,
  role,
}: EmptyStateProps) {
  return (
    <div
      className={cx(styles.state, size === "lg" && styles.large, className)}
      role={role}
    >
      <span className={styles.iconSurface}>
        <Icon name={icon} size={size === "lg" ? 24 : 22} />
      </span>
      <h2 className={styles.title}>{title}</h2>
      {description && <div className={styles.description}>{description}</div>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
