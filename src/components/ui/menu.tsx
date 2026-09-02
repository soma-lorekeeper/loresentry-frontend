"use client";

import {
  createContext,
  type ButtonHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { classNames } from "./class-names";
import { getMenuItemIndex, type NavigationIntent } from "./keyboard-navigation";
import styles from "./ui.module.css";

const MenuContext = createContext<(() => void) | null>(null);

function enabledItems(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLButtonElement>(
      '[role^="menuitem"]:not(:disabled)',
    ),
  );
}

export interface MenuProps {
  buttonContent: ReactNode;
  buttonLabel: string;
  children: ReactNode;
  className?: string;
}

export function Menu({
  buttonContent,
  buttonLabel,
  children,
  className,
}: MenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const initialFocus = useRef<NavigationIntent>("first");
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = (restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const open = (intent: NavigationIntent = "first") => {
    initialFocus.current = intent;
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const menu = rootRef.current?.querySelector<HTMLElement>("[role=menu]");
    if (!menu) return;
    const items = enabledItems(menu);
    const index = getMenuItemIndex(items.length, 0, initialFocus.current);
    requestAnimationFrame(() => items[index]?.focus());

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const handleTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      open(event.key === "ArrowUp" ? "last" : "first");
    }
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = enabledItems(event.currentTarget);
    const currentIndex = items.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    let intent: NavigationIntent | undefined;
    if (event.key === "ArrowDown") intent = "next";
    if (event.key === "ArrowUp") intent = "previous";
    if (event.key === "Home") intent = "first";
    if (event.key === "End") intent = "last";

    if (intent) {
      event.preventDefault();
      items[getMenuItemIndex(items.length, currentIndex, intent)]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      close(true);
    } else if (event.key === "Tab") {
      close();
    }
  };

  return (
    <div className={classNames(styles.menuRoot, className)} ref={rootRef}>
      <button
        aria-controls={isOpen ? menuId : undefined}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={buttonLabel}
        className={styles.button}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
        ref={triggerRef}
        type="button"
      >
        {buttonContent}
      </button>
      {isOpen && (
        <div
          aria-label={buttonLabel}
          className={styles.menu}
          id={menuId}
          onKeyDown={handleMenuKeyDown}
          role="menu"
        >
          <MenuContext.Provider value={() => close(true)}>
            {children}
          </MenuContext.Provider>
        </div>
      )}
    </div>
  );
}

export interface MenuItemProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "role"
> {
  selected?: boolean;
}

export function MenuItem({
  children,
  className,
  onClick,
  selected,
  ...props
}: MenuItemProps) {
  const close = useContext(MenuContext);
  const role = selected === undefined ? "menuitem" : "menuitemradio";

  return (
    <button
      {...props}
      aria-checked={selected === undefined ? undefined : selected}
      className={classNames(styles.menuItem, className)}
      data-selected={selected || undefined}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) close?.();
      }}
      role={role}
      type="button"
    >
      <span>{children}</span>
      {selected && (
        <span aria-hidden="true" className={styles.selectedMark}>
          ✓
        </span>
      )}
    </button>
  );
}
