"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { EmptyState } from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { QueryFailure } from "@/features/common/query-failure";
import { useOnboardingAnalytics } from "@/features/analytics/onboarding-analytics";
import { t } from "@/i18n";
import { useServices } from "@/services/services-context";

import {
  createLayout,
  isWorkspaceLayout,
  layoutReducer,
  parseTabId,
} from "./model/layout";
import { useProject } from "./queries";

import { WorkspaceShell } from "./shell/workspace-shell";
import { WorkspaceProvider } from "./workspace-context";
import styles from "./shell/workspace-shell.module.css";

function useRestoredLayout(projectId: string) {
  const services = useServices();
  return useQuery({
    queryKey: ["workspace-layout", projectId],
    queryFn: async () => {
      const stored = await services.workspaceState.load(projectId);
      return isWorkspaceLayout(stored) ? stored : createLayout();
    },
    staleTime: Infinity,
    gcTime: 0,
  });
}

function Unavailable() {
  return (
    <main className={styles.shell}>
      <EmptyState
        icon="triangle-alert"
        title={t("작업공간을 열 수 없어요")}
        description={t(
          "프로젝트가 휴지통에 있거나 접근할 수 없어요. 프로젝트 목록에서 다시 선택해 주세요.",
        )}
        action={<Link href="/projects">{t("프로젝트 목록으로 이동")}</Link>}
      />
    </main>
  );
}

function WorkspaceLoader({
  projectId,
  user,
}: {
  projectId: string;
  user: User;
}) {
  const searchParams = useSearchParams();
  const project = useProject(projectId);
  const layout = useRestoredLayout(projectId);
  const track = useOnboardingAnalytics();
  const tracked = useRef(false);
  useEffect(() => {
    if (!tracked.current && !project.isError && project.data && layout.data) {
      tracked.current = true;
      track("workspace_entered");
    }
  }, [project.data, project.isError, layout.data, track]);

  if (project.isError) return <Unavailable />;
  if (layout.isError && !layout.data)
    return (
      <main className={styles.shell}>
        <QueryFailure
          title={t("작업공간 배치를 불러오지 못했어요")}
          retrying={layout.isFetching}
          onRetry={() => void layout.refetch()}
        />
      </main>
    );
  if (!project.data || !layout.data)
    return <main className={styles.shell} aria-busy="true" />;

  const deepLink = parseTabId(searchParams.get("open") ?? "");
  const initialLayout = deepLink
    ? layoutReducer(layout.data, { type: "open", target: deepLink })
    : layout.data;

  return (
    <WorkspaceProvider
      project={project.data}
      user={user}
      initialLayout={initialLayout}
    >
      <WorkspaceShell />
    </WorkspaceProvider>
  );
}

export function WorkspacePage({ user }: { user: User }) {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId")?.trim();
  if (!projectId) return <Unavailable />;
  return <WorkspaceLoader key={projectId} projectId={projectId} user={user} />;
}
