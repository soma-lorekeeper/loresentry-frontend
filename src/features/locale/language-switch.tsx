"use client";

import { LOCALE, LOCALE_NAMES, t, type Locale } from "@/i18n";
import { cx } from "@/shared/cx";

import styles from "./language-switch.module.css";
import { useLocaleSwitch } from "./use-locale-switch";

const OTHER: Record<Locale, Locale> = { ko: "en", en: "ko" };

/** 다른 언어 이름 하나만 보이는 작은 단추. 고르는 사람이 읽을 수 있게 그 언어로 쓴다. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { switchTo, pending } = useLocaleSwitch();
  const other = OTHER[LOCALE];
  return (
    <button
      type="button"
      className={cx(styles.switch, className)}
      lang={other}
      title={t("언어 바꾸기")}
      disabled={pending}
      onClick={() => void switchTo(other)}
    >
      {LOCALE_NAMES[other]}
    </button>
  );
}
