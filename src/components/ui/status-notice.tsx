import type { HTMLAttributes, ReactNode } from "react";

import { classNames } from "./class-names";
import styles from "./ui.module.css";

export type StatusNoticeVariant = "info" | "error" | "success";

export interface StatusNoticeProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  variant?: StatusNoticeVariant;
}

export function StatusNotice({
  children,
  className,
  icon,
  variant = "info",
  ...props
}: StatusNoticeProps) {
  const isError = variant === "error";

  return (
    <div
      {...props}
      aria-live={isError ? "assertive" : "polite"}
      className={classNames(styles.notice, className)}
      data-variant={variant}
      role={isError ? "alert" : "status"}
    >
      <span aria-hidden="true" className={styles.noticeIcon}>
        {icon ?? (isError ? "!" : "i")}
      </span>
      <span>{children}</span>
    </div>
  );
}
