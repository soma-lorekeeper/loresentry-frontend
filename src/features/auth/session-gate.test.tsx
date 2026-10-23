import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";

import { renderWithServices, routerMock } from "@/test/render";

import { SessionGate } from "./session-gate";

it("shows a session read failure and retries without treating it as signed out", async () => {
  const actor = userEvent.setup();
  const getSession = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValue({
      id: "qa-user",
      displayName: "QA",
      email: "qa@example.test",
      onboardingCompleted: true,
      locale: "ko",
    });
  renderWithServices(<SessionGate>{() => <p>보호된 내용</p>}</SessionGate>, {
    auth: { getSession },
  });
  const error = await screen.findByRole("alert");
  expect(error).toHaveTextContent("로그인 정보를 불러오지 못했어요");
  expect(routerMock.replace).not.toHaveBeenCalled();
  await actor.click(within(error).getByRole("button", { name: "다시 시도" }));
  expect(await screen.findByText("보호된 내용")).toBeInTheDocument();
  expect(getSession).toHaveBeenCalledTimes(2);
  await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
});
