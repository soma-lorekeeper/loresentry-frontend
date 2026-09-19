"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";

import { cx } from "@/shared/cx";

import { Icon, type IconName } from "../icons/icon";
import styles from "./menu.module.css";
import { Popover, type PopoverPlacement } from "./popover";

export type MenuEntry =
  | {
      type?: "item";
      id: string;
      label: string;
      icon?: IconName;
      hint?: string;
      checked?: boolean;
      disabled?: boolean;
      destructive?: boolean;
      onSelect: () => void;
    }
  | { type: "separator"; id: string }
  | { type: "group"; id: string; label: string };

interface MenuProps {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entries: readonly MenuEntry[];
  label: string;
  placement?: PopoverPlacement;
  width?: number;
  itemHeight?: number;
  className?: string;
  footer?: ReactNode;
}

function menuItems(container: HTMLElement | null) {
  return Array.from(
    container?.querySelectorAll<HTMLButtonElement>(
      '[role^="menuitem"]:not(:disabled)',
    ) ?? [],
  );
}

export function Menu({
  anchorRef,
  open,
  onOpenChange,
  entries,
  label,
  placement,
  width,
  itemHeight,
  className,
  footer,
}: MenuProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(
    (restoreFocus: boolean) => {
      onOpenChange(false);
      if (restoreFocus) anchorRef.current?.focus();
    },
    [anchorRef, onOpenChange],
  );

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const items = menuItems(listRef.current);
      (
        items.find((item) => item.getAttribute("aria-checked") === "true") ??
        items[0]
      )?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = menuItems(listRef.current);
    const index = items.indexOf(document.activeElement as HTMLButtonElement);
    const focusAt = (next: number) =>
      items[(next + items.length) % items.length]?.focus();
    if (event.key === "ArrowDown") focusAt(index + 1);
    else if (event.key === "ArrowUp") focusAt(index - 1);
    else if (event.key === "Home") focusAt(0);
    else if (event.key === "End") focusAt(items.length - 1);
    else if (event.key === "Tab") close(false);
    else return;
    event.preventDefault();
  };

  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={(reason) => close(reason === "escape")}
      placement={placement}
    >
      <div
        ref={listRef}
        role="menu"
        aria-label={label}
        className={cx(styles.menu, className)}
        style={{
          ...(width ? { width } : {}),
          ...(itemHeight
            ? { ["--menu-item-height" as string]: `${itemHeight}px` }
            : {}),
        }}
        onKeyDown={onKeyDown}
      >
        {entries.map((entry) => {
          if (entry.type === "separator") {
            return (
              <hr
                key={entry.id}
                role="separator"
                className={styles.separator}
              />
            );
          }
          if (entry.type === "group") {
            return (
              <div key={entry.id} className={styles.groupLabel}>
                {entry.label}
              </div>
            );
          }
          const checkable = entry.checked !== undefined;
          return (
            <button
              key={entry.id}
              type="button"
              role={checkable ? "menuitemradio" : "menuitem"}
              aria-checked={checkable ? entry.checked : undefined}
              disabled={entry.disabled}
              tabIndex={-1}
              className={cx(
                styles.item,
                entry.destructive && styles.destructive,
              )}
              onClick={() => {
                close(true);
                entry.onSelect();
              }}
            >
              {entry.icon && <Icon name={entry.icon} size={15} />}
              <span className={styles.itemLabel}>{entry.label}</span>
              {entry.hint && (
                <span className={styles.itemHint}>{entry.hint}</span>
              )}
            </button>
          );
        })}
        {footer}
      </div>
    </Popover>
  );
}
