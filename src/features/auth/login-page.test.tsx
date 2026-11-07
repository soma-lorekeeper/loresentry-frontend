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

describe("LoginPage password form", () => {
  const fill = async (
    user: ReturnType<typeof userEvent.setup>,
    loginId: string,
    password: string,
  ) => {
    await user.type(screen.getByLabelText("아이디"), loginId);
    await user.type(screen.getByLabelText("비밀번호"), password);
  };

  it("logs in with the demo credentials and moves on", async () => {
    const user = userEvent.setup();
    renderWithServices(<LoginPage />);
    await fill(user, "Writer", "password1");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/projects"),
    );
    expect(getDb().signedIn).toBe(true);
  });

  it("shows the server's message for a wrong password and stays", async () => {
    const user = userEvent.setup();
    renderWithServices(<LoginPage />);
    await fill(user, "writer", "wrong-password");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(
      await screen.findByText("아이디 또는 비밀번호가 맞지 않아요."),
    ).toBeVisible();
    expect(routerMock.replace).not.toHaveBeenCalled();
    expect(getDb().signedIn).toBe(false);
  });

  it("validates before sending anything", async () => {
    const user = userEvent.setup();
    const loginWithPassword = vi.fn();
    renderWithServices(<LoginPage />, { auth: { loginWithPassword } });
    await fill(user, "a!", "short");
    await user.click(screen.getByRole("button", { name: "로그인" }));
    expect(
      screen.getByText("아이디는 영문 소문자·숫자·._- 3~32자로 입력해 주세요."),
    ).toBeVisible();
    expect(
      screen.getByText("비밀번호는 공백 없이 8~72자로 입력해 주세요."),
    ).toBeVisible();
    expect(loginWithPassword).not.toHaveBeenCalled();
  });

  it("creates an account and moves on to onboarding-ready state", async () => {
    const user = userEvent.setup();
    renderWithServices(<LoginPage />);
    await user.click(screen.getByRole("button", { name: "계정 만들기" }));
    expect(screen.getByRole("heading", { name: "계정 만들기" })).toBeVisible();
    await fill(user, "judge1", "correct-horse-7");
    await user.type(screen.getByLabelText("이름"), "심사위원");
    await user.click(screen.getByRole("button", { name: "계정 만들기" }));
    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/projects"),
    );
    expect(getDb().user.displayName).toBe("심사위원");
    expect(getDb().user.onboardingCompleted).toBe(false);
  });

  it("marks a taken id on the field", async () => {
    const user = userEvent.setup();
    renderWithServices(<LoginPage />);
    await user.click(screen.getByRole("button", { name: "계정 만들기" }));
    await fill(user, "writer", "correct-horse-7");
    await user.click(screen.getByRole("button", { name: "계정 만들기" }));
    expect(await screen.findByText("이미 사용 중인 아이디예요.")).toBeVisible();
    expect(screen.getByLabelText("아이디")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("hands a consent-pending signup to the terms flow", async () => {
    const user = userEvent.setup();
    setSearchParams("returnTo=%2Fworkspace");
    renderWithServices(<LoginPage />, {
      auth: { signUpWithPassword: async () => "terms-required" },
    });
    await user.click(screen.getByRole("button", { name: "계정 만들기" }));
    await fill(user, "judge2", "correct-horse-7");
    await user.click(screen.getByRole("button", { name: "계정 만들기" }));
    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith(
        "/login?result=terms_required&returnTo=%2Fworkspace",
      ),
    );
  });
});
