import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "./workspace-shell";

describe("WorkspaceShell", () => {
  it("communicates the current sidebar target without relying on color", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <WorkspaceShell initialProjectId="glass-garden" />,
    );

    const manuscript = container.querySelector('[aria-current="page"]');
    expect(manuscript).toHaveAttribute("aria-current", "page");
    expect(manuscript).toHaveTextContent("12화 · 균열의 밤");

    await user.click(screen.getByRole("button", { name: "검색" }));
    const search = container.querySelector('[aria-current="page"]');
    expect(search).toHaveTextContent("검색");
    expect(
      screen.getByRole("heading", { level: 1, name: "검색" }),
    ).toBeInTheDocument();
  });

  it("switches projects and exposes section menus to keyboard navigation", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const projectTrigger = screen.getByRole("button", {
      name: "프로젝트 전환: 유리 정원의 기록",
    });
    projectTrigger.focus();
    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(
        screen.getByRole("menuitem", { name: "프로젝트 목록" }),
      ).toHaveFocus(),
    );
    await user.keyboard("{End}{Enter}");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "프로젝트 전환: 다른 프로젝트" }),
      ).toBeInTheDocument(),
    );

    await user.click(screen.getByRole("button", { name: "즐겨찾기 메뉴" }));
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "새 폴더" })).toHaveFocus(),
    );
    expect(screen.getByRole("menuitem", { name: "섹션 추가" })).toBeEnabled();
  });

  it("keeps a named sidebar toggle available when the sidebar is closed", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(screen.getByRole("button", { name: "사이드바 닫기" }));
    expect(
      screen.getByRole("button", { name: "사이드바 열기" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("opens one project settings tab from the sidebar", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const projectManagement = screen.getByRole("navigation", {
      name: "프로젝트 관리",
    });
    const settings = within(projectManagement).getByRole("button", {
      name: "설정",
    });
    await user.click(settings);
    await user.click(settings);

    expect(screen.getAllByRole("tab", { name: "설정" })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { level: 1, name: "프로젝트 설정" }),
    ).toBeInTheDocument();
  });
});
