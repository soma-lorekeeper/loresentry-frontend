import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { getDb } from "@/services/mock/db";
import { renderWithServices, routerMock, setSearchParams } from "@/test/render";

import { LoginPage } from "./login-page";

afterEach(() => setSearchParams(""));

describe("LoginPage", () => {
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
