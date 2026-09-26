"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useRuntimeConfig } from "@/app/providers";
import { Icon, StatusNotice } from "@/design-system/primitives";
import type { AuthFailure } from "@/services/ports";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { cx } from "@/shared/cx";

import { GoogleMark } from "./google-mark";
import styles from "./login-page.module.css";
import { safeReturnTo } from "./return-to";

type LoginStatus = "idle" | "processing" | AuthFailure;

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

function initialStatus(value: string | null): LoginStatus {
  return value === "canceled" || value === "failed" || value === "expired"
    ? value
    : "idle";
}

/**
 * BFF 가 로그인 결과를 `?result=` 로 돌려보낸다. 그 값은 **안내일 뿐이고 증거가 아니다** —
 * 사용자가 URL 을 바꿀 수 있고, 그 직후 다른 로그인이 세션을 교체했을 수도 있다
 * (`loresentry-gateway/docs/FRONTEND_AUTH_CONTRACT.md`).
 *
 * 그래서 `success` 는 상태로 옮기지 않고, 아래에서 세션을 다시 물어 확인한다.
 */
function resultStatus(value: string | null): LoginStatus | null {
  switch (value) {
    case "cancelled":
      return "canceled";
    case "invalid":
      return "expired";
    case "unavailable":
    case "failed":
      return "failed";
    default:
      return null;
  }
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
  const loginResult = searchParams.get("result");
  const [status, setStatus] = useState<LoginStatus>(() => {
    // `result=success` 는 아직 증거가 아니므로 "확인 중"으로 시작한다. 아래 effect 가
    // 세션을 다시 물어 확정한다.
    if (loginResult === "success") return "processing";
    return resultStatus(loginResult) ?? initialStatus(searchParams.get("auth"));
  });
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const copy = COPY[status];
  const processing = status === "processing";

  // `result=success` 는 안내일 뿐이므로 서버에 물어 확인한다. 확인되면 세션 게이트가
  // 작업공간으로 보내고, 아니면 이 화면에 남는다.
  useEffect(() => {
    if (loginResult !== "success") return;
    void queryClient.invalidateQueries({ queryKey: queryKeys.session });
  }, [loginResult, queryClient]);

  const start = async () => {
    setStatus("processing");
    try {
      // 실제 로그인은 BFF 로의 페이지 이동이므로 여기서 돌아오지 않는다. mock 은 즉시
      // 돌아오므로 아래 두 줄이 그때의 흐름을 유지한다.
      await services.auth.startGoogleLogin(returnTo ?? "/projects");
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
            {status === "failed" && (
              <StatusNotice tone="error">
                로그인을 완료하지 못했어요. 다시 시도해 주세요.
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
