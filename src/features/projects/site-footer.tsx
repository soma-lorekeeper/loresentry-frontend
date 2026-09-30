"use client";

import { useRuntimeConfig } from "@/app/providers";

import { useFeedbackTarget } from "./project-shell";
import styles from "./site-footer.module.css";

/**
 * 프로젝트 화면들의 바닥글.
 *
 * <p>연락처·피드백·정책을 한 줄에 둔다. 링크를 열로 늘어놓은 흔한 사이트 바닥글은 이 제품에 맞지
 * 않는다 — 여기 담을 것이 넷뿐이고, 화면의 주인은 작품 목록이다. 그래서 얇은 경계선 한 줄,
 * 보조 글자 크기, 강조색 없이 둔다.
 *
 * <p><b>편집 화면에는 두지 않는다.</b> 작업공간은 세로를 전부 글에 쓰는 화면이고, 바닥글은 그
 * 공간을 가져간다. 문의가 필요한 사람은 목록·설정·가이드 화면에서 찾는다.
 *
 * <p>설정되지 않은 항목은 **그리지 않는다.** 죽은 링크를 두는 것보다 없는 편이 정직하다.
 */
export function SiteFooter() {
  const { contactEmail, privacyPolicyUrl, termsOfServiceUrl } =
    useRuntimeConfig();
  const feedback = useFeedbackTarget();

  return (
    <footer className={styles.footer}>
      <p className={styles.product}>
        Lore Sentry
        <span className={styles.tagline}>집필과 설정을 한 흐름으로</span>
      </p>
      <nav className={styles.links} aria-label="문의와 정책">
        {contactEmail && (
          <a className={styles.link} href={`mailto:${contactEmail}`}>
            문의 {contactEmail}
          </a>
        )}
        {feedback && (
          <a
            className={styles.link}
            href={feedback.href}
            {...(feedback.kind === "form"
              ? { target: "_blank", rel: "noreferrer" }
              : {})}
          >
            피드백 보내기
          </a>
        )}
        {termsOfServiceUrl && (
          <a
            className={styles.link}
            href={termsOfServiceUrl}
            target="_blank"
            rel="noreferrer"
          >
            이용약관
          </a>
        )}
        {privacyPolicyUrl && (
          <a
            className={styles.link}
            href={privacyPolicyUrl}
            target="_blank"
            rel="noreferrer"
          >
            개인정보처리방침
          </a>
        )}
      </nav>
    </footer>
  );
}
