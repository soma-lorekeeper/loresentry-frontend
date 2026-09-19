import { EmptyState } from "@/design-system/primitives";

export function PlannedView({ title }: { title: string }) {
  return (
    <EmptyState
      icon="info"
      title={title}
      description="이 화면을 준비하고 있어요."
    />
  );
}
