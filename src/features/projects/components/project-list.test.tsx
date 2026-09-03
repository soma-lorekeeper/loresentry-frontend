import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProjectList } from "./project-list";

describe("ProjectList", () => {
  it("renders the global navigation and the new-project card first", () => {
    render(<ProjectList />);

    expect(screen.getByRole("link", { name: "프로젝트 목록" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const cards = screen.getByRole("region", {
      name: "프로젝트 목록",
    }).children;
    expect(cards[0]).toHaveTextContent("새 프로젝트");
    expect(cards[1]).toHaveTextContent("별빛 아래 마지막 약속");
  });

  it("keeps empty, loading, and error list states mutually exclusive", () => {
    const emptyView = render(
      <ProjectList initialListStatus="empty" initialProjects={[]} />,
    );
    expect(screen.getByText("아직 프로젝트가 없어요")).toBeVisible();
    expect(
      screen.queryByText("프로젝트를 불러오는 중입니다."),
    ).not.toBeInTheDocument();

    emptyView.unmount();
    const loadingView = render(<ProjectList initialListStatus="loading" />);
    expect(
      screen.getByText("프로젝트를 불러오는 중입니다."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("아직 프로젝트가 없어요"),
    ).not.toBeInTheDocument();

    loadingView.unmount();
    render(<ProjectList initialListStatus="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "프로젝트를 불러오지 못했어요.",
    );
    expect(
      screen.queryByText("프로젝트를 불러오는 중입니다."),
    ).not.toBeInTheDocument();
  });

  it("retries the backend query without inventing a successful result", async () => {
    const user = userEvent.setup();
    const loadProjects = vi
      .fn<() => Promise<never[]>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    render(<ProjectList loadProjects={loadProjects} />);

    expect(await screen.findByRole("alert")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("아직 프로젝트가 없어요")).toBeVisible();
    expect(loadProjects).toHaveBeenCalledTimes(2);
  });

  it("keeps the card action and more menu independent", async () => {
    const user = userEvent.setup();
    const onOpenProject = vi.fn();
    const onRenameRequest = vi.fn();
    render(
      <ProjectList
        onOpenProject={onOpenProject}
        onRenameRequest={onRenameRequest}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "별빛 아래 마지막 약속 — 장편 프로젝트 더 보기",
      }),
    );
    expect(onOpenProject).not.toHaveBeenCalled();
    await user.click(screen.getByRole("menuitem", { name: "이름 변경" }));
    expect(onRenameRequest).toHaveBeenCalledOnce();
    expect(onOpenProject).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", {
        name: /별빛 아래 마지막 약속 — 장편 프로젝트12분 전/,
      }),
    );
    expect(onOpenProject).toHaveBeenCalledWith("glass-garden");
    expect(screen.getByText("선택됨")).toBeVisible();
  });

  it("supports keyboard menu traversal and restores focus on Escape", async () => {
    const user = userEvent.setup();
    render(<ProjectList />);
    const trigger = screen.getByRole("button", {
      name: "별빛 아래 마지막 약속 — 장편 프로젝트 더 보기",
    });

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    const menu = screen.getByRole("menu", {
      name: "별빛 아래 마지막 약속 — 장편 프로젝트 메뉴",
    });
    await waitFor(() =>
      expect(
        within(menu).getByRole("menuitem", { name: "이름 변경" }),
      ).toHaveFocus(),
    );
    await user.keyboard("{ArrowDown}");
    expect(
      within(menu).getByRole("menuitem", { name: "휴지통으로 이동" }),
    ).toHaveFocus();
    fireEvent.keyDown(menu, { key: "Escape" });
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(trigger).toHaveFocus();
  });

  it("validates and trims a project title before backend creation", async () => {
    const user = userEvent.setup();
    const createProject = vi.fn().mockResolvedValue({ id: "new-project" });
    const onProjectCreated = vi.fn();
    render(
      <ProjectList
        createProject={createProject}
        onProjectCreated={onProjectCreated}
      />,
    );

    await user.click(screen.getByRole("button", { name: /새 프로젝트/ }));
    const input = screen.getByRole("textbox", { name: /프로젝트 제목/ });
    await user.click(screen.getByRole("button", { name: "프로젝트 만들기" }));
    expect(screen.getByText("프로젝트 제목을 입력해 주세요.")).toBeVisible();

    await user.type(input, "  새로운   이야기  ");
    await user.click(screen.getByRole("button", { name: "프로젝트 만들기" }));
    expect(createProject).toHaveBeenCalledWith({ title: "새로운   이야기" });
    await waitFor(() => expect(onProjectCreated).toHaveBeenCalledOnce());
    expect(onProjectCreated.mock.calls[0][0]).toMatchObject({
      id: "new-project",
      title: "새로운   이야기",
    });
    await waitFor(() =>
      expect(
        screen.getByRole("article", { name: "프로젝트 새로운 이야기" }),
      ).toBeVisible(),
    );
    expect(screen.getByText("선택됨")).toBeVisible();
  });

  it("keeps the create dialog and input on backend or invalid-id failure", async () => {
    const user = userEvent.setup();
    const createProject = vi.fn().mockResolvedValue({ id: "" });
    render(
      <ProjectList createProject={createProject} initialCreateState="ready" />,
    );

    await user.click(screen.getByRole("button", { name: "프로젝트 만들기" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "프로젝트를 만들지 못했어요.",
    );
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(screen.getByRole("textbox", { name: /프로젝트 제목/ })).toHaveValue(
      "유리 정원의 기록",
    );
  });

  it("shows duplicate-title feedback returned by the backend", async () => {
    const user = userEvent.setup();
    const duplicate = Object.assign(new Error("duplicate"), {
      code: "DUPLICATE_PROJECT_TITLE",
    });
    render(
      <ProjectList
        createProject={vi.fn().mockRejectedValue(duplicate)}
        initialCreateState="ready"
      />,
    );

    await user.click(screen.getByRole("button", { name: "프로젝트 만들기" }));
    expect(
      await screen.findByText("같은 제목의 프로젝트가 이미 있어요."),
    ).toBeVisible();
  });

  it("renames through the backend, updates the card, and restores menu focus", async () => {
    const user = userEvent.setup();
    const renameProject = vi.fn().mockResolvedValue(undefined);
    render(<ProjectList renameProject={renameProject} />);
    const more = screen.getByRole("button", {
      name: "별빛 아래 마지막 약속 — 장편 프로젝트 더 보기",
    });

    await user.click(more);
    await user.click(screen.getByRole("menuitem", { name: "이름 변경" }));
    const input = screen.getByRole("textbox", { name: /프로젝트 제목/ });
    expect(
      screen.getByRole("button", { name: "변경사항 저장" }),
    ).toBeDisabled();
    await user.clear(input);
    await user.type(input, "  새 프로젝트 이름  ");
    await user.click(screen.getByRole("button", { name: "변경사항 저장" }));

    expect(renameProject).toHaveBeenCalledWith(
      "glass-garden",
      "새 프로젝트 이름",
    );
    expect(
      await screen.findByText("프로젝트 이름을 변경했어요."),
    ).toBeVisible();
    expect(
      screen.getByRole("article", { name: "프로젝트 새 프로젝트 이름" }),
    ).toBeVisible();
    await waitFor(() => expect(more).toHaveFocus());
  });

  it("preserves the rename draft and dialog after a backend failure", async () => {
    const user = userEvent.setup();
    render(
      <ProjectList
        initialRenameState="ready"
        renameProject={vi.fn().mockRejectedValue(new Error("offline"))}
      />,
    );

    await user.click(screen.getByRole("button", { name: "변경사항 저장" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "프로젝트 이름을 변경하지 못했어요.",
    );
    expect(screen.getByRole("textbox", { name: /프로젝트 제목/ })).toHaveValue(
      "별빛 아래 마지막 약속 — 장편 프로젝트 개정판",
    );
    expect(screen.getByRole("dialog")).toBeVisible();
  });
});
