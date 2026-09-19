"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { cx } from "@/shared/cx";

import { Icon, type IconName } from "../icons/icon";
import { Button } from "./button";
import styles from "./notice.module.css";

export function InlineNotice({
  icon = "triangle-alert",
  children,
  action,
  className,
}: {
  icon?: IconName;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div role="alert" className={cx(styles.inline, className)}>
      <Icon name={icon} size={16} />
      <span className={styles.inlineText}>{children}</span>
      {action}
    </div>
  );
}

export function StatusNotice({
  tone,
  children,
  className,
}: {
  tone: "info" | "error";
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cx(
        styles.status,
        tone === "info" ? styles.statusInfo : styles.statusError,
        className,
      )}
    >
      <Icon name={tone === "info" ? "info" : "triangle-alert"} size={16} />
      <span className={styles.statusText}>{children}</span>
    </div>
  );
}

export interface ToastInput {
  icon?: IconName;
  title: string;
  description?: string;
  durationMs?: number;
  action?: { label: string; icon?: IconName; onSelect: () => void };
}

interface ToastEntry extends ToastInput {
  id: number;
}

const ToastContext = createContext<(toast: ToastInput) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  const show = useCallback((toast: ToastInput) => {
    counter.current += 1;
    const id = counter.current;
    setToasts((current) => [...current.slice(-2), { ...toast, id }]);
    window.setTimeout(
      () => setToasts((current) => current.filter((t) => t.id !== id)),
      toast.durationMs ?? (toast.action ? 6000 : 3200),
    );
  }, []);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.toastRegion} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            <div className={styles.toastIcon}>
              <Icon name={toast.icon ?? "info"} size={17} />
            </div>
            <div className={styles.toastCopy}>
              <span className={styles.toastTitle}>{toast.title}</span>
              {toast.description && (
                <span className={styles.toastDescription}>
                  {toast.description}
                </span>
              )}
            </div>
            {toast.action && (
              <Button
                size="md"
                icon={toast.action.icon}
                className={styles.toastAction}
                onClick={() => {
                  toast.action?.onSelect();
                  setToasts((current) =>
                    current.filter((t) => t.id !== toast.id),
                  );
                }}
              >
                {toast.action.label}
              </Button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
