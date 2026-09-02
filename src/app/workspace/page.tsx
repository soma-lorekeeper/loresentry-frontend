import { Suspense } from "react";

import { WorkspaceRoute } from "@/features/workspace/components/workspace-route";

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <main
          aria-busy="true"
          className="flex min-h-screen items-center justify-center"
        >
          작업공간을 불러오는 중입니다.
        </main>
      }
    >
      <WorkspaceRoute />
    </Suspense>
  );
}
