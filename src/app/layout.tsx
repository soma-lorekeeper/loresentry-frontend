import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { RuntimeConfigProvider } from "@/config/runtime-config-provider";
import { ThemeProvider } from "@/design-system/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lorekeeper",
  description: "이야기 프로젝트와 작업공간을 관리하는 Lorekeeper",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <RuntimeConfigProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </RuntimeConfigProvider>
      </body>
    </html>
  );
}
