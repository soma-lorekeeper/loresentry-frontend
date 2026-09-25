import { Suspense } from "react";
import { LogoutComplete } from "@/features/account/logout-complete";

export const metadata = { title: "로그아웃 · Lorekeeper" };

export default function Page() {
  return (
    <Suspense>
      <LogoutComplete />
    </Suspense>
  );
}
