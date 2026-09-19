"use client";

import { useRef, type KeyboardEvent } from "react";

import { cx } from "@/shared/cx";

import { Icon, type IconName } from "../icons/icon";
import styles from "./segmented.module.css";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: IconName;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  variant = "boxed",
  className,
}: {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  variant?: "boxed" | "pills";
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const move = (event: KeyboardEvent, delta: number) => {
    event.preventDefault();
    const index = options.findIndex((option) => option.value === value);
    const next = options[(index + delta + options.length) % options.length];
    onChange(next.value);
    rootRef.current
      ?.querySelector<HTMLElement>(`[data-value="${next.value}"]`)
      ?.focus();
  };
  return (
    <div
      ref={rootRef}
      role="radiogroup"
      aria-label={label}
      className={cx(
        styles.root,
        variant === "pills" && styles.pills,
        className,
      )}
      onKeyDown={(event) => {
        if (event.key === "ArrowRight" || event.key === "ArrowDown")
          move(event, 1);
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp")
          move(event, -1);
      }}
    >
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            data-value={option.value}
            className={styles.option}
            onClick={() => onChange(option.value)}
          >
            {option.icon && <Icon name={option.icon} size={14} />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
