import { LogoutComplete } from "@/features/account/logout-complete";
import { t } from "@/i18n";

export const metadata = { title: t("로그아웃 · Lore Sentry") };

export default function Page() {
  return <LogoutComplete />;
}
