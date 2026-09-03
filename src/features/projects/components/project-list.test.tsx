import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProjectList } from "./project-list";

describe("ProjectList", () => {
  it("renders the global navigation and the new-project card first", () => {
    render(<ProjectList />);

    expect(screen.getByRole("link", { name: "프로젝트 목록" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const cards = screen.getByRole("region", {
      name: "프로젝트 목록",
    }).children;
    expect(cards[0]).toHaveTextContent("새 프로젝트");
    expect(cards[1]).toHaveTextContent("별빛 아래 마지막 약속");
  });

  it("keeps the card action and more menu independent", async () => {
    const user = userEvent.setup();
    const onOpenProject = vi.fn();
    const onRenameRequest = vi.fn();
    render(
      <ProjectList
        onOpenProject={onOpenProject}
        onRenameRequest={onRenameRequest}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "별빛 아래 마지막 약속 — 장편 프로젝트 더 보기",
      }),
    );
    expect(onOpenProject).not.toHaveBeenCalled();
    await user.click(screen.getByRole("menuitem", { name: "이름 변경" }));
    expect(onRenameRequest).toHaveBeenCalledOnce();
    expect(onOpenProject).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", {
        name: /별빛 아래 마지막 약속 — 장편 프로젝트12분 전/,
      }),
    );
    expect(onOpenProject).toHaveBeenCalledWith("glass-garden");
    expect(screen.getByText("선택됨")).toBeVisible();
  });

  it("supports keyboard menu traversal and restores focus on Escape", async () => {
    const user = userEvent.setup();
    render(<ProjectList />);
    const trigger = screen.getByRole("button", {
      name: "별빛 아래 마지막 약속 — 장편 프로젝트 더 보기",
    });

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    const menu = screen.getByRole("menu", {
      name: "별빛 아래 마지막 약속 — 장편 프로젝트 메뉴",
    });
    await waitFor(() =>
      expect(
        within(menu).getByRole("menuitem", { name: "이름 변경" }),
      ).toHaveFocus(),
    );
    await user.keyboard("{ArrowDown}");
    expect(
      within(menu).getByRole("menuitem", { name: "휴지통으로 이동" }),
    ).toHaveFocus();
    fireEvent.keyDown(menu, { key: "Escape" });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(trigger).toHaveFocus();
  });
});
