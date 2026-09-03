"use client";

import { useEffect, useRef, useState } from "react";

import { WorkspaceIcon } from "@/features/workspace/icons";

import {
  type GoogleAuthOutcome,
  type LoginState,
  resolveAuthDestination,
} from "../auth-model";
import styles from "./login-page.module.css";

export interface LoginPageProps {
  initialState?: LoginState;
  onNavigate?: (href: string) => void;
  startGoogleOAuth?: () => GoogleAuthOutcome | Promise<GoogleAuthOutcome>;
  privacyUrl?: string;
  termsUrl?: string;
  theme?: "dark" | "light";
}

function GoogleBrandMark() {
  return (
    <svg aria-hidden="true" className={styles.googleMark} viewBox="0 0 18 18">
      <path
        d="M7.956 1.44c0-.432-.036-.84-.12-1.44H0v2.94h4.548c-.168.876-.744 1.776-1.596 2.376l2.52 2.004c1.452-1.356 2.484-3.408 2.484-5.88Z"
        fill="#428AF2"
        transform="translate(9.06 7.68)"
      />
      <path
        d="M7.308 6.588c2.1 0 3.864-.672 5.472-2.1l-2.52-2.004c-.72.54-1.692.996-2.952.996-2.028 0-3.768-1.284-4.584-3.48L0 2.004c1.26 2.736 4.056 4.584 7.308 4.584Z"
        fill="#36A857"
        transform="translate(1.752 10.512)"
      />
      <path
        d="M3.468 5.124c-.168-.504-.204-.984-.204-1.512s.096-1.008.24-1.548L.78 0C.336.972 0 2.172 0 3.588s.276 2.472.756 3.54l2.736-2.004h-.024Z"
        fill="#F9BB07"
        transform="translate(.984 5.388)"
      />
      <path
        d="M7.296 3.144c1.32 0 2.328.456 3.288 1.248l2.34-2.172C11.544.936 9.708 0 7.296 0 4.152 0 1.356 1.884 0 4.428l2.724 2.064c.612-1.692 2.268-3.348 4.572-3.348Z"
        fill="#428AF2"
        transform="translate(1.764 .96)"
      />
      <path
        d="M0 0v3.18c1.32-.024 2.328.408 3.288 1.248l2.34-2.172C4.272.936 2.388 0 0 0Z"
        fill="#EA4336"
        transform="translate(9.06 .924)"
      />
    </svg>
  );
}

function PolicyLink({ children, href }: { children: string; href?: string }) {
  if (!href) {
    return (
      <span
        aria-disabled="true"
        className={styles.policyLink}
        title="정책 링크가 아직 연결되지 않았습니다."
      >
        {children}
      </span>
    );
  }

  return (
    <a className={styles.policyLink} href={href}>
      {children}
    </a>
  );
}

export function LoginPage({
  initialState = "default",
  onNavigate,
  privacyUrl,
  startGoogleOAuth,
  termsUrl,
  theme,
}: LoginPageProps) {
  const [state, setState] = useState<LoginState>(initialState);
  const requestRef = useRef<Promise<GoogleAuthOutcome> | null>(null);
  const resultTitleRef = useRef<HTMLHeadingElement>(null);
  const shouldFocusResultRef = useRef(false);
  useEffect(() => {
    if (!theme) return;
    const previousTheme = document.documentElement.dataset.theme;
    document.documentElement.dataset.theme = theme;
    return () => {
      if (previousTheme) document.documentElement.dataset.theme = previousTheme;
      else delete document.documentElement.dataset.theme;
    };
  }, [theme]);

  useEffect(() => {
    if (!shouldFocusResultRef.current) return;
    shouldFocusResultRef.current = false;
    resultTitleRef.current?.focus();
  }, [state]);

  const showResult = (result: Extract<LoginState, "canceled" | "failed">) => {
    shouldFocusResultRef.current = true;
    setState(result);
  };

  const startAuthentication = () => {
    if (state === "processing" || requestRef.current) return;
    const resumeExpiredWorkspace = state === "session-expired";
    setState("processing");

    const request = Promise.resolve().then(() => {
      if (!startGoogleOAuth) throw new Error("OAuth adapter is required");
      return startGoogleOAuth();
    });
    requestRef.current = request;
    void request
      .then((outcome) => {
        if (outcome.status === "success") {
          if (!onNavigate) throw new Error("navigation adapter is required");
          onNavigate(resolveAuthDestination(outcome, resumeExpiredWorkspace));
          return;
        }
        showResult(outcome.status);
      })
      .catch(() => showResult("failed"))
      .finally(() => {
        requestRef.current = null;
      });
  };

  const processing = state === "processing";
  const result =
    state === "canceled"
      ? {
          detail: "Google 로그인이 취소됐어요.",
          role: "status" as const,
          title: "로그인이 취소됐어요",
          variant: "info" as const,
        }
      : state === "failed"
        ? {
            detail: "로그인을 완료하지 못했어요. 다시 시도해 주세요.",
            role: "alert" as const,
            title: "로그인을 완료하지 못했어요",
            variant: "error" as const,
          }
        : state === "session-expired"
          ? {
              detail: "세션이 만료됐어요. 계속하려면 다시 로그인해 주세요.",
              role: "status" as const,
              title: "세션이 만료됐어요",
              variant: "info" as const,
            }
          : undefined;
  const actionLabel =
    state === "canceled" || state === "failed"
      ? "다시 시도"
      : processing
        ? "Google 로그인으로 이동 중…"
        : "Google로 계속하기";

  return (
    <main className={styles.page}>
      <section aria-labelledby="login-title" className={styles.loginPanel}>
        <div aria-label="Lorekeeper" className={styles.brand}>
          <span aria-hidden="true" className={styles.brandMark}>
            <WorkspaceIcon name="notebook-pen" />
          </span>
          <span>Lorekeeper</span>
        </div>

        <header className={styles.intro}>
          <h1 id="login-title">이야기를 계속 써 내려가세요</h1>
          <p>
            Google 계정으로 로그인해 프로젝트와 작업공간을 이어서 사용하세요.
          </p>
        </header>

        <button
          aria-busy={processing || undefined}
          aria-disabled={processing || undefined}
          className={styles.googleButton}
          data-processing={processing || undefined}
          onClick={startAuthentication}
          type="button"
        >
          {processing ? (
            <span aria-hidden="true" className={styles.spinner} />
          ) : (
            <GoogleBrandMark />
          )}
          <span aria-live={processing ? "polite" : undefined}>
            {actionLabel}
          </span>
        </button>

        <div className={styles.statusSlot}>
          {result && (
            <section
              className={styles.statusNotice}
              data-variant={result.variant}
              role={result.role}
            >
              <span aria-hidden="true" className={styles.statusIcon}>
                <WorkspaceIcon
                  name={
                    result.variant === "error"
                      ? "triangle-alert"
                      : "circle-alert"
                  }
                />
              </span>
              <span className={styles.statusCopy}>
                <h2 ref={resultTitleRef} tabIndex={-1}>
                  {result.title}
                </h2>
                <span>{result.detail}</span>
              </span>
            </section>
          )}
        </div>

        <div className={styles.policyNotice}>
          <p>계속하면 Lorekeeper의 정책에 동의하게 됩니다.</p>
          <nav aria-label="인증 정책" className={styles.policyLinks}>
            <PolicyLink href={termsUrl}>이용약관</PolicyLink>
            <PolicyLink href={privacyUrl}>개인정보처리방침</PolicyLink>
          </nav>
        </div>
      </section>
    </main>
  );
}
