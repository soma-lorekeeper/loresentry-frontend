import { PolicyPage } from "@/features/policies/policy-page";
import { t } from "@/i18n";

export const metadata = { title: t("서비스 이용약관 · Lore Sentry") };

export default function Page() {
  return <PolicyPage kind="terms" />;
}
