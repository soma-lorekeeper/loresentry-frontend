import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { MemoSaveInput } from "@/features/memo/memo-model";
import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

function openMemoScreen() {
  return within(
    screen.getByRole("navigation", { name: "프로젝트 기능" }),
  ).getByRole("button", { name: "메모" });
}

describe("Project and file memo cards", () => {
  it("switches scope with arrow keys and preserves edited content", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(openMemoScreen());
    const heading = screen.getByRole("heading", { level: 1, name: "메모" });
    await waitFor(() => expect(heading).toHaveFocus());

    const projectScope = screen.getByRole("tab", { name: "프로젝트 메모" });
    expect(projectScope).toHaveAttribute("aria-selected", "true");
    const firstProjectMemo = screen.getByRole("textbox", {
      name: "프로젝트 메모 1 본문",
    });
    await user.type(firstProjectMemo, " 계속 이어 쓰기");

    projectScope.focus();
    await user.keyboard("{ArrowRight}");
    const fileScope = screen.getByRole("tab", { name: "파일 메모" });
    expect(fileScope).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(fileScope).toHaveFocus());
    expect(
      screen.queryByRole("button", { name: "프로젝트 메모 추가" }),
    ).not.toBeInTheDocument();

    const fileMemo = screen.getByRole("textbox", {
      name: "12화 · 균열의 밤 파일 메모 본문",
    });
    const fileReferenceId = fileMemo.getAttribute("aria-describedby");
    expect(fileReferenceId).toBeTruthy();
    expect(document.getElementById(fileReferenceId ?? "")).toHaveTextContent(
      "12화 · 균열의 밤",
    );

    await user.keyboard("{ArrowLeft}");
    await waitFor(() => expect(projectScope).toHaveFocus());
    expect(
      (
        screen.getByRole("textbox", {
          name: "프로젝트 메모 1 본문",
        }) as HTMLTextAreaElement
      ).value,
    ).toContain("계속 이어 쓰기");
  });

  it("adds and focuses a project memo and shares it with the file panel", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(openMemoScreen());
    await user.click(
      screen.getByRole("button", { name: "프로젝트 메모 추가" }),
    );
    const draft = screen.getByRole("textbox", {
      name: "프로젝트 메모 1 본문",
    });
    await waitFor(() => expect(draft).toHaveFocus());
    await user.type(draft, "새 프로젝트 메모");

    await user.click(
      screen.getByRole("tab", { name: "제17장 · 돌아오지 않는 밤" }),
    );
    await user.click(
      within(screen.getByRole("banner", { name: "파일 도구" })).getByRole(
        "button",
        { name: "메모" },
      ),
    );
    const panel = screen.getByRole("complementary", {
      name: "제17장 · 돌아오지 않는 밤 메모",
    });
    expect(
      within(panel).getByRole("textbox", { name: "프로젝트 메모 1 본문" }),
    ).toHaveValue("새 프로젝트 메모");
  });

  it("removes a newly added project memo when it loses focus empty", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(openMemoScreen());
    const before = screen.getAllByRole("textbox").length;
    await user.click(
      screen.getByRole("button", { name: "프로젝트 메모 추가" }),
    );
    expect(screen.getAllByRole("textbox")).toHaveLength(before + 1);
    await user.tab();
    await waitFor(() =>
      expect(screen.getAllByRole("textbox")).toHaveLength(before),
    );
  });

  it("queues the latest edit while one save request is in flight", async () => {
    const user = userEvent.setup();
    const resolvers: Array<() => void> = [];
    const saveMemo = vi.fn<(memo: MemoSaveInput) => Promise<void>>(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    render(
      <WorkspaceShell initialProjectId="glass-garden" saveMemo={saveMemo} />,
    );

    await user.click(openMemoScreen());
    const card = screen.getByRole("article", { name: "프로젝트 메모 1" });
    const input = within(card).getByRole("textbox");
    await user.type(input, " 첫 저장");
    expect(within(card).getByRole("status")).toHaveTextContent("저장 중…");
    await waitFor(() => expect(saveMemo).toHaveBeenCalledTimes(1), {
      timeout: 1_000,
    });

    await user.type(input, " 최신 내용");
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(saveMemo).toHaveBeenCalledTimes(1);
    expect(input).not.toBeDisabled();

    resolvers[0]?.();
    await waitFor(() => expect(saveMemo).toHaveBeenCalledTimes(2));
    expect(saveMemo.mock.calls[1]?.[0].body).toContain("최신 내용");
    resolvers[1]?.();
    await waitFor(() =>
      expect(within(card).getByRole("status")).toHaveTextContent("저장됨"),
    );
  });

  it("keeps failed input and retries the same latest memo", async () => {
    const user = userEvent.setup();
    const saveMemo = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    render(
      <WorkspaceShell initialProjectId="glass-garden" saveMemo={saveMemo} />,
    );

    await user.click(openMemoScreen());
    const card = screen.getByRole("article", { name: "프로젝트 메모 1" });
    const input = within(card).getByRole("textbox");
    await user.type(input, " 실패해도 유지");
    await waitFor(
      () =>
        expect(within(card).getByRole("status")).toHaveTextContent(
          "저장하지 못했습니다",
        ),
      { timeout: 1_500 },
    );
    expect((input as HTMLTextAreaElement).value).toContain("실패해도 유지");

    await user.click(within(card).getByRole("button", { name: "다시 시도" }));
    await waitFor(() =>
      expect(within(card).getByRole("status")).toHaveTextContent("저장됨"),
    );
    expect(saveMemo).toHaveBeenCalledTimes(2);
    expect(saveMemo.mock.calls[1]?.[0].body).toContain("실패해도 유지");
  });

  it("keeps a memo when deletion is disconnected and restores menu focus", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(openMemoScreen());
    const more = screen.getByRole("button", {
      name: "프로젝트 메모 1 더보기",
    });
    await user.click(more);
    await user.click(screen.getByRole("menuitem", { name: "삭제" }));
    const dialog = screen.getByRole("dialog", { name: "메모를 삭제할까요?" });
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: "취소" }),
      ).toHaveFocus(),
    );

    await user.click(within(dialog).getByRole("button", { name: "메모 삭제" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "백엔드 삭제 기능이 연결되지 않았습니다",
    );
    expect(
      screen.getByRole("article", { name: "프로젝트 메모 1" }),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "취소" }));
    await waitFor(() => expect(more).toHaveFocus());
  });

  it("removes a confirmed memo and focuses the next card", async () => {
    const user = userEvent.setup();
    const deleteMemo = vi.fn().mockResolvedValue(undefined);
    render(
      <WorkspaceShell
        deleteMemo={deleteMemo}
        initialProjectId="glass-garden"
      />,
    );

    await user.click(openMemoScreen());
    expect(screen.getAllByRole("article")).toHaveLength(3);
    await user.click(
      screen.getByRole("button", { name: "프로젝트 메모 1 더보기" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "메모 삭제" }));

    await waitFor(() => expect(deleteMemo).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));
    expect(deleteMemo).toHaveBeenCalledWith({
      fileId: undefined,
      id: "project-memory-direction",
      projectId: "glass-garden",
      scope: "project",
    });
    await waitFor(() =>
      expect(
        screen.getByRole("textbox", { name: "프로젝트 메모 1 본문" }),
      ).toHaveFocus(),
    );
  });

  it("retries a failed memo deletion without removing the card early", async () => {
    const user = userEvent.setup();
    const deleteMemo = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    render(
      <WorkspaceShell
        deleteMemo={deleteMemo}
        initialProjectId="glass-garden"
      />,
    );

    await user.click(openMemoScreen());
    await user.click(
      screen.getByRole("button", { name: "프로젝트 메모 1 더보기" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "메모 삭제" }));
    const dialog = screen.getByRole("dialog", { name: "메모를 삭제할까요?" });
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "메모를 삭제하지 못했습니다",
      ),
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);

    await user.click(within(dialog).getByRole("button", { name: "다시 시도" }));
    await waitFor(() => expect(screen.getAllByRole("article")).toHaveLength(2));
    expect(deleteMemo).toHaveBeenCalledTimes(2);
  });

  it("opens the source file from a file memo keyboard menu", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(openMemoScreen());
    await user.click(screen.getByRole("tab", { name: "파일 메모" }));
    const more = screen.getByRole("button", {
      name: "12화 · 균열의 밤 파일 메모 더보기",
    });
    more.focus();
    await user.keyboard("{ArrowDown}");
    const openFile = screen.getByRole("menuitem", { name: "파일로 이동" });
    await waitFor(() => expect(openFile).toHaveFocus());
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("tab", { name: "12화 · 균열의 밤" }),
    ).toHaveAttribute("aria-selected", "true");
  });
});
