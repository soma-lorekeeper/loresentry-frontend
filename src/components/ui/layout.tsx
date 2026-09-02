import type { HTMLAttributes } from "react";

import { classNames } from "./class-names";
import styles from "./ui.module.css";

type Gap = 1 | 2 | 3 | 4 | 6;

interface LayoutProps extends HTMLAttributes<HTMLDivElement> {
  gap?: Gap;
}

export function Stack({ className, gap = 3, ...props }: LayoutProps) {
  return (
    <div
      {...props}
      className={classNames(styles.stack, className)}
      data-gap={gap}
    />
  );
}

export function Inline({ className, gap = 2, ...props }: LayoutProps) {
  return (
    <div
      {...props}
      className={classNames(styles.inline, className)}
      data-gap={gap}
    />
  );
}

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement> {
  elevation?: "default" | "raised";
}

export function Surface({
  className,
  elevation = "default",
  ...props
}: SurfaceProps) {
  return (
    <div
      {...props}
      className={classNames(styles.surface, className)}
      data-elevation={elevation}
    />
  );
}
