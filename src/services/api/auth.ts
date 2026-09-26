import type { User } from "@/domain/models";

import { ServiceError } from "../errors";
import type { AccountService, AuthService } from "../ports";

import type { ApiClient } from "./http";

interface ApiProfile {
  id: string;
  display_name: string;
  email: string;
}

function toUser(api: ApiProfile): User {
  return { id: api.id, displayName: api.display_name, email: api.email };
}

/**
 * 토큰은 HttpOnly 쿠키로만 오간다. 프론트는 쿠키를 읽지 못하므로 "로그인했는가"를
 * **서버에 물어서** 판단한다.
 *
 * BFF 가 로그인 뒤 `/login?result=success` 로 돌려보내지만 그 쿼리는 안내일 뿐이다 —
 * 사용자가 URL 을 바꿀 수 있고, 그 직후 다른 로그인이 세션을 교체했을 수도 있다
 * (`loresentry-gateway/docs/FRONTEND_AUTH_CONTRACT.md`).
 */
export function createApiAuth(client: ApiClient): AuthService {
  return {
    getSession: async () => {
      try {
        return toUser(
          await client.request<ApiProfile>("/auth/users/me", {
            operation: "auth.session",
          }),
        );
      } catch (cause) {
        // 로그인하지 않은 상태는 오류가 아니다. 화면은 null 을 받아 로그인 화면을 보여 준다.
        if (cause instanceof ServiceError && cause.code === "unauthenticated") {
          return null;
        }
        throw cause;
      }
    },

    /**
     * 브라우저가 BFF 로 이동해 Google 로 리다이렉트된다. Next 라우터로는 갈 수 없는 외부 주소이고,
     * fetch 로 부르면 302 를 브라우저가 따라가지 않아 Google 에 닿지 못한다.
     *
     * <p><b>끝나지 않는 프로미스를 돌려준다.</b> `assign` 은 이동을 예약할 뿐 즉시 떠나지 않는다.
     * 여기서 값을 돌려주면 호출자가 다음 줄을 실행하는데, 그 다음 줄이 클라이언트 라우팅이면
     * **예약된 외부 이동을 취소해 버린다** — 화면은 "Google 로그인으로 이동 중" 에서 멈추고
     * 사용자는 Google 에 닿지 못한다. mock 은 즉시 돌아오므로 그 흐름은 그대로 둔다.
     */
    startGoogleLogin: (returnTo) => {
      void returnTo;
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(`${client.baseUrl}/auth/oauth/google/prepare`);
      return new Promise<void>(() => {});
    },

    logout: () =>
      client.request<void>("/auth/tokens/revoke", {
        method: "POST",
        operation: "auth.logout",
      }),
  };
}

export function createApiAccount(client: ApiClient): AccountService {
  return {
    getAccount: async () =>
      toUser(
        await client.request<ApiProfile>("/auth/users/me", {
          operation: "account.get",
        }),
      ),

    updateDisplayName: async (displayName) =>
      toUser(
        await client.request<ApiProfile>("/auth/users/me", {
          method: "PATCH",
          body: { display_name: displayName },
          operation: "account.update",
        }),
      ),
  };
}
