import axe from "axe-core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

const themes = ["dark", "light"] as const;

describe.each(themes)("AI Chat accessibility (%s)", (theme) => {
  it("keeps the open panel free of detectable accessibility violations", async () => {
    document.documentElement.dataset.theme = theme;
    const user = userEvent.setup();
    const { container } = render(
      <WorkspaceShell initialProjectId="glass-garden" />,
    );

    await user.click(screen.getByRole("button", { name: "AI 챗" }));
    expect(container.firstElementChild).toHaveAttribute(
      "data-ai-chat-open",
      "true",
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

describe("AI Chat keyboard focus", () => {
  it("cancels inline rename and returns focus to the session action", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);
    await user.click(screen.getByRole("button", { name: "AI 챗" }));

    const more = screen.getByRole("button", {
      name: "현재 채팅 세션 메뉴",
    });
    more.focus();
    await user.keyboard("{ArrowDown}");
    const rename = screen.getByRole("menuitem", { name: "이름 변경" });
    await waitFor(() => expect(rename).toHaveFocus());
    await user.keyboard("{Enter}");

    const name = screen.getByRole("textbox", { name: "채팅 세션 이름" });
    await waitFor(() => expect(name).toHaveFocus());
    await user.keyboard("{Escape}");
    await waitFor(() => expect(more).toHaveFocus());

    expect(
      screen.getByRole("button", {
        name: "채팅 세션 선택: 균열 장면 다듬기",
      }),
    ).toBeInTheDocument();
  });

  it("returns focus to the toolbar toggle when the panel closes", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const toggle = screen.getByRole("button", { name: "AI 챗" });
    toggle.focus();
    await user.keyboard("{Enter}");
    await user.keyboard("{Enter}");

    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute("aria-pressed", "false");
  });
});
