import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cx } from "@/shared/cx";

import { Icon, type IconName } from "../icons/icon";
import styles from "./button.module.css";

export type ButtonVariant = "outline" | "primary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconSize?: number;
  trailingIcon?: IconName;
  busy?: boolean;
  children?: ReactNode;
}

const variantClass: Record<ButtonVariant, string> = {
  outline: styles.outline,
  primary: styles.primary,
  ghost: styles.ghost,
};

const sizeClass: Record<ButtonSize, string | undefined> = {
  sm: undefined,
  md: styles.sizeMd,
  lg: styles.sizeLg,
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "outline",
      size = "sm",
      icon,
      iconSize = 14,
      trailingIcon,
      busy = false,
      className,
      children,
      type = "button",
      disabled,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          styles.button,
          variantClass[variant],
          sizeClass[size],
          className,
        )}
        disabled={disabled || busy}
        aria-busy={busy || undefined}
        {...rest}
      >
        {busy ? (
          <Icon name="loader-circle" size={iconSize} className={styles.spin} />
        ) : (
          icon && <Icon name={icon} size={iconSize} />
        )}
        {children}
        {trailingIcon && <Icon name={trailingIcon} size={iconSize} />}
      </button>
    );
  },
);

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children"
> {
  icon: IconName;
  label: string;
  iconSize?: number;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    { icon, label, iconSize = 14, className, type = "button", ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cx(styles.iconButton, className)}
        {...rest}
      >
        <Icon name={icon} size={iconSize} />
      </button>
    );
  },
);
