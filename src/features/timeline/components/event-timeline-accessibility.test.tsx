import axe from "axe-core";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

import { TIMELINE_SCREEN_STATES } from "../timeline-states";

const themes = ["dark", "light"] as const;

describe.each(themes)("Event timeline accessibility (%s)", (theme) => {
  it.each(TIMELINE_SCREEN_STATES)(
    "has no structural violations for $id",
    async (state) => {
      document.documentElement.dataset.theme = theme;
      const { container } = render(
        <WorkspaceShell
          initialProjectId="glass-garden"
          initialTimelineState={state.id}
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
    },
  );

  it("supports keyboard selection, editing, cancellation, and deletion", async () => {
    document.documentElement.dataset.theme = theme;
    const user = userEvent.setup();
    render(
      <WorkspaceShell
        initialProjectId="glass-garden"
        initialTimelineState="timeline-default"
      />,
    );

    const firstItem = screen.getByRole("button", {
      name: "유리 등대가 멈추다 선택",
    });
    firstItem.focus();
    await user.keyboard("{ArrowDown}");
    const secondItem = screen.getByRole("button", {
      name: "기억 항로를 복원하다 선택",
    });
    await waitFor(() => expect(secondItem).toHaveFocus());

    const more = screen.getByRole("button", {
      name: "기억 항로를 복원하다 더보기",
    });
    more.focus();
    await user.keyboard("{ArrowDown}");
    const editItem = screen.getByRole("menuitem", { name: "편집" });
    await waitFor(() => expect(editItem).toHaveFocus());
    await user.keyboard("{Enter}");
    const editor = screen.getByRole("region", {
      name: "기억 항로를 복원하다 편집",
    });
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "항목 제목" })).toHaveFocus(),
    );

    await user.keyboard("{Escape}");
    await waitFor(() => expect(secondItem).toHaveFocus());
    expect(editor).not.toBeInTheDocument();

    more.focus();
    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: "편집" })).toHaveFocus(),
    );
    await user.keyboard("{ArrowDown}{Enter}");
    const dialog = screen.getByRole("dialog", {
      name: "시간 항목을 삭제할까요?",
    });
    const cancel = screen.getByRole("button", { name: "취소" });
    await waitFor(() => expect(cancel).toHaveFocus());
    fireEvent(dialog, new Event("cancel", { cancelable: true }));
    await waitFor(() => expect(secondItem).toHaveFocus());
    expect(dialog).not.toHaveAttribute("open");

    const add = screen.getByRole("button", { name: "시간 항목 추가" });
    add.focus();
    await user.keyboard("{Enter}");
    await waitFor(() =>
      expect(screen.getByRole("textbox", { name: "항목 제목" })).toHaveFocus(),
    );
  });
});
