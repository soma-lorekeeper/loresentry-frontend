import { PolicyPage } from "@/features/policies/policy-page";
import { t } from "@/i18n";

export const metadata = { title: t("개인정보 처리방침 · Lore Sentry") };

export default function Page() {
  return <PolicyPage kind="privacy" />;
}
