import axe from "axe-core";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "./workspace-shell";

const themes = ["dark", "light"] as const;

describe.each(themes)("Workspace core flow (%s)", (theme) => {
  it(`maps the route project and supports keyboard-first manuscript creation in ${theme}`, async () => {
    document.documentElement.dataset.theme = theme;
    const user = userEvent.setup();
    const { container } = render(
      <WorkspaceShell initialProjectId="glass-garden" recentFiles={[]} />,
    );

    expect(container.firstElementChild).toHaveAttribute(
      "data-project-id",
      "glass-garden",
    );

    const newTabButton = screen.getByRole("button", { name: "새 탭 열기" });
    newTabButton.focus();
    await user.keyboard("{Enter}");
    expect(screen.getByText("아직 작업한 파일이 없습니다")).toBeInTheDocument();

    const createSection = screen.getByRole("region", { name: "새로 만들기" });
    const createManuscript = within(createSection).getByRole("button", {
      name: "원고 만들기",
    });
    createManuscript.focus();
    await user.keyboard("{Enter}");

    const title = screen.getByRole("textbox", { name: "원고 제목" });
    const body = screen.getByRole("textbox", { name: "원고 본문" });
    await user.clear(title);
    await user.type(title, "새 장면");
    await user.type(body, "문이 열리고 새로운 이야기가 시작됐다.");

    expect(title).toHaveValue("새 장면");
    expect(body).toHaveValue("문이 열리고 새로운 이야기가 시작됐다.");
    await waitFor(
      () => expect(screen.getByRole("status")).toHaveTextContent("저장됨"),
      { timeout: 1_500 },
    );

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
