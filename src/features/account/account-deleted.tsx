"use client";

import { useRouter } from "next/navigation";

import { Button, Icon } from "@/design-system/primitives";

import styles from "./account.module.css";

export function AccountDeleted() {
  const router = useRouter();
  return (
    <main className={styles.page}>
      <p className={styles.brand}>Lore Sentry</p>
      <section className={styles.completion} aria-labelledby="deleted-title">
        <p className={styles.announcement} role="status">
          <Icon name="circle-check" size={16} />
          계정과 모든 작업을 삭제했어요.
        </p>
        <div className={styles.completionHeading}>
          <span className={styles.completionIcon}>
            <Icon name="user-x" size={24} />
          </span>
          <h1 id="deleted-title" className={styles.completionTitle}>
            계정이 삭제되었어요
          </h1>
          <p>같은 Google 계정으로 다시 로그인하면 새 계정으로 시작해요.</p>
        </div>
        <Button
          size="lg"
          variant="primary"
          icon="arrow-right"
          className={styles.fullWidth}
          onClick={() => router.replace("/login")}
        >
          로그인 화면으로 이동
        </Button>
      </section>
    </main>
  );
}
