export type ServiceErrorCode =
  | "network"
  // BFF 가 신원을 확인하지 못했다. 재발급이나 재로그인이 필요하다.
  | "unauthenticated"
  | "not-found"
  | "validation"
  | "duplicate"
  | "locked"
  | "busy"
  // 서버에 그 기능이 아직 없다. 재시도해도 달라지지 않는다.
  | "unavailable"
  | "unknown";

export class ServiceError extends Error {
  constructor(
    readonly code: ServiceErrorCode,
    message: string,
    readonly operation?: string,
  ) {
    super(message);
    this.name = "ServiceError";
  }
}

export function isServiceError(error: unknown): error is ServiceError {
  return error instanceof ServiceError;
}
