"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { EmptyState } from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { useServices } from "@/services/services-context";

import {
  createLayout,
  isWorkspaceLayout,
  layoutReducer,
  parseTabId,
} from "./model/layout";
import { useProject } from "./queries";
import { ChatPanel } from "@/features/chat/chat-panel";

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
        title="작업공간을 열 수 없어요"
        description="프로젝트가 휴지통에 있거나 접근할 수 없어요. 프로젝트 목록에서 다시 선택해 주세요."
        action={<Link href="/projects">프로젝트 목록으로 이동</Link>}
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

  if (project.isError) return <Unavailable />;
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
      <WorkspaceShell chat={<ChatPanel />} />
    </WorkspaceProvider>
  );
}

export function WorkspacePage({ user }: { user: User }) {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId")?.trim();
  if (!projectId) return <Unavailable />;
  return <WorkspaceLoader key={projectId} projectId={projectId} user={user} />;
}
