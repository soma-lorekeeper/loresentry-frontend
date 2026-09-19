import type { ReactNode } from "react";

import styles from "./view-page.module.css";

export function ViewPage({
  context,
  title,
  description,
  meta,
  children,
}: {
  context: string;
  title: string;
  description: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <p className={styles.context}>{context}</p>
      <header className={styles.header}>
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.subline}>
          <p className={styles.description}>{description}</p>
          {meta !== undefined && (
            <p className={styles.meta} aria-live="polite">
              {meta}
            </p>
          )}
        </div>
      </header>
      {children}
    </div>
  );
}

export function ViewPanel({ children }: { children: ReactNode }) {
  return <div className={styles.panel}>{children}</div>;
}
