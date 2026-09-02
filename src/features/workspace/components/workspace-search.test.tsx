import axe from "axe-core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "./workspace-shell";

async function openSearch() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "검색" }));
  return user;
}

describe("Workspace search and navigation accessibility", () => {
  it("focuses the named search input and communicates its initial scope", async () => {
    render(<WorkspaceShell initialProjectId="glass-garden" />);
    await openSearch();

    expect(
      screen.getByRole("searchbox", { name: "현재 프로젝트에서 검색" }),
    ).toHaveFocus();
    expect(
      screen.getByRole("heading", {
        name: "현재 프로젝트의 파일을 검색하세요",
      }),
    ).toBeInTheDocument();
  });

  it("announces results and focuses the opened document panel", async () => {
    render(<WorkspaceShell initialProjectId="glass-garden" />);
    const user = await openSearch();
    const input = screen.getByRole("searchbox", {
      name: "현재 프로젝트에서 검색",
    });

    await user.type(input, "균열");
    expect(await screen.findByText("“균열” 검색 결과 1개")).toHaveAttribute(
      "role",
      "status",
    );
    await user.click(
      screen.getByRole("button", {
        name: "12화 · 균열의 밤, 원고, 파일 > 원고",
      }),
    );

    const panel = screen.getByRole("tabpanel", { name: "12화 · 균열의 밤" });
    await waitFor(() => expect(panel).toHaveFocus());
    expect(screen.getByRole("tab", { name: "검색" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("keeps query state when returning to the single search tab", async () => {
    render(<WorkspaceShell initialProjectId="glass-garden" />);
    const user = await openSearch();
    const input = screen.getByRole("searchbox", {
      name: "현재 프로젝트에서 검색",
    });

    await user.type(input, "유리");
    await screen.findByText("“유리” 검색 결과 2개");
    await user.click(
      screen.getByRole("button", {
        name: "11화 · 유리 정원, 원고, 파일 > 원고",
      }),
    );
    await user.click(screen.getByRole("button", { name: "검색" }));

    expect(
      screen.getByRole("searchbox", { name: "현재 프로젝트에서 검색" }),
    ).toHaveValue("유리");
    expect(screen.getAllByRole("tab", { name: "검색" })).toHaveLength(1);
  });

  it("distinguishes no-results and retryable error states without clearing input", async () => {
    render(<WorkspaceShell initialProjectId="glass-garden" />);
    const user = await openSearch();
    const input = screen.getByRole("searchbox", {
      name: "현재 프로젝트에서 검색",
    });

    await user.type(input, "없는 문서");
    expect(
      await screen.findByRole("heading", { name: "검색 결과가 없습니다" }),
    ).toBeInTheDocument();
    await user.clear(input);
    await user.type(input, "오류");
    expect(
      await screen.findByText("검색 결과를 불러오지 못했습니다"),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(input).toHaveValue("오류");
    expect(screen.getByRole("status", { name: "" })).toHaveTextContent(
      "검색 중",
    );
    expect(
      await screen.findByText("검색 결과를 불러오지 못했습니다"),
    ).toBeInTheDocument();
  });

  it("has no detectable structural accessibility violations", async () => {
    const { container } = render(
      <WorkspaceShell initialProjectId="glass-garden" />,
    );
    const user = await openSearch();
    await user.type(
      screen.getByRole("searchbox", { name: "현재 프로젝트에서 검색" }),
      "유리",
    );
    await screen.findByText("“유리” 검색 결과 2개");

    const results = await axe.run(container, {
      rules: { "color-contrast": { enabled: false } },
    });
    expect(
      results.violations,
      results.violations
        .map((violation) => `${violation.id}: ${violation.help}`)
        .join("\n"),
    ).toEqual([]);
  });
});
