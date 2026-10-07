import { AccountDeleted } from "@/features/account/account-deleted";
import { t } from "@/i18n";

export const metadata = { title: t("계정 삭제 완료 · Lore Sentry") };

export default function Page() {
  return <AccountDeleted />;
}
