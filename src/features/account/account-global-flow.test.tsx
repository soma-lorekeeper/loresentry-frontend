import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProjectGuide } from "@/features/help/components/project-guide";
import { ProjectSidebar } from "@/features/projects/components/project-sidebar";

describe("account and global keyboard flow", () => {
  it("moves from account edit through a persisted name and back to the summary", async () => {
    const user = userEvent.setup();
    render(
      <ProjectSidebar updateAccount={vi.fn().mockResolvedValue(undefined)} />,
    );

    const summary = screen.getByRole("button", { name: /사용자 메뉴/ });
    await user.click(summary);
    await user.click(screen.getByRole("menuitem", { name: "계정 설정" }));
    const name = screen.getByRole("textbox", { name: /이름/ });
    await user.clear(name);
    await user.type(name, "새 필명");
    await user.click(screen.getByRole("button", { name: "저장" }));
    await user.click(await screen.findByRole("button", { name: "닫기" }));

    await waitFor(() => expect(summary).toHaveFocus());
    expect(summary).toHaveAccessibleName(/새 필명/);
  });

  it("keeps global guide navigation operable in visual order", async () => {
    const user = userEvent.setup();
    render(<ProjectGuide />);
    const first = screen.getByRole("link", { name: /작업공간 시작하기/ });
    const second = screen.getByRole("link", { name: /파일과 속성 문서/ });

    first.focus();
    await user.keyboard("{ArrowDown}");
    expect(second).toHaveFocus();
    expect(screen.getByRole("link", { name: "사용 가이드" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
