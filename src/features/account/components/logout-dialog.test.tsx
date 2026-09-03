import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { defaultAccountProfile } from "../account-model";
import { LogoutDialog } from "./logout-dialog";

describe("LogoutDialog", () => {
  it("starts on cancel and returns control without ending the session", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const logout = vi.fn();
    render(
      <LogoutDialog
        logout={logout}
        onOpenChange={onOpenChange}
        open
        profile={defaultAccountProfile}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "취소" })).toHaveFocus(),
    );
    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(logout).not.toHaveBeenCalled();
  });

  it("blocks duplicate actions and navigates only after adapter success", async () => {
    const user = userEvent.setup();
    let finishLogout: (() => void) | undefined;
    const logout = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishLogout = resolve;
        }),
    );
    const onNavigateToLogin = vi.fn();
    render(
      <LogoutDialog
        logout={logout}
        onNavigateToLogin={onNavigateToLogin}
        onOpenChange={vi.fn()}
        open
        profile={defaultAccountProfile}
      />,
    );

    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(screen.getByRole("button", { name: "로그아웃 중…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "취소" })).toBeDisabled();
    expect(logout).toHaveBeenCalledOnce();
    expect(onNavigateToLogin).not.toHaveBeenCalled();

    finishLogout?.();
    expect(await screen.findByText(/로그인 화면으로 이동합니다/)).toBeVisible();
    await waitFor(() => expect(onNavigateToLogin).toHaveBeenCalledOnce());
  });

  it("keeps the current account and offers retry after failure", async () => {
    const user = userEvent.setup();
    const logout = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    const onNavigateToLogin = vi.fn();
    render(
      <LogoutDialog
        logout={logout}
        onNavigateToLogin={onNavigateToLogin}
        onOpenChange={vi.fn()}
        open
        profile={defaultAccountProfile}
      />,
    );

    await user.click(screen.getByRole("button", { name: "로그아웃" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "현재 세션은 유지됩니다",
    );
    expect(screen.getByText(defaultAccountProfile.email)).toBeVisible();
    const retry = screen.getByRole("button", { name: "다시 시도" });
    await waitFor(() => expect(retry).toHaveFocus());
    expect(onNavigateToLogin).not.toHaveBeenCalled();

    await user.click(retry);
    await waitFor(() => expect(onNavigateToLogin).toHaveBeenCalledOnce());
    expect(logout).toHaveBeenCalledTimes(2);
  });
});
