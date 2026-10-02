import { ServiceError } from "../errors";
import {
  FEEDBACK_MAX,
  type FeedbackInput,
  type FeedbackService,
} from "../ports";

import { simulate } from "./control";

/** 서버처럼 쌓아 두기만 한다. 화면과 테스트가 무엇이 보내졌는지 확인할 때 쓴다. */
export const sentFeedback: FeedbackInput[] = [];

export const mockFeedback: FeedbackService = {
  send: (input) =>
    simulate("feedback.send", () => {
      const message = input.message.trim();
      if (!message || message.length > FEEDBACK_MAX) {
        throw new ServiceError(
          "validation",
          "내용을 1~2,000자로 적어 주세요.",
          "feedback.send",
        );
      }
      sentFeedback.push({ ...input, message });
    }),
};
