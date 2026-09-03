import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceShell } from "./workspace-shell";

describe("WorkspaceShell", () => {
  it("communicates the current sidebar target without relying on color", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <WorkspaceShell initialProjectId="glass-garden" />,
    );

    const manuscript = container.querySelector('[aria-current="page"]');
    expect(manuscript).toHaveAttribute("aria-current", "page");
    expect(manuscript).toHaveTextContent("제17장 · 돌아오지 않는 밤");

    await user.click(screen.getByRole("button", { name: "검색" }));
    const search = container.querySelector('[aria-current="page"]');
    expect(search).toHaveTextContent("검색");
    expect(
      screen.getByRole("heading", { level: 1, name: "검색" }),
    ).toBeInTheDocument();
  });

  it("switches projects and exposes section menus to keyboard navigation", async () => {
    const user = userEvent.setup();
    const onProjectChange = vi.fn();
    render(
      <WorkspaceShell
        initialProjectId="glass-garden"
        onProjectChange={onProjectChange}
      />,
    );

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
        screen.getByRole("button", { name: "프로젝트 전환: 궤도 도시 기록" }),
      ).toBeInTheDocument(),
    );
    expect(onProjectChange).toHaveBeenCalledWith("orbit-record");

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

  it("retains settings across tabs and confirms before closing them", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const projectManagement = screen.getByRole("navigation", {
      name: "프로젝트 관리",
    });
    await user.click(
      within(projectManagement).getByRole("button", { name: "설정" }),
    );
    const description = screen.getByLabelText("프로젝트 설명");
    await user.clear(description);
    await user.type(description, "탭을 이동해도 유지되는 설명");

    await user.click(
      screen.getByRole("tab", { name: "제17장 · 돌아오지 않는 밤" }),
    );
    await user.click(screen.getByRole("tab", { name: "설정" }));
    expect(screen.getByLabelText("프로젝트 설명")).toHaveValue(
      "탭을 이동해도 유지되는 설명",
    );

    await user.click(screen.getByRole("button", { name: "설정 탭 닫기" }));
    expect(
      screen.getByRole("dialog", {
        name: "변경사항을 저장하지 않고 나갈까요?",
      }),
    ).toBeVisible();
    await user.click(screen.getByRole("button", { name: "계속 편집" }));
    expect(screen.getByRole("tab", { name: "설정" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "설정 탭 닫기" }));
    await user.click(screen.getByRole("button", { name: "변경사항 버리기" }));
    expect(screen.queryByRole("tab", { name: "설정" })).not.toBeInTheDocument();
  });

  it("confirms before switching projects with unsaved settings", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const projectManagement = screen.getByRole("navigation", {
      name: "프로젝트 관리",
    });
    await user.click(
      within(projectManagement).getByRole("button", { name: "설정" }),
    );
    await user.type(screen.getByLabelText("프로젝트 설명"), " 변경");
    await user.click(
      screen.getByRole("button", {
        name: "프로젝트 전환: 유리 정원의 기록",
      }),
    );
    await user.click(
      screen.getByRole("menuitemradio", { name: "궤도 도시 기록" }),
    );

    expect(
      screen.getByRole("dialog", {
        name: "변경사항을 저장하지 않고 나갈까요?",
      }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", {
        name: "프로젝트 전환: 유리 정원의 기록",
      }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "변경사항 버리기" }));
    expect(
      screen.getByRole("button", { name: "프로젝트 전환: 궤도 도시 기록" }),
    ).toBeInTheDocument();
  });

  it("opens one help tab and preserves its article navigation", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const projectManagement = screen.getByRole("navigation", {
      name: "프로젝트 관리",
    });
    const help = within(projectManagement).getByRole("button", {
      name: "도움말",
    });
    await user.click(help);
    await user.click(help);
    expect(screen.getAllByRole("tab", { name: "도움말" })).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /사용 가이드/ }));
    await user.click(screen.getByRole("button", { name: /작업공간 시작하기/ }));
    await user.click(
      screen.getByRole("tab", { name: "제17장 · 돌아오지 않는 밤" }),
    );
    await user.click(screen.getByRole("tab", { name: "도움말" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "작업공간 시작하기" }),
    ).toBeInTheDocument();
  });
});
