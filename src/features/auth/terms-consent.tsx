"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, DialogCard, StatusNotice } from "@/design-system/primitives";
import { INTL_LOCALE, LOCALE, t, tRich } from "@/i18n";
import { useServices } from "@/services/services-context";
import { ServiceError } from "@/services/errors";
import type { TermsView } from "@/services/ports";
import { queryKeys } from "@/services/query-keys";
import styles from "./terms-consent.module.css";

const EFFECTIVE_DATE = new Intl.DateTimeFormat(INTL_LOCALE[LOCALE], {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
});

export function TermsConsent({
  privacyUrl,
  onClose,
  onComplete,
}: {
  privacyUrl: string;
  onClose: () => void;
  onComplete: () => void;
}) {
  const { auth } = useServices();
  const queryClient = useQueryClient();
  const [terms, setTerms] = useState<TermsView | null>(null);
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [restart, setRestart] = useState(false);
  const alive = useRef(false);
  const sending = useRef(false);

  useEffect(() => {
    alive.current = true;
    let active = true;
    auth
      .getTerms()
      .then((value) => {
        if (active) setTerms(value);
      })
      .catch(() => {
        if (active) {
          setError(
            t("약관을 불러올 수 없어요. Google 로그인부터 다시 시작해 주세요."),
          );
          setRestart(true);
        }
      });
    return () => {
      active = false;
      alive.current = false;
    };
  }, [auth]);

  const submit = async () => {
    if (!terms || !checked || sending.current) return;
    sending.current = true;
    setSubmitting(true);
    setError("");
    try {
      await auth.acceptTerms(terms.termsVersionId);
      await queryClient.cancelQueries();
      queryClient.clear();
      const user = await auth.getSession();
      if (!user) throw new Error("No confirmed session");
      if (!alive.current) return;
      queryClient.setQueryData(queryKeys.session, user);
      onComplete();
    } catch (cause) {
      if (!alive.current) return;
      setChecked(false);
      if (
        cause instanceof ServiceError &&
        cause.code === "terms-version-mismatch"
      ) {
        setTerms(null);
        setError(
          t("약관이 변경됐어요. 새 원문을 확인하고 다시 동의해 주세요."),
        );
        try {
          const latest = await auth.getTerms();
          if (alive.current) setTerms(latest);
        } catch {
          if (alive.current) {
            setRestart(true);
            setError(t("약관을 확인할 수 없어요. 다시 로그인해 주세요."));
          }
        }
      } else if (
        cause instanceof ServiceError &&
        ["validation", "csrf-rejected"].includes(cause.code)
      ) {
        setError(cause.message);
      } else {
        setRestart(true);
        setTerms(null);
        setError(
          cause instanceof ServiceError && cause.code === "consent-invalid"
            ? t("동의 대기가 만료됐어요. Google 로그인부터 다시 시작해 주세요.")
            : t(
                "동의 결과를 확인할 수 없어요. Google 로그인부터 다시 시작해 주세요.",
              ),
        );
      }
    } finally {
      sending.current = false;
      if (alive.current) setSubmitting(false);
    }
  };

  if (!terms)
    return (
      <div className={styles.notice}>
        <StatusNotice tone={error ? "error" : "info"}>
          {error || t("서비스 이용약관을 불러오고 있어요.")}
        </StatusNotice>
        <Button onClick={onClose}>
          {restart ? t("로그인으로 돌아가기") : t("닫기")}
        </Button>
      </div>
    );

  return (
    <DialogCard
      open
      onClose={onClose}
      size="lg"
      title={t("서비스 이용약관 동의")}
      closeLabel={t("약관 닫기")}
      closeDisabled={submitting}
      dismissible={!submitting}
      actions={
        <>
          <Button onClick={onClose} disabled={submitting}>
            {t("나중에")}
          </Button>
          <Button
            variant="primary"
            onClick={submit}
            disabled={!checked}
            busy={submitting}
          >
            {t("동의하고 계속")}
          </Button>
        </>
      }
    >
      <div className={styles.meta}>
        <strong>{terms.title}</strong>
        <span>
          {t("버전 {version} · 시행일 {date}", {
            version: terms.version,
            date: EFFECTIVE_DATE.format(new Date(terms.effectiveAt)),
          })}
        </span>
      </div>
      <div
        className={styles.original}
        tabIndex={0}
        role="region"
        aria-label={t("서비스 이용약관 전문")}
      >
        {terms.content}
      </div>
      <label className={styles.agreement}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => setChecked(event.target.checked)}
          disabled={submitting}
        />
        {t("[필수] Lore Sentry 서비스 이용약관에 동의합니다.")}
      </label>
      <p className={styles.privacy}>
        {tRich(
          "개인정보 처리에 관한 안내는 <link>개인정보 처리방침</link>에서 확인할 수 있습니다.",
          {
            link: (chunks) => (
              <a href={privacyUrl} target="_blank" rel="noreferrer">
                {chunks}
              </a>
            ),
          },
        )}
      </p>
      {error && <StatusNotice tone="error">{error}</StatusNotice>}
    </DialogCard>
  );
}
