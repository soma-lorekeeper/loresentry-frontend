import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";

import { createThemeScript } from "@/design-system/theme/theme-script";
import { createWebFontScript } from "@/design-system/theme/web-fonts";
import { createLandingScript } from "@/features/analytics/acquisition";
import { createSessionHintScript } from "@/features/auth/session-hint";
import { LOCALE, t } from "@/i18n";
import { createLocaleScript } from "@/i18n/preference";

import { AppProviders } from "./providers";
import { OPEN_GRAPH, SITE } from "./site-metadata";

import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lore Sentry",
  description: t("원고와 설정을 하나의 흐름으로 연결하는 집필 작업공간"),
  // 색인은 기본으로 닫는다. 로그인해야 쓰는 화면이 대부분이고, "use client" 페이지는 metadata 를
  // 따로 줄 수 없어 이 값을 그대로 물려받는다. 검색에 내보낼 페이지만 publicPage() 로 연다
  // (site-metadata.ts).
  robots: { index: false },
  // page 가 openGraph 를 정의하지 않으면 이 값이 그대로 쓰인다. 정의하는 page 는 OPEN_GRAPH 를
  // 펼쳐 넣어야 한다 — metadata 는 얕게 합쳐져 page 의 openGraph 가 이것을 통째로 대체한다.
  openGraph: OPEN_GRAPH,
  twitter: { card: "summary_large_image" },
  // 파비콘 주소는 절대 주소여야 검색엔진이 받아 간다. app/icon.svg 파일 규약은 Next 가 주소를
  // 상대 경로로 정해 버려, 파일을 public/ 에 두고 주소를 직접 적는다. 같은 rel 의 link 는 하나만 둔다.
  icons: {
    icon: { url: `${SITE}/icon.svg`, type: "image/svg+xml", sizes: "any" },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={LOCALE} className={geistMono.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: createLocaleScript() }} />
        <script dangerouslySetInnerHTML={{ __html: createThemeScript() }} />
        <script dangerouslySetInnerHTML={{ __html: createWebFontScript() }} />
        <script
          dangerouslySetInnerHTML={{ __html: createSessionHintScript() }}
        />
        <script dangerouslySetInnerHTML={{ __html: createLandingScript() }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
