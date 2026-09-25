export type ServiceErrorCode =
  | "session-required"
  | "session-unavailable"
  | "network"
  | "not-found"
  | "validation"
  | "duplicate"
  | "locked"
  | "busy"
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
