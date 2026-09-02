import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

describe("AI Chat panel", () => {
  it("opens beside the editor and preserves the manuscript context", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const body = screen.getByRole("textbox", { name: "원고 본문" });
    await user.type(body, " 편집 중");

    const toggle = screen.getByRole("button", { name: "AI 챗" });
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("complementary", { name: "균열 장면 다듬기" }),
    ).toBeInTheDocument();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect((body as HTMLTextAreaElement).value).toContain("편집 중");
  });

  it("creates an empty session and focuses its named composer", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(screen.getByRole("button", { name: "AI 챗" }));
    await user.click(screen.getByRole("button", { name: "새 채팅 시작" }));

    expect(
      screen.getByRole("heading", { name: "새 대화를 시작하세요" }),
    ).toBeInTheDocument();
    const composer = screen.getByRole("textbox", { name: "메시지 입력" });
    await waitFor(() => expect(composer).toHaveFocus());
    expect(screen.getByRole("button", { name: "메시지 전송" })).toBeDisabled();
    expect(screen.queryByText("Lorekeeper AI")).not.toBeInTheDocument();
  });

  it("switches sessions with keyboard navigation and keeps editor input", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const body = screen.getByRole("textbox", { name: "원고 본문" });
    await user.type(body, " 유지할 문장");
    await user.click(screen.getByRole("button", { name: "AI 챗" }));

    const picker = screen.getByRole("button", {
      name: "채팅 세션 선택: 균열 장면 다듬기",
    });
    picker.focus();
    await user.keyboard("{ArrowDown}");
    const current = screen.getByRole("menuitemradio", {
      name: /균열 장면 다듬기/,
    });
    await waitFor(() => expect(current).toHaveFocus());
    expect(current).toHaveAttribute("aria-checked", "true");

    await user.keyboard("{ArrowDown}{Enter}");
    expect(
      screen.getByRole("button", {
        name: "채팅 세션 선택: 북쪽 문 복선 정리",
      }),
    ).toBeInTheDocument();
    expect((body as HTMLTextAreaElement).value).toContain("유지할 문장");
  });
});
