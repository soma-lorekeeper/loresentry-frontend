import type { ReactNode } from "react";

import styles from "./view-page.module.css";

export function ViewPage({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {title}
          {meta !== undefined && meta !== null && (
            <span className={styles.meta} aria-live="polite">
              {meta}
            </span>
          )}
        </h1>
      </header>
      {children}
    </div>
  );
}

export function ViewPanel({ children }: { children: ReactNode }) {
  return <div className={styles.panel}>{children}</div>;
}
