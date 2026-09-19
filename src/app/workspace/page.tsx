"use client";

import { Suspense } from "react";

import { SessionGate } from "@/features/auth/session-gate";
import { WorkspacePage } from "@/features/workspace/workspace-page";

export default function Page() {
  return (
    <Suspense>
      <SessionGate>{(user) => <WorkspacePage user={user} />}</SessionGate>
    </Suspense>
  );
}
