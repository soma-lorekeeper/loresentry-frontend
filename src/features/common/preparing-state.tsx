import { EmptyState } from "@/design-system/primitives";
import { isServiceError } from "@/services/errors";

/** 서버에 그 기능이 아직 없어서 거절된 요청인가. 재시도해도 달라지지 않는다. */
export function isUnavailable(error: unknown): boolean {
  return isServiceError(error) && error.code === "unavailable";
}

/**
 * 아직 서버가 없는 기능의 자리.
 *
 * <p>"불러오지 못했어요 · 다시 시도" 로 말하면 거짓이다. 연결 문제가 아니고, 다시 시도해도 같다.
 * 그리고 mock 자료로 채우는 것은 더 나쁘다 — 보는 사람이 그것을 자기 자료로 믿는다.
 */
export function PreparingState({
  what,
  className,
}: {
  what: string;
  className?: string;
}) {
  return (
    <EmptyState
      role="status"
      icon="clock-3"
      title={`${what}은 아직 준비 중이에요`}
      description="서버가 연결되면 여기에서 바로 쓸 수 있어요. 지금은 보여 드릴 것이 없어요."
      className={className}
    />
  );
}
