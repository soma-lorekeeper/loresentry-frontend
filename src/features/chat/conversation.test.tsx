import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ChatMessage } from "@/domain/models";
import type { ChatStream } from "./use-chat-streams";
import { Conversation } from "./conversation";

const message = (id: string, role: "user" | "assistant"): ChatMessage => ({
  id,
  sessionId: "qa",
  role,
  content: id,
  intent: null,
  quote: null,
  citations: [],
  createdAt: "2026-10-23T00:00:00Z",
});
const question = message("new-question", "user");
const stream: ChatStream = {
  sessionId: "qa",
  question,
  replaces: null,
  phase: "writing",
  content: "new answer",
  freshFrom: 0,
  tick: 1,
  citations: [],
  activities: [],
  startedAt: Date.now(),
};
const props = {
  session: {
    id: "qa",
    projectId: "p",
    title: "QA",
    preview: "",
    updatedAt: "2026-10-23T00:00:00Z",
  },
  loading: false,
  interruption: null,
  term: "",
  onOpenCitation: () => {},
  onRetry: () => {},
  onEditSend: () => {},
  empty: null,
};

describe("Conversation scroll on completion", () => {
  it.each([false, true])(
    "respects the user's bottom-following choice (%s)",
    (pinned) => {
      const messages = [
        message("older question", "user"),
        message("older answer", "assistant"),
      ];
      const r = render(
        <Conversation {...props} messages={messages} stream={stream} />,
      );
      const el = r.container.querySelector(
        '[class*="scrollWrap"] > div',
      ) as HTMLElement;
      Object.defineProperties(el, {
        scrollHeight: { configurable: true, value: 2000 },
        clientHeight: { configurable: true, value: 200 },
      });
      el.scrollTop = pinned ? 1800 : 100;
      fireEvent.scroll(el);
      r.rerender(
        <Conversation
          {...props}
          messages={[
            ...messages,
            question,
            message("completed answer", "assistant"),
          ]}
          stream={null}
        />,
      );
      expect(el.scrollTop).toBe(pinned ? 2000 : 100);
      if (!pinned)
        expect(
          screen.getByRole("button", { name: "맨 아래로" }),
        ).toBeInTheDocument();
    },
  );
});
