import Link from "next/link";

import { APP_ROUTES } from "@/integration/app-routes";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--lk-color-bg-canvas)] p-8 text-center text-[var(--lk-color-text-primary)]">
      <p className="text-sm font-semibold tracking-[0.08em] text-[var(--lk-color-accent-primary)] uppercase">
        Lorekeeper
      </p>
      <h1 className="text-3xl font-semibold">이야기의 세계를 기록하세요</h1>
      <p className="max-w-lg text-[var(--lk-color-text-secondary)]">
        로그인해 프로젝트와 작업공간을 이어서 사용하세요.
      </p>
      <Link
        className="mt-3 min-h-11 rounded-[var(--lk-radius-control)] bg-[var(--lk-color-accent-primary)] px-6 py-3 font-semibold text-[var(--lk-color-bg-canvas)] outline-offset-4"
        href={APP_ROUTES.login}
      >
        로그인으로 이동
      </Link>
    </main>
  );
}
