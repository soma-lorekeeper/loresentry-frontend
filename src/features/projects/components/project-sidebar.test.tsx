import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { longAccountProfile } from "@/features/account/account-model";

import { ProjectSidebar } from "./project-sidebar";

describe("ProjectSidebar account settings", () => {
  it("opens the user menu, supports arrow keys, and restores summary focus", async () => {
    const user = userEvent.setup();
    render(<ProjectSidebar />);
    const trigger = screen.getByRole("button", { name: /사용자 메뉴/ });

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    const menu = screen.getByRole("menu", { name: "사용자 메뉴" });
    await waitFor(() =>
      expect(
        within(menu).getByRole("menuitem", { name: "계정 설정" }),
      ).toHaveFocus(),
    );
    await user.keyboard("{ArrowDown}");
    expect(
      within(menu).getByRole("menuitem", { name: "로그아웃" }),
    ).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("validates, trims, persists, and updates the visible profile", async () => {
    const user = userEvent.setup();
    const updateAccount = vi.fn().mockResolvedValue(undefined);
    render(<ProjectSidebar updateAccount={updateAccount} />);

    await user.click(screen.getByRole("button", { name: /사용자 메뉴/ }));
    await user.click(screen.getByRole("menuitem", { name: "계정 설정" }));
    const input = screen.getByRole("textbox", { name: /이름/ });
    expect(screen.getByRole("button", { name: "저장" })).toBeDisabled();
    await user.clear(input);
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(screen.getByText("이름을 입력해 주세요.")).toBeVisible();

    await user.type(input, "  새 필명  ");
    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(updateAccount).toHaveBeenCalledWith({ name: "새 필명" });
    expect(await screen.findByText("계정 정보를 저장했어요.")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /새 필명.*사용자 메뉴/ }),
    ).toBeVisible();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "닫기" })).toHaveFocus(),
    );
  });

  it("preserves edited values and exposes retry after backend failure", async () => {
    const user = userEvent.setup();
    const updateAccount = vi.fn().mockRejectedValue(new Error("offline"));
    render(
      <ProjectSidebar
        initialAccountState="edited"
        updateAccount={updateAccount}
      />,
    );

    await user.click(screen.getByRole("button", { name: "저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "계정 정보를 저장하지 못했어요.",
    );
    expect(screen.getByRole("textbox", { name: /이름/ })).toHaveValue(
      "이승주 작가",
    );
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeVisible();
  });

  it("keeps complete long values in accessible names while visual text can truncate", () => {
    render(
      <ProjectSidebar
        initialAccountState="default"
        initialProfile={longAccountProfile}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: `${longAccountProfile.name}, ${longAccountProfile.email} 사용자 메뉴`,
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("textbox", { name: /Google 계정 이메일/ }),
    ).toHaveValue(longAccountProfile.email);
  });
});
