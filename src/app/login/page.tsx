import { Suspense } from "react";

import { LoginPage } from "@/features/auth/login-page";
import { t } from "@/i18n";

export const metadata = { title: t("로그인 · Lore Sentry") };

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
