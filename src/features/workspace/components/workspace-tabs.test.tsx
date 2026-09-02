import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "./workspace-shell";

describe("Workspace tabs and file header", () => {
  it("selects tabs with arrow keys and exposes the active document", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const firstTab = screen.getByRole("tab", { name: "12화 · 균열의 밤" });
    firstTab.focus();
    await user.keyboard("{ArrowRight}");

    expect(
      screen.getByRole("tab", { name: "11화 · 유리 정원" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(
      screen.getByRole("heading", { level: 1, name: "11화 · 유리 정원" }),
    ).toBeInTheDocument();
  });

  it("closes tabs and preserves a non-closable new-tab context", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(
      screen.getByRole("button", { name: "12화 · 균열의 밤 탭 닫기" }),
    );
    await user.click(
      screen.getByRole("button", { name: "11화 · 유리 정원 탭 닫기" }),
    );

    expect(screen.getByRole("tab", { name: "새 탭" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await waitFor(() =>
      expect(screen.getByRole("tab", { name: "새 탭" })).toHaveFocus(),
    );
    expect(
      screen.queryByRole("button", { name: "새 탭 탭 닫기" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("banner", { name: "파일 도구" }),
    ).not.toBeInTheDocument();
  });

  it("reorders tabs with Alt and arrow keys", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    screen.getByRole("tab", { name: "12화 · 균열의 밤" }).focus();
    await user.keyboard("{Alt>}{ArrowRight}{/Alt}");

    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "11화 · 유리 정원",
      "12화 · 균열의 밤",
    ]);
  });

  it("keeps file actions in context and returns focus after closing the memo", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const fileHeader = screen.getByRole("banner", { name: "파일 도구" });
    const memoButton = within(fileHeader).getByRole("button", { name: "메모" });
    await user.click(memoButton);
    expect(memoButton).toHaveAttribute("aria-pressed", "true");
    const memoPanel = screen.getByRole("complementary", {
      name: "12화 · 균열의 밤 메모",
    });
    await user.click(
      within(memoPanel).getByRole("button", { name: "파일 메모 닫기" }),
    );
    await waitFor(() => expect(memoButton).toHaveFocus());

    await user.click(within(fileHeader).getByRole("button", { name: "잠금" }));
    expect(
      within(fileHeader).getByRole("button", { name: "잠금 해제" }),
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("provides overflow controls when more than three tabs are open", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(screen.getByRole("button", { name: "검색" }));
    await user.click(screen.getByRole("button", { name: "그래프" }));

    expect(
      screen.getByRole("button", { name: "이전 탭 보기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다음 탭 보기" }),
    ).toBeInTheDocument();
  });
});
