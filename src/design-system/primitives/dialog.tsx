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

/**
 * 대화상자의 바탕 색을 주는 클래스. 대화상자 밖에서 대화상자의 내용을 그대로 그릴 때 붙인다
 * (dialog.module.css 의 `.surface`).
 */
export const DIALOG_SURFACE_CLASS = styles.surface;

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
    // `cancel` 은 대화상자만 내는 사건이 아니다. 안에 있는 파일 입력도 파일 선택 창을 고르지
    // 않고 닫으면 같은 이름의 사건을 내고, 그것이 여기까지 올라온다. 대화상자 자신의 것(Esc)만
    // 닫기로 받는다 — 가리지 않으면 파일을 고르다 그만둔 것만으로 창이 닫힌다.
    if (event.target !== event.currentTarget) return;
    event.preventDefault();
    if (dismissible) onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-label={label}
      aria-describedby={describedBy}
      className={cx(styles.modal, styles.surface, scrimClass[scrim], className)}
      onCancel={onCancel}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        if (!dismissible) event.preventDefault();
      }}
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
  title: string;
  description?: ReactNode;
  closeLabel?: string;
  closeDisabled?: boolean;
  compact?: boolean;
  /** `kind` 는 대상이 문서일 때의 종류다. 아이콘이 그 종류의 색을 받는다(theme/kinds.css). */
  target?: { icon: IconName; name: string; kind?: string };
  children?: ReactNode;
  footerHint?: ReactNode;
  actions: ReactNode;
  dismissible?: boolean;
}

export function DialogCard({
  open,
  onClose,
  size = "sm",
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
          <div className={styles.target} data-kind={target.kind}>
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
