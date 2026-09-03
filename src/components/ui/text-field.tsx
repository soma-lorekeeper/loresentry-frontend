import { forwardRef, type InputHTMLAttributes } from "react";

import { classNames } from "./class-names";
import styles from "./ui.module.css";

export interface TextFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id"
> {
  description?: string;
  error?: string;
  id: string;
  label: string;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    { className, description, error, id, label, required, ...props },
    ref,
  ) {
    const descriptionId =
      description && !error ? `${id}-description` : undefined;
    const errorId = error ? `${id}-error` : undefined;
    const describedBy = [descriptionId, errorId].filter(Boolean).join(" ");

    return (
      <div className={classNames(styles.field, className)}>
        <div className={styles.labelRow}>
          <label htmlFor={id}>{label}</label>
          {required && <span className={styles.required}>필수</span>}
        </div>
        <input
          {...props}
          aria-describedby={describedBy || undefined}
          aria-invalid={Boolean(error) || undefined}
          className={styles.input}
          id={id}
          ref={ref}
          required={required}
        />
        {description && !error && (
          <p className={styles.fieldMessage} id={descriptionId}>
            {description}
          </p>
        )}
        {error && (
          <p className={styles.fieldError} id={errorId}>
            {error}
          </p>
        )}
      </div>
    );
  },
);
