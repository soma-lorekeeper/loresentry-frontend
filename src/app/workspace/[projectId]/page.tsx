import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

interface WorkspacePageProps {
  params: Promise<{ projectId: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { projectId } = await params;

  return <WorkspaceShell initialProjectId={projectId} />;
}
