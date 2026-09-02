import axe from "axe-core";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

const themes = ["dark", "light"] as const;

describe.each(themes)("Property document accessibility (%s)", (theme) => {
  it(`has no detectable structural violations in ${theme}`, async () => {
    document.documentElement.dataset.theme = theme;
    const { container } = render(
      <WorkspaceShell
        initialProjectId="glass-garden"
        initialPropertyState="place-type-menu"
      />,
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

  it(`closes the initially open type menu and restores focus in ${theme}`, async () => {
    document.documentElement.dataset.theme = theme;
    const user = userEvent.setup();
    render(
      <WorkspaceShell
        initialProjectId="glass-garden"
        initialPropertyState="place-type-menu"
      />,
    );

    const trigger = screen.getByRole("button", {
      name: "상위 장소 유형: 장소",
    });
    await waitFor(() =>
      expect(
        screen.getByRole("menuitemradio", { name: "텍스트" }),
      ).toHaveFocus(),
    );
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
