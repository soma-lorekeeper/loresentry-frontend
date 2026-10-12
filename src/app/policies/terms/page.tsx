import { PolicyPage } from "@/features/policies/policy-page";
import { t } from "@/i18n";

import { publicPage } from "../../site-metadata";

export const metadata = {
  title: t("서비스 이용약관 · Lore Sentry"),
  // 검색 결과에 보일 설명. 다른 페이지와 같은 문구면 검색엔진이 중복 문서로 볼 수 있어 따로 둔다.
  description: t(
    "Lore Sentry 서비스 이용약관이에요. 가입과 계정, 원고의 권리, 외부 AI 분석, 원고 삭제와 탈퇴에 관한 조건을 안내해요.",
  ),
  // 시행 중인 약관이라 검색에 내보낸다. 처리방침은 아직 초안이라 열지 않았다
  // (features/policies/documents.ts). 시행하면 같은 방식으로 열고 public/sitemap.xml 에 적는다.
  ...publicPage("/policies/terms/"),
};

export default function Page() {
  return <PolicyPage kind="terms" />;
}
