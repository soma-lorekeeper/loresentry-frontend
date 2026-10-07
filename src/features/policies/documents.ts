import { INTL_LOCALE, LOCALE, t } from "@/i18n";

import { PRIVACY_EN } from "./content/privacy.en";
import { PRIVACY_KO } from "./content/privacy.ko";
import { TERMS_EN } from "./content/terms.en";
import { TERMS_KO } from "./content/terms.ko";

export type PolicyKind = "terms" | "privacy";

export interface PolicyDocument {
  kind: PolicyKind;
  title: string;
  source: string;
  headingId: (text: string, index: number) => string;
  /** 시행 중이면 시행일, 아직 초안이면 null */
  effective: string | null;
  version: string;
}

const numbered = (prefix: string) => (text: string, index: number) => {
  const match = /(\d+)/.exec(text);
  return `${prefix}-${match ? match[1] : index + 1}`;
};

function longDate(iso: string) {
  return new Intl.DateTimeFormat(INTL_LOCALE[LOCALE], {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(new Date(`${iso}T00:00:00+09:00`));
}

/**
 * 약관 v0 은 2026-09-30 에 운영 DB 에 게시됐다(loresentry-authentication `V4`). 동의 화면이 보여 주는
 * 원문과 같은 글이다. 처리방침은 아직 게시 전 초안이라 시행일이 없다.
 */
export const POLICY_DOCUMENTS: Record<PolicyKind, PolicyDocument> = {
  terms: {
    kind: "terms",
    title: t("서비스 이용약관"),
    source: LOCALE === "en" ? TERMS_EN : TERMS_KO,
    headingId: numbered("article"),
    effective: longDate("2026-09-30"),
    version: "v0",
  },
  privacy: {
    kind: "privacy",
    title: t("개인정보 처리방침"),
    source: LOCALE === "en" ? PRIVACY_EN : PRIVACY_KO,
    headingId: numbered("section"),
    effective: null,
    version: t("초안 0.3"),
  },
};
