"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "@/features/auth/session-gate";

export default function ServiceEntryPage() {
  const router = useRouter();
  const session = useSession();

  useEffect(() => {
    if (!session.isSuccess) return;
    router.replace(session.data ? "/projects" : "/login");
  }, [session.isSuccess, session.data, router]);

  return <main aria-busy="true" />;
}
