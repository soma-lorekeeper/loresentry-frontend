import type { Metadata } from "next";

import { LandingPage } from "@/features/landing/landing-page";

export const metadata: Metadata = {
  title: "Lore Sentry · 작가를 위한 집필 에디터와 AI 에이전트",
  description:
    "웹소설 작가를 위한 집필 에디터이자 AI 에이전트예요. 회차를 쓰면 설정 문서에 바뀔 점을 AI가 찾아 두고, 반영은 작가가 골라요.",
};

export default function Page() {
  return <LandingPage />;
}
