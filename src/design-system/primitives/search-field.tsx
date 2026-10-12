"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type InputHTMLAttributes,
} from "react";

import { cx } from "@/shared/cx";

import { Icon } from "../icons/icon";
import styles from "./search-field.module.css";

interface SearchFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  value: string;
  label: string;
  clearLabel: string;
  onClear: () => void;
  busy?: boolean;
  busyLabel?: string;
}

export const SearchField = forwardRef<HTMLInputElement, SearchFieldProps>(
  function SearchField(
    {
      value,
      label,
      clearLabel,
      onClear,
      busy = false,
      busyLabel,
      placeholder,
      className,
      ...input
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current!, []);

    return (
      <div className={cx(styles.field, className)} role="search">
        <Icon name="search" size={17} className={styles.icon} />
        <span
          className={cx(styles.grow, !value && styles.empty)}
          data-value={value}
        >
          <input
            {...input}
            ref={inputRef}
            type="search"
            className={styles.input}
            value={value}
            placeholder={placeholder ?? label}
            aria-label={label}
            size={1}
          />
        </span>
        {busy ? (
          <Icon
            name="loader-circle"
            size={15}
            className={styles.spin}
            label={busyLabel}
          />
        ) : (
          value && (
            <button
              type="button"
              className={styles.clear}
              aria-label={clearLabel}
              onClick={() => {
                onClear();
                inputRef.current?.focus();
              }}
            >
              <Icon name="x" size={15} />
            </button>
          )
        )}
      </div>
    );
  },
);
