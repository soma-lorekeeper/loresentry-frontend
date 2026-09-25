"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { Button, Icon } from "@/design-system/primitives";

import styles from "./account.module.css";

const REDIRECT_MS = 4000;

export function LogoutComplete() {
  const router = useRouter();
  const result = useSearchParams().get("result");
  const confirmed = result === "confirmed";
  const absent = result === "not_requested";
  const completed = confirmed || absent;

  useEffect(() => {
    if (!completed) return;
    const timer = window.setTimeout(
      () => router.replace("/login"),
      REDIRECT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [router, completed]);

  return (
    <main className={styles.page}>
      <p className={styles.brand}>Lorekeeper</p>
      <section className={styles.completion} aria-labelledby="logout-title">
        <p className={styles.announcement} role="status">
          <Icon name="circle-check" size={16} />
          {confirmed
            ? "서버에서 세션 폐기를 확인했습니다."
            : absent
              ? "로그아웃할 로그인 쿠키가 없었습니다."
              : "서버의 세션 폐기를 확인하지 못했습니다."}
        </p>
        <div className={styles.completionHeading}>
          <span className={styles.completionIcon}>
            <Icon name="log-out" size={24} />
          </span>
          <h1 id="logout-title" className={styles.completionTitle}>
            {completed ? "로그아웃 처리 결과" : "세션 종료 확인이 필요해요"}
          </h1>
          <p>
            {completed
              ? "잠시 후 로그인 화면으로 이동합니다."
              : "로그인 정보 정리를 요청했지만 서버 종료 여부는 확인되지 않았습니다."}
          </p>
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
