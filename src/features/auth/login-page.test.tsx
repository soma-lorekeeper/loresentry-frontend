import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { getDb } from "@/services/mock/db";
import { renderWithServices, routerMock, setSearchParams } from "@/test/render";

import { LoginPage } from "./login-page";
import { readOAuthReturnTo, rememberOAuthReturnTo } from "./return-to";

afterEach(() => {
  setSearchParams("");
  window.sessionStorage.removeItem("loresentry.oauth.return-to");
});

describe("LoginPage", () => {
  it("allows another login after returning from Google through the back cache", async () => {
    const startGoogleLogin = vi.fn(() => new Promise<void>(() => {}));
    renderWithServices(<LoginPage />, {
      auth: { getSession: async () => null, startGoogleLogin },
    });
    await userEvent.click(
      await screen.findByRole("button", { name: "Google로 계속하기" }),
    );
    expect(
      screen.getByRole("button", { name: "Google 로그인으로 이동 중…" }),
    ).toBeDisabled();
    act(() => {
      window.dispatchEvent(new PageTransitionEvent("pageshow"));
    });
    expect(startGoogleLogin).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("button", { name: "Google 로그인으로 이동 중…" }),
    ).toBeDisabled();
    act(() => {
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      );
    });
    await userEvent.click(
      await screen.findByRole("button", { name: "Google로 다시 계속하기" }),
    );
    expect(startGoogleLogin).toHaveBeenCalledTimes(2);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
  it("keeps the original destination when retrying a canceled OAuth round trip", async () => {
    const path = "/en/workspace/?projectId=qa&open=file:one";
    rememberOAuthReturnTo(path);
    setSearchParams("result=cancelled");
    const startGoogleLogin = vi.fn().mockResolvedValue(undefined);
    renderWithServices(<LoginPage />, {
      auth: { getSession: async () => null, startGoogleLogin },
    });
    await userEvent.click(
      await screen.findByRole("button", { name: "Google로 다시 계속하기" }),
    );
    expect(startGoogleLogin).toHaveBeenCalledWith(path);
  });
  it("returns to the preserved locale-prefixed document after an OAuth callback without returnTo", async () => {
    const path = "/ko/workspace/?projectId=qa&open=file:one";
    rememberOAuthReturnTo(path);
    setSearchParams("result=success");
    renderWithServices(<LoginPage />, {
      before: () => {
        getDb().signedIn = true;
      },
    });
    await waitFor(() => expect(routerMock.replace).toHaveBeenCalledWith(path));
    expect(readOAuthReturnTo()).toBeNull();
  });
  /**
   * 세션 게이트는 로그인하지 **않은** 사람을 이 화면으로 보내는 일만 한다. 로그인된 사람을 앞으로
   * 보내 주는 코드가 이 화면에 없으면 `/login?result=success` 에 그대로 머문다 — 세션은 살아
   * 있는데 화면만 남는 상태다.
   */
  it("sends a confirmed session on to the workspace", async () => {
    setSearchParams("result=success");
    renderWithServices(<LoginPage />, {
      before: () => {
        getDb().signedIn = true;
      },
    });

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/projects"),
    );
  });

  it("honours where the user was headed", async () => {
    setSearchParams("result=success&returnTo=%2Fworkspace");
    renderWithServices(<LoginPage />, {
      before: () => {
        getDb().signedIn = true;
      },
    });

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/workspace"),
    );
  });

  it("stops saying it is working when the session turns out to be missing", async () => {
    // BFF 가 success 로 돌려보냈지만 세션이 없다. 그것은 실패이고, 계속 기다리게 두면 안 된다.
    setSearchParams("result=success");
    renderWithServices(<LoginPage />, {
      before: () => {
        getDb().signedIn = false;
      },
    });

    expect(await screen.findByText(/로그인하지 못했|다시 시도/)).toBeVisible();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
