import type { Metadata } from "next";

import { LandingPage } from "@/features/landing/landing-page";
import { LOCALE, t } from "@/i18n";

import { SITE, publicPage } from "./site-metadata";

// 검색 결과의 설명과 아래 구조화 데이터가 같은 문구를 쓴다.
const DESCRIPTION = t(
  "웹소설 작가를 위한 집필 에디터이자 AI 에이전트예요. 회차를 쓰면 AI가 설정 충돌을 짚고 설정 문서에 바뀔 점을 찾아 둬요. 고치고 반영하는 건 작가가 골라요.",
);

export const metadata: Metadata = {
  title: t("Lore Sentry · 웹소설 작가를 위한 집필 에디터와 AI 에이전트"),
  description: DESCRIPTION,
  // 검색에 내보내는 페이지다. 색인을 열고, 언어마다 따로 열리는 주소를 검색엔진에 알린다.
  ...publicPage("/"),
};

/**
 * 검색 로봇에게 이 페이지가 무엇을 소개하는지 알리는 구조화 데이터(schema.org 의
 * SoftwareApplication). 화면에는 그려지지 않는다.
 *
 * <p>Naver 가이드가 요구하는 것은 `name` 과 `applicationCategory` 다. 평점·리뷰·가격은 넣지 않는다.
 * 없는 정보를 지어내면 안 되고, 그래서 Google 의 "소프트웨어 앱" 리치 결과(가격과 평점이 필수)의
 * 대상은 아니다. 검색 결과의 모양을 바꾸려는 것이 아니라 페이지를 이해시키는 보조 정보다.
 *
 * <p>`url` 은 이 언어판의 대표 주소(canonical)와 같아야 한다. 어긋나면
 * scripts/validate-static-export.mjs 가 빌드에서 막는다.
 */
const JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Lore Sentry",
  applicationCategory: t("글쓰기 도구"),
  url: `${SITE}/${LOCALE}/`,
  description: DESCRIPTION,
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        // `<` 를 바꿔 두면 문구에 `</script>` 가 섞여도 이 script 가 중간에 끝나지 않는다.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(JSON_LD).replace(/</g, "\\u003c"),
        }}
      />
      <LandingPage />
    </>
  );
}
