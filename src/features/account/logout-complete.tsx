"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Button, Icon } from "@/design-system/primitives";
import { t } from "@/i18n";

import styles from "./account.module.css";

const REDIRECT_MS = 4000;

export function LogoutComplete() {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(
      () => router.replace("/login"),
      REDIRECT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [router]);

  return (
    <main className={styles.page}>
      <p className={styles.brand}>Lore Sentry</p>
      <section className={styles.completion} aria-labelledby="logout-title">
        <div className={styles.completionHeading} role="status">
          <span className={styles.completionIcon}>
            <Icon name="log-out" size={24} />
          </span>
          <h1 id="logout-title" className={styles.completionTitle}>
            {t("로그아웃되었습니다")}
          </h1>
          <p>{t("잠시 후 로그인 화면으로 이동합니다.")}</p>
        </div>
        <Button
          size="lg"
          variant="primary"
          icon="arrow-right"
          className={styles.fullWidth}
          onClick={() => router.replace("/login")}
        >
          {t("로그인 화면으로 이동")}
        </Button>
      </section>
    </main>
  );
}
