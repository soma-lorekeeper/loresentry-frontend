import { render, screen, waitFor, within } from "@testing-library/react";
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

  it("renames only the current session inline", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);
    await user.click(screen.getByRole("button", { name: "AI 챗" }));

    await user.click(
      screen.getByRole("button", { name: "현재 채팅 세션 메뉴" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "이름 변경" }));

    const name = screen.getByRole("textbox", { name: "채팅 세션 이름" });
    await waitFor(() => expect(name).toHaveFocus());
    await user.clear(name);
    await user.type(name, "문장 리듬 검토{Enter}");

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "채팅 세션 선택: 문장 리듬 검토",
        }),
      ).toHaveFocus(),
    );
    expect(
      screen.getByText("채팅 세션 이름을 문장 리듬 검토(으)로 변경했습니다."),
    ).toBeInTheDocument();
  });

  it("confirms deletion with cancel focused and restores a defined session", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);
    await user.click(screen.getByRole("button", { name: "AI 챗" }));

    const more = screen.getByRole("button", {
      name: "현재 채팅 세션 메뉴",
    });
    await user.click(more);
    await user.click(screen.getByRole("menuitem", { name: "삭제" }));

    const dialog = screen.getByRole("dialog", {
      name: "채팅 세션을 삭제할까요?",
    });
    const cancel = within(dialog).getByRole("button", { name: "취소" });
    await waitFor(() => expect(cancel).toHaveFocus());
    await user.click(cancel);
    await waitFor(() => expect(more).toHaveFocus());

    await user.click(more);
    await user.click(screen.getByRole("menuitem", { name: "삭제" }));
    await user.click(
      within(
        screen.getByRole("dialog", { name: "채팅 세션을 삭제할까요?" }),
      ).getByRole("button", { name: "삭제" }),
    );

    await waitFor(() =>
      expect(
        screen.getByRole("button", {
          name: "채팅 세션 선택: 북쪽 문 복선 정리",
        }),
      ).toHaveFocus(),
    );
    expect(
      screen.getByText("균열 장면 다듬기 채팅 세션을 삭제했습니다."),
    ).toBeInTheDocument();
  });
});
