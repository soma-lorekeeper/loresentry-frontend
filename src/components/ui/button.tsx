import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { classNames } from "./class-names";
import styles from "./ui.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  isProcessing?: boolean;
  variant?: ButtonVariant;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      children,
      className,
      disabled,
      icon,
      isProcessing = false,
      type = "button",
      variant = "secondary",
      ...props
    },
    ref,
  ) {
    return (
      <button
        {...props}
        aria-busy={isProcessing || undefined}
        className={classNames(styles.button, className)}
        data-variant={variant}
        disabled={disabled || isProcessing}
        ref={ref}
        type={type}
      >
        {isProcessing ? (
          <span aria-hidden="true" className={styles.spinner} />
        ) : (
          icon && (
            <span aria-hidden="true" className={styles.buttonIcon}>
              {icon}
            </span>
          )
        )}
        <span>{children}</span>
      </button>
    );
  },
);

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label"
> {
  "aria-label": string;
  isProcessing?: boolean;
}

export function IconButton({
  "aria-label": ariaLabel,
  children,
  className,
  disabled,
  isProcessing = false,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      {...props}
      aria-busy={isProcessing || undefined}
      aria-label={ariaLabel}
      className={classNames(styles.iconButton, className)}
      disabled={disabled || isProcessing}
      type={type}
    >
      {isProcessing ? (
        <span aria-hidden="true" className={styles.spinner} />
      ) : (
        children
      )}
    </button>
  );
}
