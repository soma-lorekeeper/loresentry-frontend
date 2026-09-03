import { Suspense } from "react";

import { ProjectTrashRoute } from "@/features/projects/components/project-trash-route";

export default function ProjectTrashPage() {
  return (
    <Suspense
      fallback={
        <main
          aria-busy="true"
          className="flex min-h-screen items-center justify-center"
        >
          휴지통을 불러오는 중입니다.
        </main>
      }
    >
      <ProjectTrashRoute />
    </Suspense>
  );
}
