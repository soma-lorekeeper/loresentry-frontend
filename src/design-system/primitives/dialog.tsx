"use client";

import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type SyntheticEvent,
} from "react";

import { cx } from "@/shared/cx";

import { Icon, type IconName } from "../icons/icon";
import { IconButton } from "./button";
import styles from "./dialog.module.css";

export type ModalScrim = "dialog" | "modal" | "strong";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  describedBy?: string;
  className?: string;
  scrim?: ModalScrim;
  dismissible?: boolean;
  children: ReactNode;
}

const scrimClass: Record<ModalScrim, string | undefined> = {
  dialog: undefined,
  modal: styles.scrimModal,
  strong: styles.scrimStrong,
};

export function Modal({
  open,
  onClose,
  labelledBy,
  label,
  describedBy,
  className,
  scrim = "dialog",
  dismissible = true,
  children,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(
    () => () => {
      returnFocusRef.current?.focus?.();
    },
    [],
  );

  const handleClose = () => {
    const target = returnFocusRef.current;
    returnFocusRef.current = null;
    requestAnimationFrame(() => {
      if (target?.isConnected) target.focus();
    });
  };

  const onCancel = (event: SyntheticEvent<HTMLDialogElement>) => {
    event.preventDefault();
    if (dismissible) onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-label={label}
      aria-describedby={describedBy}
      className={cx(styles.modal, scrimClass[scrim], className)}
      onCancel={onCancel}
      onClose={handleClose}
      onClick={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose();
      }}
    >
      {open && children}
    </dialog>
  );
}

export type DialogSize = "sm" | "md" | "lg";

const sizeClass: Record<DialogSize, string> = {
  sm: styles.sizeSm,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

interface DialogCardProps {
  open: boolean;
  onClose: () => void;
  size?: DialogSize;
  icon?: IconName;
  title: string;
  description?: ReactNode;
  closeLabel?: string;
  closeDisabled?: boolean;
  compact?: boolean;
  target?: { icon: IconName; name: string };
  children?: ReactNode;
  footerHint?: ReactNode;
  actions: ReactNode;
  dismissible?: boolean;
}

export function DialogCard({
  open,
  onClose,
  size = "sm",
  icon,
  title,
  description,
  closeLabel,
  closeDisabled,
  compact,
  target,
  children,
  footerHint,
  actions,
  dismissible = true,
}: DialogCardProps) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={description ? descriptionId : undefined}
      className={sizeClass[size]}
      dismissible={dismissible}
    >
      <div className={cx(styles.card, compact && styles.compact)}>
        <div className={styles.header}>
          {icon && (
            <div className={styles.iconSurface}>
              <Icon name={icon} size={size === "sm" ? 18 : 20} />
            </div>
          )}
          <div className={styles.copy}>
            <h2 id={titleId} className={styles.title}>
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className={styles.description}>
                {description}
              </p>
            )}
          </div>
          {closeLabel && (
            <IconButton
              icon="x"
              label={closeLabel}
              className={styles.close}
              onClick={onClose}
              disabled={closeDisabled}
            />
          )}
        </div>
        {target && (
          <div className={styles.target}>
            <Icon name={target.icon} size={16} />
            <span className={styles.targetName}>{target.name}</span>
          </div>
        )}
        {children}
        <div className={styles.actions}>
          {footerHint && <div className={styles.actionsLead}>{footerHint}</div>}
          {actions}
        </div>
      </div>
    </Modal>
  );
}

export function DialogDetail({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className={styles.detail}>
      <span className={styles.detailLabel}>{label}</span>
      <span className={styles.detailValue}>{value}</span>
    </div>
  );
}

export function DialogBullets({
  items,
}: {
  items: Array<{ icon: IconName; text: string; accent?: boolean }>;
}) {
  return (
    <ul className={styles.bullets}>
      {items.map((item) => (
        <li
          key={item.text}
          className={cx(styles.bullet, item.accent && styles.bulletAccent)}
        >
          <Icon name={item.icon} size={15} />
          {item.text}
        </li>
      ))}
    </ul>
  );
}
