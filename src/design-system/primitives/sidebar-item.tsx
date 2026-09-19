import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cx } from "@/shared/cx";

import { Icon, type IconName } from "../icons/icon";
import styles from "./sidebar-item.module.css";

interface SidebarItemBase {
  icon: IconName;
  label: string;
  selected?: boolean;
  strong?: boolean;
  trailing?: ReactNode;
  className?: string;
}

export function SidebarLink({
  icon,
  label,
  selected,
  strong,
  trailing,
  className,
  href,
}: SidebarItemBase & { href: string }) {
  return (
    <Link
      href={href}
      className={cx(styles.item, strong && styles.strong, className)}
      aria-current={selected ? "page" : undefined}
    >
      <Icon name={icon} size={15} />
      <span className={styles.label}>{label}</span>
      {trailing}
    </Link>
  );
}

export function SidebarButton({
  icon,
  label,
  selected,
  strong,
  trailing,
  className,
  ...rest
}: SidebarItemBase & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cx(styles.item, strong && styles.strong, className)}
      data-selected={selected || undefined}
      {...rest}
    >
      <Icon name={icon} size={15} />
      <span className={styles.label}>{label}</span>
      {trailing}
    </button>
  );
}
