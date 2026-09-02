"use client";

import {
  type DialogHTMLAttributes,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
  useEffect,
  useId,
  useRef,
} from "react";

import { classNames } from "./class-names";
import styles from "./ui.module.css";

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface DialogProps extends Omit<
  DialogHTMLAttributes<HTMLDialogElement>,
  "open" | "title"
> {
  description?: ReactNode;
  initialFocusRef?: RefObject<HTMLElement | null>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  title: ReactNode;
}

export function Dialog({
  children,
  className,
  description,
  initialFocusRef,
  onOpenChange,
  open,
  title,
  ...props
}: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      requestAnimationFrame(() => {
        const target =
          initialFocusRef?.current ??
          dialog.querySelector<HTMLElement>(focusableSelector);
        target?.focus();
      });
    } else if (!open && dialog.open) {
      dialog.close();
      requestAnimationFrame(() => restoreFocusRef.current?.focus());
    }
  }, [initialFocusRef, open]);

  useEffect(
    () => () => {
      restoreFocusRef.current?.focus();
    },
    [],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== "Tab") return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
    );
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <dialog
      {...props}
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={titleId}
      aria-modal="true"
      className={classNames(styles.dialog, className)}
      onCancel={(event) => {
        event.preventDefault();
        onOpenChange(false);
      }}
      onClose={() => {
        if (open) onOpenChange(false);
      }}
      onKeyDown={handleKeyDown}
      ref={dialogRef}
    >
      <div className={styles.dialogHeader}>
        <div>
          <h2 className={styles.dialogTitle} id={titleId}>
            {title}
          </h2>
          {description && (
            <p className={styles.dialogDescription} id={descriptionId}>
              {description}
            </p>
          )}
        </div>
      </div>
      {children}
    </dialog>
  );
}

export function DialogActions({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={classNames(styles.dialogActions, className)} />
  );
}
