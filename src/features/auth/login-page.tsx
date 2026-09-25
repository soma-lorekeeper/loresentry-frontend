"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useRuntimeConfig } from "@/app/providers";
import { Icon, StatusNotice } from "@/design-system/primitives";
import { LOGIN_RETURN_KEY } from "@/services/api/auth";
import { ServiceError } from "@/services/errors";
import type { AuthFailure } from "@/services/ports";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { cx } from "@/shared/cx";

import { GoogleMark } from "./google-mark";
import styles from "./login-page.module.css";
import { safeReturnTo } from "./return-to";

type LoginStatus = "idle" | "processing" | "unavailable" | AuthFailure;

const COPY: Record<
  LoginStatus,
  { title: string; description: string; action: string }
> = {
  idle: {
    title: "Lorekeeper에 로그인",
    description: "Google 계정으로 안전하게 계속하세요.",
    action: "Google로 계속하기",
  },
  processing: {
    title: "Lorekeeper에 로그인",
    description: "Google 계정으로 안전하게 계속하세요.",
    action: "Google 로그인으로 이동 중…",
  },
  unavailable: {
    title: "로그인 상태를 확인할 수 없어요",
    description: "일시적인 연결 문제일 수 있어요. 잠시 뒤 다시 시도해 주세요.",
    action: "다시 Google로 계속하기",
  },
  canceled: {
    title: "Lorekeeper에 로그인",
    description: "Google 인증을 다시 시작할 수 있습니다.",
    action: "다시 Google로 계속하기",
  },
  failed: {
    title: "Lorekeeper에 로그인",
    description: "Google 인증을 다시 시작할 수 있습니다.",
    action: "다시 Google로 계속하기",
  },
  expired: {
    title: "다시 로그인해 주세요",
    description: "작업을 안전하게 이어가려면 인증이 필요합니다.",
    action: "Google로 다시 로그인",
  },
};

export function initialStatus(value: string | null): LoginStatus {
  if (value === "success") return "processing";
  if (value === "cancelled" || value === "canceled") return "canceled";
  if (value === "invalid" || value === "expired") return "expired";
  if (value === "unavailable") return "unavailable";
  return value === "failed" ? "failed" : "idle";
}

function PolicyLink({ href, label }: { href: string; label: string }) {
  if (!href) {
    return (
      <span className={styles.policyLink} aria-disabled="true">
        {label}
      </span>
    );
  }
  return (
    <a
      className={styles.policyLink}
      href={href}
      target="_blank"
      rel="noreferrer"
    >
      {label}
    </a>
  );
}

export function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const services = useServices();
  const queryClient = useQueryClient();
  const config = useRuntimeConfig();
  const [status, setStatus] = useState<LoginStatus>(() =>
    initialStatus(searchParams.get("result") ?? searchParams.get("auth")),
  );
  const [storedReturnTo] = useState(() => {
    try {
      return safeReturnTo(window.sessionStorage.getItem(LOGIN_RETURN_KEY));
    } catch {
      return null;
    }
  });
  const returnTo = safeReturnTo(searchParams.get("returnTo")) ?? storedReturnTo;
  const result = searchParams.get("result");
  useEffect(() => {
    if (result !== "success") return;
    let active = true;
    services.auth
      .getSession()
      .then((user) => {
        if (!active) return;
        if (!user) {
          setStatus("expired");
          return;
        }
        queryClient.setQueryData(queryKeys.session, user);
        try {
          window.sessionStorage.removeItem(LOGIN_RETURN_KEY);
        } catch {
          /* Optional navigation state. */
        }
        router.replace(returnTo ?? "/projects");
      })
      .catch((error) => {
        if (active)
          setStatus(
            error instanceof ServiceError &&
              (error.code === "session-unavailable" || error.code === "network")
              ? "unavailable"
              : "failed",
          );
      });
    return () => {
      active = false;
    };
  }, [result, services, queryClient, router, returnTo]);
  const copy = COPY[status];
  const processing = status === "processing";

  const start = async () => {
    setStatus("processing");
    try {
      await services.auth.startGoogleLogin(returnTo ?? "/projects");
      if (config.dataSource === "api") return;
      await queryClient.invalidateQueries({ queryKey: queryKeys.session });
      router.replace(returnTo ?? "/projects");
    } catch {
      setStatus("failed");
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.brand} aria-label="Lorekeeper 소개">
        <div className={styles.wordmark}>
          <span className={styles.letterMark} aria-hidden="true">
            L
          </span>
          LOREKEEPER
        </div>
        <div className={styles.message}>
          <p className={styles.eyebrow}>WRITING WORKSPACE</p>
          <p className={styles.headline}>{"이야기를 쓰는 데\n집중하세요."}</p>
          <p className={styles.supporting}>
            Lorekeeper는 집필, 설정, 메모를 하나의 흐름으로 연결합니다.
          </p>
        </div>
        <p className={styles.footer}>Your story, uninterrupted.</p>
      </section>

      <section className={styles.authField}>
        <div className={cx(styles.card, status === "idle" && styles.cardIdle)}>
          <div className={styles.header}>
            <h1 className={styles.title}>{copy.title}</h1>
            <p className={styles.description}>{copy.description}</p>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.googleButton}
              onClick={start}
              disabled={processing}
              aria-busy={processing || undefined}
            >
              {processing ? (
                <Icon name="loader-circle" size={16} className={styles.spin} />
              ) : (
                <GoogleMark />
              )}
              {copy.action}
            </button>

            {status === "idle" && (
              <p className={styles.destination}>
                <Icon name="arrow-right" size={14} />
                로그인 후 프로젝트 목록으로 이동합니다.
              </p>
            )}
            {status === "processing" && (
              <StatusNotice tone="info">
                인증 요청을 시작했습니다. 잠시만 기다려 주세요.
              </StatusNotice>
            )}
            {status === "canceled" && (
              <StatusNotice tone="info">
                Google 로그인이 취소됐어요.
              </StatusNotice>
            )}
            {(status === "failed" || status === "unavailable") && (
              <StatusNotice tone="error">
                {status === "unavailable"
                  ? "로그인 상태를 확인하지 못했어요. 잠시 뒤 다시 시도해 주세요."
                  : "로그인을 완료하지 못했어요. 다시 시도해 주세요."}
              </StatusNotice>
            )}
            {status === "expired" && (
              <>
                <StatusNotice tone="info">
                  세션이 만료됐어요. 계속하려면 다시 로그인해 주세요.
                </StatusNotice>
                {returnTo && (
                  <p className={styles.recoveryNote}>
                    <Icon name="history" size={14} />
                    인증 후 확인된 이전 작업공간으로 돌아갑니다.
                  </p>
                )}
              </>
            )}
          </div>

          <div className={styles.policy}>
            <p>계속하면 Lorekeeper의 정책에 동의하게 됩니다.</p>
            <div className={styles.policyLinks}>
              <PolicyLink href={config.termsOfServiceUrl} label="이용약관" />
              <PolicyLink
                href={config.privacyPolicyUrl}
                label="개인정보처리방침"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
