import { act, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createMockServices } from "@/services/mock";
import { ServicesProvider } from "@/services/services-context";
import { mockAuth } from "@/services/mock/account";
import { ServiceError } from "@/services/errors";
import { routerMock } from "@/test/render";
import { SessionGate } from "./session-gate";
vi.mock("@/app/providers", () => ({
  useRuntimeConfig: () => ({ dataSource: "api" }),
}));
const owner = { id: "owner", displayName: "작가", email: "" };
function state(generation: string, phase: string) {
  window.localStorage.setItem(
    "loresentry.authTransition",
    JSON.stringify({ generation, phase }),
  );
  window.dispatchEvent(new Event("loresentry-auth-state"));
}
function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ServicesProvider services={createMockServices()}>
        <SessionGate>
          {() => <textarea aria-label="원고" defaultValue="미저장 문장" />}
        </SessionGate>
      </ServicesProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  window.localStorage.clear();
  routerMock.replace.mockReset();
  vi.spyOn(mockAuth, "getSession").mockResolvedValue(owner);
});
afterEach(() => vi.restoreAllMocks());
it("keeps an open document mounted during expiration and same-account recovery", async () => {
  show();
  const editor = await screen.findByLabelText("원고");
  act(() => state("first", "required"));
  expect(await screen.findByRole("dialog")).toBeInTheDocument();
  expect(screen.getByLabelText("원고")).toBe(editor);
  expect(routerMock.replace).not.toHaveBeenCalled();
  act(() => state("second", "active"));
  await waitFor(() =>
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
  );
  expect(screen.getByLabelText("원고")).toBe(editor);
});
it("does not expose the old workspace to a different confirmed account", async () => {
  show();
  await screen.findByLabelText("원고");
  vi.mocked(mockAuth.getSession).mockResolvedValue({
    ...owner,
    id: "different",
  });
  act(() => state("next", "active"));
  expect(
    await screen.findByRole("heading", { name: "다른 계정으로 로그인했어요" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("원고").parentElement).toHaveAttribute("inert");
});
it("treats verification outage as temporary and keeps the existing draft", async () => {
  show();
  const editor = await screen.findByLabelText("원고");
  vi.mocked(mockAuth.getSession).mockRejectedValue(
    new ServiceError("session-unavailable", "temporary"),
  );
  act(() => state("next", "active"));
  expect(
    await screen.findByRole("heading", {
      name: "로그인 상태를 확인할 수 없어요",
    }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("원고")).toBe(editor);
  expect(routerMock.replace).not.toHaveBeenCalled();
});
