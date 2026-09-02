import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceNewTab } from "./workspace-new-tab";
import { WorkspaceShell } from "./workspace-shell";

describe("Workspace new tab", () => {
  it("shows resume, creation, import, and recent-file actions", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(screen.getByRole("button", { name: "새 탭 열기" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "유리 정원의 기록" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "12화 · 균열의 밤 이어서 작업하기",
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /만들기$/ })).toHaveLength(8);
    expect(
      screen.getByRole("list", { name: "최근에 연 파일" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "가져오기" }));
    expect(screen.getByRole("status")).toHaveTextContent(
      "현재 프로젝트의 파일 가져오기를 시작했습니다.",
    );
  });

  it("uses the same structure when no recent work exists", () => {
    render(
      <WorkspaceNewTab
        onCreateFile={vi.fn()}
        onOpenFile={vi.fn()}
        projectName="빈 프로젝트"
        recentFiles={[]}
      />,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "빈 프로젝트" }),
    ).toBeInTheDocument();
    expect(screen.getByText("아직 작업한 파일이 없습니다")).toBeInTheDocument();
    expect(
      within(screen.getByRole("region", { name: "시작하기" })).getByRole(
        "button",
        { name: "원고 만들기" },
      ),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /만들기$/ })).toHaveLength(9);
    expect(screen.getByRole("status")).toHaveTextContent(
      "최근에 연 파일이 없습니다",
    );
    expect(
      screen.queryByRole("list", { name: "최근에 연 파일" }),
    ).not.toBeInTheDocument();
  });

  it("replaces the new tab with the created file", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(screen.getByRole("button", { name: "새 탭 열기" }));
    const createSection = screen.getByRole("region", { name: "새로 만들기" });
    await user.click(
      within(createSection).getByRole("button", { name: "원고 만들기" }),
    );

    expect(screen.getByRole("tab", { name: "제목 없는 원고" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(
      screen.queryByRole("tab", { name: "새 탭" }),
    ).not.toBeInTheDocument();
  });

  it("opens a recent file using its original document identity", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(screen.getByRole("button", { name: "새 탭 열기" }));
    await user.click(
      screen.getByRole("button", {
        name: "12화 · 균열의 밤, 원고 · 1분 전",
      }),
    );

    expect(
      screen.getAllByRole("tab", { name: "12화 · 균열의 밤" }),
    ).toHaveLength(1);
    expect(
      screen.getByRole("tab", { name: "12화 · 균열의 밤" }),
    ).toHaveAttribute("aria-selected", "true");
  });
});
