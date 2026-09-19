"use client";

import { Suspense } from "react";

import { SessionGate } from "@/features/auth/session-gate";
import { ProjectTrashPage } from "@/features/projects/project-trash";

export default function Page() {
  return (
    <Suspense>
      <SessionGate>{(user) => <ProjectTrashPage user={user} />}</SessionGate>
    </Suspense>
  );
}
