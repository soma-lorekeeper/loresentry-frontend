"use client";

import { useRuntimeConfig } from "@/app/providers";
import { LanguageSwitch } from "@/features/locale/language-switch";
import { t } from "@/i18n";

import styles from "./site-footer.module.css";

/**
 * 프로젝트 화면들의 바닥글. 정책 링크 둘만 둔다 — 문의와 피드백은 사이드바에 있고, 이 화면의
 * 주인은 작품 목록이다. 설정되지 않은 링크는 그리지 않는다.
 *
 * 편집 화면에는 두지 않는다. 작업공간은 세로를 전부 글에 쓴다.
 */
export function SiteFooter() {
  const { privacyPolicyUrl, termsOfServiceUrl } = useRuntimeConfig();

  return (
    <footer className={styles.footer}>
      {(termsOfServiceUrl || privacyPolicyUrl) && (
        <nav className={styles.links} aria-label={t("정책")}>
          {termsOfServiceUrl && (
            <a
              className={styles.link}
              href={termsOfServiceUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t("이용약관")}
            </a>
          )}
          {privacyPolicyUrl && (
            <a
              className={styles.link}
              href={privacyPolicyUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t("개인정보처리방침")}
            </a>
          )}
        </nav>
      )}
      <LanguageSwitch />
    </footer>
  );
}
