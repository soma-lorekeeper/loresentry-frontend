"use client";

import { Suspense } from "react";

import { SessionGate } from "@/features/auth/session-gate";
import { ProjectGuidePage } from "@/features/help/project-guide";

export default function Page() {
  return (
    <Suspense>
      <SessionGate>{(user) => <ProjectGuidePage user={user} />}</SessionGate>
    </Suspense>
  );
}
