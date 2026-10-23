"use client";

import { Button, EmptyState } from "@/design-system/primitives";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import styles from "./query-failure.module.css";

export function QueryFailure({
  title,
  retrying,
  onRetry,
  compact = false,
  className,
}: {
  title: string;
  retrying: boolean;
  onRetry: () => void;
  compact?: boolean;
  className?: string;
}) {
  const retry = (
    <Button size="sm" icon="rotate-cw" busy={retrying} onClick={onRetry}>
      {t("다시 시도")}
    </Button>
  );
  if (compact)
    return (
      <div role="alert" className={cx(styles.compact, className)}>
        <p>{title}</p>
        {retry}
      </div>
    );
  return (
    <EmptyState
      role="alert"
      icon="cloud-off"
      title={title}
      description={t("잠시 후 다시 시도해 주세요.")}
      action={retry}
      className={className}
    />
  );
}
