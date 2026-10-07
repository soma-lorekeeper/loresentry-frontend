"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useRuntimeConfig } from "@/app/providers";
import { Icon, StatusNotice } from "@/design-system/primitives";
import { finishAuthNavigation } from "@/services/api/auth-transition";
import type { AuthFailure } from "@/services/ports";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

import { TermsConsent } from "./terms-consent";
import { GoogleMark } from "./google-mark";
import styles from "./login-page.module.css";
import { safeReturnTo } from "./return-to";
import { useSession } from "./session-gate";

type LoginStatus = "idle" | "processing" | AuthFailure;

const COPY: Record<LoginStatus, { title: string; action: string }> = {
  idle: { title: "로그인", action: "Google로 계속하기" },
  processing: {
    title: "로그인",
    action: "Google 로그인으로 이동 중…",
  },
  canceled: { title: "로그인", action: "Google로 다시 계속하기" },
  failed: { title: "로그인", action: "Google로 다시 계속하기" },
  expired: { title: "다시 로그인해 주세요", action: "Google로 다시 로그인" },
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
  const [requested, setRequested] = useState<LoginStatus>(() => {
    // `result=success` 는 아직 증거가 아니므로 "확인 중"으로 시작한다. 아래 effect 가
    // 세션을 다시 물어 확정한다.
    if (loginResult === "success") return "processing";
    return resultStatus(loginResult) ?? initialStatus(searchParams.get("auth"));
  });
  const [termsClosed, setTermsClosed] = useState(false);
  const termsEntry = loginResult === "terms_required";
  const showTerms = termsEntry && !termsClosed;
  const [holdSession, setHoldSession] = useState(termsEntry);
  const session = useSession(
    !holdSession && !termsEntry && loginResult !== "success",
  );
  const closeTerms = () => {
    setTermsClosed(true);
    setHoldSession(true);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("result");
    router.replace(`/login${params.size ? `?${params}` : ""}`);
  };
  const returnTo = safeReturnTo(searchParams.get("returnTo"));

  const status = requested;
  const copy = COPY[status];
  const processing = status === "processing";

  useEffect(() => {
    if (loginResult) finishAuthNavigation();
    if (loginResult !== "success") return;
    let active = true;
    void (async () => {
      await queryClient.cancelQueries();
      queryClient.clear();
      try {
        const user = await services.auth.getSession();
        if (!active) return;
        if (!user) {
          setRequested("failed");
          return;
        }
        queryClient.setQueryData(queryKeys.session, user);
        router.replace(returnTo ?? "/projects");
      } catch {
        if (active) setRequested("failed");
      }
    })();
    return () => {
      active = false;
    };
  }, [loginResult, queryClient, services.auth, router, returnTo]);

  useEffect(() => {
    if (
      !holdSession &&
      !termsEntry &&
      loginResult !== "success" &&
      session.data
    )
      router.replace(returnTo ?? "/projects");
  }, [session.data, returnTo, router, holdSession, termsEntry, loginResult]);

  const start = async () => {
    setRequested("processing");
    try {
      // 실제 로그인은 BFF 로의 페이지 이동이므로 여기서 돌아오지 않는다. mock 은 즉시
      // 돌아오므로 아래 두 줄이 그때의 흐름을 유지한다.
      await services.auth.startGoogleLogin(returnTo ?? "/projects");
      await queryClient.invalidateQueries({ queryKey: queryKeys.session });
      router.replace(returnTo ?? "/projects");
    } catch {
      setRequested("failed");
    }
  };

  return (
    <main className={styles.page}>
      <Link href="/" className={styles.wordmark} aria-label="Lore Sentry 소개">
        <span className={styles.letterMark} aria-hidden="true">
          L
        </span>
        Lore Sentry
      </Link>

      <div className={styles.card}>
        <h1 className={styles.title}>{copy.title}</h1>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.googleButton}
            onClick={start}
            disabled={processing || showTerms}
            aria-busy={processing || undefined}
          >
            {processing ? (
              <Icon name="loader-circle" size={16} className={styles.spin} />
            ) : (
              <GoogleMark />
            )}
            {copy.action}
          </button>

          {status === "canceled" && (
            <StatusNotice tone="info">Google 로그인이 취소됐어요.</StatusNotice>
          )}
          {status === "failed" && (
            <StatusNotice tone="error">
              로그인을 완료하지 못했어요. 다시 시도해 주세요.
            </StatusNotice>
          )}
          {status === "expired" && (
            <StatusNotice tone="info">
              세션이 만료됐어요.
              {returnTo && " 로그인하면 하던 작업으로 돌아가요."}
            </StatusNotice>
          )}
        </div>

        {showTerms && (
          <TermsConsent
            privacyUrl={config.privacyPolicyUrl || "/policies/privacy.html"}
            onClose={closeTerms}
            onComplete={() => router.replace(returnTo ?? "/projects")}
          />
        )}
      </div>

      <nav className={styles.policyLinks} aria-label="정책">
        <PolicyLink
          href={config.termsOfServiceUrl || "/policies/terms.html"}
          label="이용약관"
        />
        <PolicyLink
          href={config.privacyPolicyUrl || "/policies/privacy.html"}
          label="개인정보처리방침"
        />
      </nav>
    </main>
  );
}
