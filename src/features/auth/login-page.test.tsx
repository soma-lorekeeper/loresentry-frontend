import { screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithServices, routerMock, setSearchParams } from "@/test/render";
import { mockAuth } from "@/services/mock/account";
import { ServiceError } from "@/services/errors";
import { initialStatus, LoginPage } from "./login-page";

afterEach(() => {
  vi.restoreAllMocks();
  setSearchParams("");
});
it.each([
  ["cancelled", "canceled"],
  ["invalid", "expired"],
  ["unavailable", "unavailable"],
  ["failed", "failed"],
])("maps callback %s", (result, expected) => {
  expect(initialStatus(result)).toBe(expected);
});
it("confirms identity before returning from a success hint", async () => {
  setSearchParams("result=success&returnTo=%2Fworkspace%3Fproject%3Dp1");
  let resolve!: (value: {
    id: string;
    displayName: string;
    email: string;
  }) => void;
  const session = vi.spyOn(mockAuth, "getSession").mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  renderWithServices(<LoginPage />);
  expect(session).toHaveBeenCalledOnce();
  expect(routerMock.replace).not.toHaveBeenCalled();
  resolve({ id: "user", displayName: "작가", email: "" });
  await waitFor(() =>
    expect(routerMock.replace).toHaveBeenCalledWith("/workspace?project=p1"),
  );
});
it("does not treat a success hint with no session as logged in", async () => {
  setSearchParams("result=success");
  vi.spyOn(mockAuth, "getSession").mockResolvedValue(null);
  renderWithServices(<LoginPage />);
  expect(await screen.findByText("다시 로그인해 주세요")).toBeInTheDocument();
  expect(routerMock.replace).not.toHaveBeenCalled();
});
it("shows a temporary failure without claiming the session ended", async () => {
  setSearchParams("result=success");
  vi.spyOn(mockAuth, "getSession").mockRejectedValue(
    new ServiceError("session-unavailable", "temporary"),
  );
  renderWithServices(<LoginPage />);
  expect(
    await screen.findByRole("heading", {
      name: "로그인 상태를 확인할 수 없어요",
    }),
  ).toBeInTheDocument();
  expect(routerMock.replace).not.toHaveBeenCalled();
});
