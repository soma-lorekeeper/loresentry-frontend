import type { User } from "@/domain/models";
import { safeReturnTo } from "@/features/auth/return-to";
import { ServiceError } from "../errors";
import type { AccountService, AuthService, LogoutResult } from "../ports";
import type { ApiClient } from "./http";

export const LOGIN_RETURN_KEY = "loresentry.loginReturnTo";

interface Profile {
  id: string;
  display_name: string;
  email: string | null;
}
function user(profile: Profile): User {
  if (
    !profile ||
    typeof profile.id !== "string" ||
    typeof profile.display_name !== "string" ||
    (profile.email !== null && typeof profile.email !== "string")
  ) {
    throw new ServiceError("unknown", "계정 응답을 확인할 수 없어요.");
  }
  return {
    id: profile.id,
    displayName: profile.display_name,
    email: profile.email ?? "",
  };
}

export function createApiAccount(client: ApiClient): AccountService {
  return {
    getAccount: async () =>
      user(await client.request<Profile>("/auth/users/me")),
    updateDisplayName: async (displayName) =>
      user(
        await client.request<Profile>("/auth/users/me", {
          method: "PATCH",
          body: { display_name: displayName },
        }),
      ),
  };
}

export function createApiAuth(client: ApiClient, baseUrl: string): AuthService {
  return {
    async getSession() {
      try {
        return await createApiAccount(client).getAccount();
      } catch (error) {
        if (error instanceof ServiceError && error.code === "session-required")
          return null;
        throw error;
      }
    },
    async startGoogleLogin(returnTo) {
      try {
        window.sessionStorage.setItem(
          LOGIN_RETURN_KEY,
          safeReturnTo(returnTo) ?? "/projects",
        );
      } catch {
        /* The fixed projects destination remains available. */
      }
      // External BFF navigation starts OAuth; this is not a Next.js route.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`${baseUrl}/auth/oauth/google/prepare`);
    },
    async logout() {
      const response = await client.requestAllowing<{
        session_revocation?: LogoutResult;
      }>("/auth/sessions/revoke", [400, 503], {
        method: "POST",
        operation: "auth.logout",
      });
      const body = response.ok
        ? response.data
        : (response.failure.body as {
            session_revocation?: LogoutResult;
          } | null);
      const result = body?.session_revocation;
      if (response.ok && (result === "confirmed" || result === "not_requested"))
        return result;
      if (
        !response.ok &&
        ((response.failure.status === 400 && result === "rejected") ||
          (response.failure.status === 503 && result === "unconfirmed"))
      )
        return result;
      return "unconfirmed";
    },
  };
}
