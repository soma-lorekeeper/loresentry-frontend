import type { FeedbackService } from "../ports";

import type { ApiClient } from "./http";

/**
 * 피드백은 Content 에 쌓이고 운영자가 조회한다(`loresentry-content` README "Feedback").
 * 화면은 유형을 묻지 않는다. 서버 계약의 필수 값이라 늘 `OTHER` 로 보낸다.
 */
export function createApiFeedback(client: ApiClient): FeedbackService {
  return {
    send: async ({ message, page }) => {
      await client.request<unknown>("/feedback", {
        method: "POST",
        body: {
          category: "OTHER",
          message,
          page: page.slice(0, 200),
          client:
            typeof navigator === "undefined"
              ? null
              : navigator.userAgent.slice(0, 300),
        },
        operation: "feedback.send",
        expectedStatus: 201,
      });
    },
  };
}
