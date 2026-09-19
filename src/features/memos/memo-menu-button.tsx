"use client";

import { useRef, useState } from "react";

import { IconButton, Menu, type MenuEntry } from "@/design-system/primitives";

import styles from "./memo-view.module.css";

export function MemoMenuButton({
  label,
  entries,
  className,
}: {
  label: string;
  entries: MenuEntry[];
  className?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        ref={ref}
        icon="ellipsis"
        iconSize={15}
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className={className ?? styles.menuButton}
        onClick={() => setOpen((value) => !value)}
      />
      {open && (
        <Menu
          anchorRef={ref}
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) ref.current?.focus();
          }}
          label={label}
          placement="bottom-end"
          width={188}
          entries={entries}
        />
      )}
    </>
  );
}
