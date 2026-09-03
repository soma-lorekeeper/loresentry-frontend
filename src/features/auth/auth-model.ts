export type LoginState =
  "canceled" | "default" | "failed" | "processing" | "session-expired";

export type GoogleAuthOutcome =
  | { status: "canceled" }
  | { status: "failed" }
  | {
      status: "success";
      verifiedReturnPath?: string | null;
    };

export function isInternalWorkspacePath(value: string | null | undefined) {
  if (!value) return false;
  try {
    const base = new URL("https://lorekeeper.internal");
    const target = new URL(value, base);
    return (
      target.origin === base.origin &&
      ["/workspace", "/workspace/"].includes(target.pathname) &&
      Boolean(target.searchParams.get("projectId"))
    );
  } catch {
    return false;
  }
}

export function resolveAuthDestination(
  outcome: Extract<GoogleAuthOutcome, { status: "success" }>,
  resumeExpiredWorkspace: boolean,
) {
  if (
    resumeExpiredWorkspace &&
    isInternalWorkspacePath(outcome.verifiedReturnPath)
  ) {
    return outcome.verifiedReturnPath as string;
  }
  return "/projects";
}
