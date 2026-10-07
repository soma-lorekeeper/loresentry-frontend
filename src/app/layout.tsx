import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";

import { createThemeScript } from "@/design-system/theme/theme-script";

import { AppProviders } from "./providers";

import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lore Sentry",
  description: "원고와 설정을 하나의 흐름으로 연결하는 집필 작업공간",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={geistMono.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: createThemeScript() }} />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
