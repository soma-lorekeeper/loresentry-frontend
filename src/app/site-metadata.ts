import type { Metadata } from "next";

import { INTL_LOCALE, LOCALE, LOCALES } from "@/i18n";

/**
 * 검색엔진과 공유 미리보기에 알리는 값 가운데 여러 페이지가 함께 쓰는 것.
 *
 * <p><b>색인은 기본으로 닫혀 있다.</b> root layout 이 `robots: { index: false }` 를 주고
 * (layout.tsx), 검색에 내보낼 페이지만 {@link publicPage} 로 연다. 이 앱은 로그인해야 쓰는 화면이
 * 대부분이라, 새 페이지를 만들 때 아무것도 하지 않으면 색인에서 빠지는 쪽이 안전하다.
 *
 * <p><b>왜 값을 여기 모아 두는가.</b> Next 는 segment 의 metadata 를 얕게 합친다. page 가
 * `openGraph` 를 정의하면 layout 의 `openGraph` 는 통째로 사라진다. 그래서 함께 쓰는 값은
 * {@link OPEN_GRAPH} 로 빼 두고, `openGraph` 를 정의하는 곳마다 펼쳐 넣는다.
 */

/** 사이트의 대표 주소. `www` 는 CloudFront 함수가 이 주소로 301 보낸다(docs/deploy/cloudfront-rewrite.js). */
export const SITE = "https://loresentry.com";

/**
 * 모든 페이지가 함께 쓰는 Open Graph 값.
 *
 * <p>`title`·`description` 은 일부러 넣지 않는다. 비워 두면 Next 가 그 페이지의 `title`·
 * `description` 으로 `og:title`·`og:description` 을 채운다. 여기에 넣으면 모든 페이지가 같은
 * 제목을 갖게 된다.
 *
 * <p>이미지는 언어판마다 따로 있다(public/og-image.png 가 한국어, public-en/og-image.png 가 영어 —
 * scripts/build-locales.mjs 가 영어판에만 덮어쓴다). 주소에 언어를 붙여야 한다. 언어 없는 주소는
 * CloudFront 가 보는 쪽의 나라로 언어판을 골라, 영어 페이지의 미리보기에 한국어 이미지가 나갈 수 있다.
 * 이미지를 바꿀 때는 파일 이름도 바꾼다 — 메신저와 SNS 가 주소로 이미지를 기억해 둔다.
 */
export const OPEN_GRAPH = {
  type: "website",
  siteName: "Lore Sentry",
  // Open Graph 의 언어 표기는 밑줄을 쓴다(ko_KR, en_US).
  locale: INTL_LOCALE[LOCALE].replace("-", "_"),
  images: [
    {
      url: `${SITE}/${LOCALE}/og-image.png`,
      // 실제 파일의 크기. 화면 2배 밀도로 찍은 1200×630 이다.
      width: 2400,
      height: 1260,
      alt: "Lore Sentry",
    },
  ],
} satisfies Metadata["openGraph"];

/**
 * 검색에 내보낼 페이지의 metadata 조각. 그 페이지의 `metadata` 에 펼쳐 넣는다.
 *
 * <pre>
 * export const metadata = { title: ..., description: ..., ...publicPage("/policies/terms/") };
 * </pre>
 *
 * <p>여기서 연 페이지는 public/sitemap.xml 에도 언어 주소로 적어야 한다. 둘이 어긋나면
 * scripts/validate-static-export.mjs 가 빌드에서 막는다.
 *
 * @param path 언어를 뺀 경로. `/` 로 시작하고 `/` 로 끝난다(`trailingSlash: true`). 예: `/`, `/policies/terms/`
 */
export function publicPage(
  path: string,
): Pick<Metadata, "robots" | "alternates" | "openGraph"> {
  // 이 언어판에서 이 페이지가 열리는 주소. public/sitemap.xml 에 적는 주소와 글자까지 같다.
  const canonical = `${SITE}/${LOCALE}${path}`;
  return {
    // root layout 의 noindex 를 덮어써 색인을 연다.
    robots: { index: true, follow: true },
    alternates: {
      canonical,
      // 언어마다 따로 열리는 주소를 검색엔진에 알린다. 언어 없는 주소는 보는 사람에 맞춰
      // 언어판을 고르므로(docs/deploy/cloudfront-rewrite.js) 언어를 못 정한 경우의 주소로 준다.
      languages: {
        ...Object.fromEntries(
          LOCALES.map((locale) => [locale, `${SITE}/${locale}${path}`]),
        ),
        "x-default": `${SITE}${path}`,
      },
    },
    // url 만 주면 이미지와 사이트 이름이 사라진다. 함께 쓰는 값을 펼쳐 넣고 주소를 더한다.
    openGraph: { ...OPEN_GRAPH, url: canonical },
  };
}
