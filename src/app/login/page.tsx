import { Suspense } from "react";

import { LoginPage } from "@/features/auth/login-page";

export const metadata = { title: "로그인 · Lorekeeper" };

export default function Page() {
  return (
    <Suspense>
      <LoginPage />
    </Suspense>
  );
}
