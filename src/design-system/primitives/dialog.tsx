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

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  icon: IconName;
  title: string;
  description?: ReactNode;
  target?: { icon: IconName; name: string };
  children?: ReactNode;
  actions: ReactNode;
  actionsLead?: ReactNode;
  dismissible?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  icon,
  title,
  description,
  target,
  children,
  actions,
  actionsLead,
  dismissible = true,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy={titleId}
      describedBy={description ? descriptionId : undefined}
      className={styles.confirm}
      dismissible={dismissible}
    >
      <div className={styles.confirmBody}>
        <div className={styles.header}>
          <div className={styles.iconSurface}>
            <Icon name={icon} size={18} />
          </div>
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
        </div>
        {target && (
          <div className={styles.target}>
            <Icon name={target.icon} size={16} />
            <span className={styles.targetName}>{target.name}</span>
          </div>
        )}
        {children}
        <div className={styles.actions}>
          {actionsLead && (
            <div className={styles.actionsLead}>{actionsLead}</div>
          )}
          {actions}
        </div>
      </div>
    </Modal>
  );
}
