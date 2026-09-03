import { Suspense } from "react";

import { ProjectGuideRoute } from "@/features/help/components/project-guide-route";

export default function ProjectGuidePage() {
  return (
    <Suspense
      fallback={
        <main
          aria-busy="true"
          className="flex min-h-screen items-center justify-center"
        >
          사용 가이드를 불러오는 중입니다.
        </main>
      }
    >
      <ProjectGuideRoute />
    </Suspense>
  );
}
