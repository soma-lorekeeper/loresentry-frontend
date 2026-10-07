import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";

import { createThemeScript } from "@/design-system/theme/theme-script";
import { LOCALE, t } from "@/i18n";
import { createLocaleScript } from "@/i18n/preference";

import { AppProviders } from "./providers";

import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lore Sentry",
  description: t("원고와 설정을 하나의 흐름으로 연결하는 집필 작업공간"),
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang={LOCALE} className={geistMono.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: createLocaleScript() }} />
        <script dangerouslySetInnerHTML={{ __html: createThemeScript() }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
