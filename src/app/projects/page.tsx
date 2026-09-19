"use client";

import { Suspense } from "react";

import { SessionGate } from "@/features/auth/session-gate";
import { ProjectListPage } from "@/features/projects/project-list";

export default function Page() {
  return (
    <Suspense>
      <SessionGate>{(user) => <ProjectListPage user={user} />}</SessionGate>
    </Suspense>
  );
}
