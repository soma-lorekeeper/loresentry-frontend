/**
 * 화면 언어. 빌드마다 하나로 고정된다 — 한국어판과 영어판을 따로 export 하고, CloudFront 가 보는
 * 사람마다 둘 중 하나를 고른다(docs/deploy/cloudfront-rewrite.js). 그래서 실행 중에 언어가 바뀌는
 * 일은 없고, 바꿀 때는 쿠키를 고친 뒤 페이지를 다시 불러온다(preference.ts).
 */
export type Locale = "ko" | "en";

export const LOCALES: readonly Locale[] = ["ko", "en"];

export const LOCALE: Locale =
  process.env.NEXT_PUBLIC_LOCALE === "en" ? "en" : "ko";

/** 언어 이름은 그 언어로 쓴다. 고르는 사람이 읽을 수 있어야 한다. */
export const LOCALE_NAMES: Record<Locale, string> = {
  ko: "한국어",
  en: "English",
};

/** `Intl` 에 넘길 지역 태그. */
export const INTL_LOCALE: Record<Locale, string> = {
  ko: "ko-KR",
  en: "en-US",
};

export function isLocale(value: unknown): value is Locale {
  return value === "ko" || value === "en";
}
