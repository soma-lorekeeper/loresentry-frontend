import { Suspense } from "react";

import { LoginRoute } from "@/features/auth/components/login-route";

export default function LoginRoutePage() {
  return (
    <Suspense
      fallback={
        <main
          aria-busy="true"
          className="flex min-h-screen items-center justify-center"
        >
          로그인 화면을 불러오는 중입니다.
        </main>
      }
    >
      <LoginRoute />
    </Suspense>
  );
}
