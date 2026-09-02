import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";
import { projects } from "@/features/workspace/workspace-data";

interface WorkspacePageProps {
  params: Promise<{ projectId: string }>;
}

export default async function WorkspacePage({ params }: WorkspacePageProps) {
  const { projectId } = await params;

  return <WorkspaceShell initialProjectId={projectId} />;
}

export function generateStaticParams() {
  return projects.map(({ id }) => ({ projectId: id }));
}
