"use client";

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";

import { cx } from "@/shared/cx";

import { Icon } from "../icons/icon";
import styles from "./field.module.css";

export type FieldDensity = "dialog" | "settings";

interface FieldChromeProps {
  label: string;
  required?: boolean;
  labelHint?: string;
  hint?: string;
  error?: string;
  maxLength?: number;
  length?: number;
  density?: FieldDensity;
  className?: string;
}

function FieldChrome({
  label,
  required,
  labelHint,
  hint,
  error,
  maxLength,
  length,
  density = "dialog",
  className,
  controlId,
  messageId,
  children,
}: FieldChromeProps & {
  controlId: string;
  messageId: string;
  children: React.ReactNode;
}) {
  const showCounter = maxLength !== undefined && length !== undefined;
  const hasMeta = Boolean(hint || error || showCounter);
  return (
    <div
      className={cx(
        styles.field,
        density === "settings" && styles.settings,
        className,
      )}
    >
      <div className={styles.labelRow}>
        <label htmlFor={controlId} className={styles.label}>
          {label}
        </label>
        {(required || labelHint) && (
          <span className={cx(styles.required, labelHint && styles.labelHint)}>
            {labelHint ?? "필수"}
          </span>
        )}
      </div>
      {children}
      {hasMeta && (
        <div className={styles.meta}>
          {error ? (
            <span id={messageId} className={styles.error} role="alert">
              {density !== "settings" && <Icon name="circle-alert" size={14} />}
              {error}
            </span>
          ) : (
            <span id={messageId} className={styles.hint}>
              {hint}
            </span>
          )}
          {showCounter && (
            <span className={styles.counter}>
              {length}/{maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export interface TextFieldProps
  extends
    FieldChromeProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "maxLength"> {}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      required,
      labelHint,
      hint,
      error,
      maxLength,
      density,
      className,
      id,
      value,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const messageId = `${controlId}-message`;
    return (
      <FieldChrome
        label={label}
        required={required}
        labelHint={labelHint}
        hint={hint}
        error={error}
        maxLength={maxLength}
        length={typeof value === "string" ? value.length : undefined}
        density={density}
        className={className}
        controlId={controlId}
        messageId={messageId}
      >
        <input
          ref={ref}
          id={controlId}
          className={styles.control}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint || error ? messageId : undefined}
          aria-required={required || undefined}
          {...rest}
        />
      </FieldChrome>
    );
  },
);

export interface TextAreaFieldProps
  extends
    FieldChromeProps,
    Omit<
      TextareaHTMLAttributes<HTMLTextAreaElement>,
      "className" | "maxLength"
    > {}

export const TextAreaField = forwardRef<
  HTMLTextAreaElement,
  TextAreaFieldProps
>(function TextAreaField(
  {
    label,
    required,
    labelHint,
    hint,
    error,
    maxLength,
    density,
    className,
    id,
    value,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const messageId = `${controlId}-message`;
  return (
    <FieldChrome
      label={label}
      required={required}
      labelHint={labelHint}
      hint={hint}
      error={error}
      maxLength={maxLength}
      length={typeof value === "string" ? value.length : undefined}
      density={density}
      className={className}
      controlId={controlId}
      messageId={messageId}
    >
      <textarea
        ref={ref}
        id={controlId}
        className={styles.control}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? messageId : undefined}
        {...rest}
      />
    </FieldChrome>
  );
});
