import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import type { ChatService, ChatTurn } from "@/services/ports";
import { DEFAULT_RUNTIME_CONFIG } from "@/config/runtime-config";
import { ServiceError } from "@/services/errors";
import {
  configureUsageAnalytics,
  tagUsageError,
} from "@/features/analytics/usage-analytics";
import { useChatStreams } from "./use-chat-streams";

const mock = vi.hoisted(() => ({
  send: vi.fn(),
  save: vi.fn(),
  invalidate: vi.fn(),
}));
vi.mock("@/features/analytics/google-analytics", () => ({
  analyticsEnabled: () => true,
  installGoogleAnalytics: () => window.gtag,
}));
vi.mock("@/services/services-context", () => ({
  useServices: () => ({ chat: { send: mock.send } }),
}));
vi.mock("@/features/documents/open-sessions", () => ({
  saveOpenDocuments: mock.save,
}));
vi.mock("./queries", () => ({ invalidateChat: mock.invalidate }));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ setQueryData: vi.fn(), invalidateQueries: vi.fn() }),
}));
const input = {
  content: "private question",
  intent: "ask" as const,
  quote: null,
  replaces: null,
};
const events = () =>
  vi.mocked(window.gtag!).mock.calls.filter((call) => call[0] === "event");
beforeEach(() => {
  window.gtag = vi.fn();
  configureUsageAnalytics(DEFAULT_RUNTIME_CONFIG);
  mock.send.mockReset();
  mock.save.mockReset().mockResolvedValue(true);
  mock.invalidate.mockReset().mockResolvedValue(undefined);
});
afterEach(() => {
  configureUsageAnalytics(null);
  delete window.gtag;
});

it("records final acknowledgment before cache reload and preserves false pre-save behavior", async () => {
  mock.save.mockResolvedValue(false);
  mock.invalidate.mockReturnValue(new Promise(() => {}));
  mock.send.mockImplementation(
    async (
      _id: string,
      _input: unknown,
      handlers: Parameters<ChatService["send"]>[2],
    ) => {
      handlers.onDelta("private answer");
      const question = {
        id: "q",
        sessionId: "s",
        role: "user" as const,
        content: "private question",
        intent: "ask" as const,
        quote: null,
        citations: [],
        createdAt: "2026-11-03T00:00:00Z",
      };
      return {
        question,
        answer: {
          ...question,
          id: "a",
          role: "assistant",
          content: "private answer",
        },
        usage: null,
      } satisfies ChatTurn;
    },
  );
  const hook = renderHook(() => useChatStreams("private project"));
  act(() => hook.result.current.send("private session", input));
  await waitFor(() =>
    expect(
      events().filter((call) => call[1] === "chat_turn_result"),
    ).toHaveLength(1),
  );
  expect(mock.send).toHaveBeenCalledTimes(1);
  expect(
    events().find((call) => call[1] === "chat_turn_result")?.[2],
  ).toMatchObject({ outcome: "completed", citation_count: 0 });
  expect(JSON.stringify(events())).not.toContain("private");
});

it.each([
  [new ServiceError("network", "lost stream"), "interrupted"],
  [
    tagUsageError(new ServiceError("unavailable", "server failed"), {
      chat_outcome: "failed",
      stage: "stream",
    }),
    "failed",
  ],
])(
  "distinguishes untrusted stream loss from a trusted server failure",
  async (error, outcome) => {
    mock.send.mockRejectedValue(error);
    const hook = renderHook(() => useChatStreams("p"));
    act(() => hook.result.current.send("s", input));
    await waitFor(() =>
      expect(
        events().find((call) => call[1] === "chat_turn_result")?.[2],
      ).toMatchObject({ outcome }),
    );
  },
);

it("records explicit Stop separately from teardown abort", async () => {
  mock.send.mockImplementation(
    (_id: string, _input: unknown, _handlers: unknown, signal: AbortSignal) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () =>
          reject(new DOMException("aborted", "AbortError")),
        ),
      ),
  );
  const hook = renderHook(() => useChatStreams("p"));
  act(() => hook.result.current.send("s", input));
  await waitFor(() => expect(mock.send).toHaveBeenCalledTimes(1));
  act(() => hook.result.current.stop("s"));
  await waitFor(() =>
    expect(
      events().find((call) => call[1] === "chat_turn_result")?.[2],
    ).toMatchObject({ outcome: "stopped" }),
  );
  act(() => hook.result.current.send("other", input));
  await waitFor(() => expect(mock.send).toHaveBeenCalledTimes(2));
  hook.unmount();
  await waitFor(() =>
    expect(
      events().filter((call) => call[1] === "chat_turn_result"),
    ).toHaveLength(2),
  );
  expect(
    events().filter((call) => call[1] === "chat_turn_result")[1][2],
  ).toMatchObject({ outcome: "interrupted" });
  expect(
    events().filter((call) => call[1] === "chat_stop_requested"),
  ).toHaveLength(1);
});
