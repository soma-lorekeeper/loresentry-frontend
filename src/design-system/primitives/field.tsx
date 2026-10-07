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
  hideLabel?: boolean;
  required?: boolean;
  labelHint?: string;
  hint?: string;
  error?: string;
  maxLength?: number;
  length?: number;
  density?: FieldDensity;
  className?: string;
}

const COUNTER_THRESHOLD = 0.8;

function showsCounter(length: number | undefined, maxLength?: number) {
  return (
    maxLength !== undefined &&
    length !== undefined &&
    length >= maxLength * COUNTER_THRESHOLD
  );
}

function describedBy(
  messageId: string,
  counterId: string,
  hasMessage: boolean,
  hasCounter: boolean,
) {
  const ids = [hasMessage && messageId, hasCounter && counterId].filter(
    Boolean,
  );
  return ids.length ? ids.join(" ") : undefined;
}

function FieldChrome({
  label,
  hideLabel,
  labelHint,
  hint,
  error,
  maxLength,
  length,
  density = "dialog",
  className,
  controlId,
  messageId,
  counterId,
  children,
}: FieldChromeProps & {
  controlId: string;
  messageId: string;
  counterId: string;
  children: React.ReactNode;
}) {
  const showCounter = showsCounter(length, maxLength);
  const hasMeta = Boolean(hint || error || showCounter);
  return (
    <div
      className={cx(
        styles.field,
        density === "settings" && styles.settings,
        className,
      )}
    >
      <div className={cx(styles.labelRow, hideLabel && "lk-visually-hidden")}>
        <label htmlFor={controlId} className={styles.label}>
          {label}
        </label>
        {labelHint && <span className={styles.labelHint}>{labelHint}</span>}
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
            <span id={counterId} className={styles.counter}>
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
      hideLabel,
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
    const counterId = `${controlId}-counter`;
    const length = typeof value === "string" ? value.length : undefined;
    return (
      <FieldChrome
        label={label}
        hideLabel={hideLabel}
        labelHint={labelHint}
        hint={hint}
        error={error}
        maxLength={maxLength}
        length={length}
        density={density}
        className={className}
        controlId={controlId}
        messageId={messageId}
        counterId={counterId}
      >
        <input
          ref={ref}
          id={controlId}
          className={styles.control}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(
            messageId,
            counterId,
            Boolean(hint || error),
            showsCounter(length, maxLength),
          )}
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
  const counterId = `${controlId}-counter`;
  const length = typeof value === "string" ? value.length : undefined;
  return (
    <FieldChrome
      label={label}
      labelHint={labelHint}
      hint={hint}
      error={error}
      maxLength={maxLength}
      length={length}
      density={density}
      className={className}
      controlId={controlId}
      messageId={messageId}
      counterId={counterId}
    >
      <textarea
        ref={ref}
        id={controlId}
        className={styles.control}
        value={value}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(
          messageId,
          counterId,
          Boolean(hint || error),
          showsCounter(length, maxLength),
        )}
        aria-required={required || undefined}
        {...rest}
      />
    </FieldChrome>
  );
});
