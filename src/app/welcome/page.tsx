"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { SessionGate } from "@/features/auth/session-gate";
import { OnboardingPage } from "@/features/onboarding/onboarding-page";

function Welcome() {
  const replay = useSearchParams().get("replay") === "1";
  return (
    <SessionGate onboarding>
      {(user) => <OnboardingPage user={user} replay={replay} />}
    </SessionGate>
  );
}

export default function Page() {
  return (
    <Suspense>
      <Welcome />
    </Suspense>
  );
}
