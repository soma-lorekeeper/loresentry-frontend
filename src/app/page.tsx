import type { Metadata } from "next";

import { LandingPage } from "@/features/landing/landing-page";
import { t } from "@/i18n";

import { publicPage } from "./site-metadata";

export const metadata: Metadata = {
  title: t("Lore Sentry · 작가를 위한 집필 에디터와 AI 에이전트"),
  description: t(
    "웹소설 작가를 위한 집필 에디터이자 AI 에이전트예요. 회차를 쓰면 설정 문서에 바뀔 점을 AI가 찾아 두고, 반영은 작가가 골라요.",
  ),
  // 검색에 내보내는 페이지다. 색인을 열고, 언어마다 따로 열리는 주소를 검색엔진에 알린다.
  ...publicPage("/"),
};

export default function Page() {
  return <LandingPage />;
}
