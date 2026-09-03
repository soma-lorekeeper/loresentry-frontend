import { Suspense } from "react";

import { ProjectListRoute } from "@/features/projects/components/project-list-route";

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <main
          aria-busy="true"
          className="flex min-h-screen items-center justify-center"
        >
          프로젝트를 불러오는 중입니다.
        </main>
      }
    >
      <ProjectListRoute />
    </Suspense>
  );
}
