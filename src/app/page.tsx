import type { Metadata } from "next";

import { LandingPage } from "@/features/landing/landing-page";

export const metadata: Metadata = {
  title: "Lore Sentry · 웹소설 집필 작업공간",
  description:
    "웹소설 회차와 인물·장소·세계관 문서를 한 작업공간에 두고 써요. 속성 표로 이어 둔 관계가 그래프와 타임라인으로 바로 보여요.",
};

export default function Page() {
  return <LandingPage />;
}
