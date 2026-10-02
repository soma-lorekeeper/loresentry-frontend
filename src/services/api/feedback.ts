import type { FeedbackService } from "../ports";

import type { ApiClient } from "./http";

const CATEGORY = { bug: "BUG", idea: "IDEA", other: "OTHER" } as const;

/** 피드백은 Content 에 쌓이고 운영자가 조회한다(`loresentry-content` README "Feedback"). */
export function createApiFeedback(client: ApiClient): FeedbackService {
  return {
    send: async ({ category, message, page }) => {
      await client.request<unknown>("/feedback", {
        method: "POST",
        body: {
          category: CATEGORY[category],
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
