import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Menu, MenuItem } from "./menu";

function TestMenu() {
  return (
    <Menu buttonContent="프로젝트" buttonLabel="프로젝트 선택">
      <MenuItem>프로젝트 목록</MenuItem>
      <MenuItem disabled>사용할 수 없음</MenuItem>
      <MenuItem selected>유리 정원의 기록</MenuItem>
    </Menu>
  );
}

describe("Menu", () => {
  it("opens from the keyboard, skips disabled items, wraps, and restores focus", async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    const trigger = screen.getByRole("button", { name: "프로젝트 선택" });

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    const first = await screen.findByRole("menuitem", {
      name: "프로젝트 목록",
    });
    const selected = screen.getByRole("menuitemradio", {
      name: "유리 정원의 기록",
    });
    await waitFor(() => expect(first).toHaveFocus());

    await user.keyboard("{ArrowDown}");
    expect(selected).toHaveFocus();
    expect(selected).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowDown}");
    expect(first).toHaveFocus();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
