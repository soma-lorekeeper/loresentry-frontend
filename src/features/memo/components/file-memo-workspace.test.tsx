import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

describe("File memo panel placement", () => {
  it("switches placement and scope with accessible selected states", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(
      within(screen.getByRole("banner", { name: "파일 도구" })).getByRole(
        "button",
        { name: "메모" },
      ),
    );
    const panel = screen.getByRole("complementary", {
      name: "12화 · 균열의 밤 메모",
    });
    const right = within(panel).getByRole("button", { name: "오른쪽" });
    const below = within(panel).getByRole("button", { name: "아래" });
    expect(right).toHaveAttribute("aria-pressed", "true");
    expect(
      within(panel).getByRole("tab", { name: "작품 메모" }),
    ).toHaveAttribute("aria-selected", "true");

    await user.click(below);
    expect(below).toHaveAttribute("aria-pressed", "true");
    await user.click(within(panel).getByRole("tab", { name: "원고 메모" }));
    expect(
      within(panel).getByRole("tabpanel", { name: "원고 메모" }),
    ).toHaveTextContent("12화 · 균열의 밤");
  });

  it("resizes with the keyboard without replacing the manuscript editor", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const body = screen.getByRole("textbox", { name: "원고 본문" });
    await user.type(body, " 유지할 문장");
    await user.click(
      within(screen.getByRole("banner", { name: "파일 도구" })).getByRole(
        "button",
        { name: "메모" },
      ),
    );
    const handle = screen.getByRole("separator", {
      name: "메모 패널 너비 조절, 현재 360픽셀",
    });
    handle.focus();
    await user.keyboard("{ArrowLeft}");

    expect(
      screen.getByRole("separator", {
        name: "메모 패널 너비 조절, 현재 368픽셀",
      }),
    ).toHaveFocus();
    expect((body as HTMLTextAreaElement).value).toContain("유지할 문장");
  });

  it("temporarily docks below while AI Chat is open and restores right", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(
      within(screen.getByRole("banner", { name: "파일 도구" })).getByRole(
        "button",
        { name: "메모" },
      ),
    );
    await user.click(screen.getByRole("button", { name: "AI 챗" }));
    expect(screen.getByRole("button", { name: "아래" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.getByText(
        "AI 챗과 함께 표시하기 위해 메모 패널을 임시로 아래에 배치했습니다.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "AI 챗" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "오른쪽" })).toHaveAttribute(
        "aria-pressed",
        "true",
      ),
    );
  });

  it("resizes with pointer input and keeps the editor content", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const body = screen.getByRole("textbox", { name: "원고 본문" });
    await user.type(body, " 포인터 중에도 유지");
    await user.click(
      within(screen.getByRole("banner", { name: "파일 도구" })).getByRole(
        "button",
        { name: "메모" },
      ),
    );
    const handle = screen.getByRole("separator", {
      name: "메모 패널 너비 조절, 현재 360픽셀",
    });
    fireEvent.pointerDown(handle, { clientX: 600, pointerId: 1 });
    fireEvent.pointerMove(handle, { clientX: 560, pointerId: 1 });
    fireEvent.pointerUp(handle, { clientX: 560, pointerId: 1 });

    expect(
      screen.getByRole("separator", {
        name: "메모 패널 너비 조절, 현재 400픽셀",
      }),
    ).toBeInTheDocument();
    expect((body as HTMLTextAreaElement).value).toContain("포인터 중에도 유지");

    await user.click(screen.getByRole("button", { name: "아래" }));
    const horizontalHandle = screen.getByRole("separator", {
      name: "메모 패널 높이 조절, 현재 300픽셀",
    });
    fireEvent.pointerDown(horizontalHandle, { clientY: 600, pointerId: 2 });
    fireEvent.pointerMove(horizontalHandle, { clientY: 560, pointerId: 2 });
    fireEvent.pointerUp(horizontalHandle, { clientY: 560, pointerId: 2 });
    expect(
      screen.getByRole("separator", {
        name: "메모 패널 높이 조절, 현재 340픽셀",
      }),
    ).toBeInTheDocument();
  });
});
